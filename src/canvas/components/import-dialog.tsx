"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReactFlow, type XYPosition } from "@xyflow/react";
import { Search, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { smartParse } from "../parse-curl";
import { parseHar } from "../../utils/har";
import { parseOpenApi, type OpenApiEndpoint } from "../parse-openapi";
import { discoverSpec } from "../discover-spec";
import { emptySnapshot, useCanvasStore } from "../use-canvas-store";
import { useEnvironmentStore } from "../../stores/use-environment-store";
import { gridPositions } from "../layout";
import { MethodPill } from "./method-pill";
import type { CardRequestSnapshot, CollectionNodeData } from "../types";

interface Candidate {
  name: string;
  snapshot: CardRequestSnapshot;
  tag?: string | null;
}

// Adding hundreds of nodes at once freezes React Flow — cap a single import so
// large specs are brought in a resource-group (tag) at a time.
const MAX_ADD = 80;
const MAX_ROWS = 150;

const pathOf = (url: string): string => {
  try {
    const u = new URL(url.replace(/\{\{([^}]+)\}\}/g, "_$1_"));
    return u.pathname;
  } catch {
    return url;
  }
};

const endpointToCandidate = (ep: OpenApiEndpoint): Candidate => ({
  name: ep.name,
  tag: ep.tag,
  snapshot: emptySnapshot({
    method: ep.method,
    url: ep.url,
    urlRaw: ep.url,
    headers: ep.headers,
    body: ep.body,
    bodyType: ep.bodyType,
    authType: ep.authType,
    authConfig: ep.authConfig,
  }),
});

/**
 * Detect and parse pasted content into request candidates:
 * OpenAPI (JSON/YAML) → endpoints; HAR → captured requests; otherwise split
 * into blocks and `smartParse` each (cURL / copy-as-fetch / "GET url" lines).
 */
interface Parsed {
  candidates: Candidate[];
  servers: string[];
}

const parseInput = (raw: string): Parsed => {
  const text = raw.trim();
  if (!text) return { candidates: [], servers: [] };

  const openapi = parseOpenApi(text);
  if (openapi) {
    return {
      candidates: openapi.endpoints.map(endpointToCandidate),
      servers: openapi.servers,
    };
  }

  // HAR?
  if (text.startsWith("{")) {
    try {
      const har = parseHar(text);
      if (har.length > 0) {
        const methods = new Set([
          "GET",
          "POST",
          "PUT",
          "PATCH",
          "DELETE",
          "HEAD",
          "OPTIONS",
        ]);
        return {
          servers: [],
          candidates: har
            .filter((c) => methods.has(c.method.toUpperCase()))
            .map((c) => ({
              name: pathOf(c.url),
              snapshot: emptySnapshot({
                method: c.method.toUpperCase() as CardRequestSnapshot["method"],
                url: c.url,
                urlRaw: c.url,
                headers: c.requestHeaders ?? {},
                body: c.requestBody || null,
                bodyType: c.requestBody ? "raw" : "none",
              }),
            })),
        };
      }
    } catch {
      /* fall through */
    }
  }

  // Split on blank lines / lines starting a new curl|fetch|METHOD block.
  const blocks: string[] = [];
  let cur: string[] = [];
  const starts = /^(curl\s|fetch\(|(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\S|https?:\/\/)/;
  for (const line of text.split("\n")) {
    if (cur.length > 0 && (line.trim() === "" || starts.test(line.trim()))) {
      if (cur.join("\n").trim()) blocks.push(cur.join("\n"));
      cur = line.trim() === "" ? [] : [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.join("\n").trim()) blocks.push(cur.join("\n"));

  const out: Candidate[] = [];
  for (const block of blocks) {
    const parsed = smartParse(block);
    if (!parsed) continue;
    out.push({
      name: pathOf(parsed.url),
      snapshot: emptySnapshot({
        method: parsed.method,
        url: parsed.url,
        urlRaw: parsed.url,
        headers: parsed.headers,
        body: parsed.body || null,
        bodyType: parsed.bodyType,
        authType: parsed.authType,
        authConfig: { ...parsed.authConfig },
      }),
    });
  }
  return { candidates: out, servers: [] };
};

interface ImportDialogProps {
  onClose: () => void;
}

export const ImportDialog = ({ onClose }: ImportDialogProps) => {
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Close only via the ✕ or Escape — never on a backdrop misclick, which loses
  // a fetched spec + selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [raw, setRaw] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetched, setFetched] = useState<Parsed | null>(null);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [server, setServer] = useState("");
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  // Destination for the batch. null = follow the smart default (a whole spec
  // lands on its own canvas; a few loose requests merge into the current one).
  const [dest, setDest] = useState<null | "new" | "current">(null);

  const parsed = useMemo(() => parseInput(raw), [raw]);
  const source = fetched ?? parsed;
  const candidates = source.candidates;
  const servers = source.servers;
  const chosenServer = server || servers[0] || "";

  const trimmed = raw.trim();
  const isSpecUrl =
    /^https?:\/\/\S+$/i.test(trimmed) && !trimmed.includes("\n");

  // A fetched URL or a doc that declares servers is a whole API → default to a
  // fresh canvas; ad-hoc pasted requests default to the current board.
  const isSpec = Boolean(fetched) || servers.length > 0;
  const effectiveDest: "new" | "current" = dest ?? (isSpec ? "new" : "current");
  const hostName = (() => {
    try {
      return new URL(chosenServer || trimmed).host;
    } catch {
      return "imported";
    }
  })();

  const tags = useMemo(() => {
    const t = new Set<string>();
    for (const c of candidates) if (c.tag) t.add(c.tag);
    return [...t].sort();
  }, [candidates]);

  // Seed the initial selection whenever a new candidate set appears (paste or
  // fetch): a big tagged spec opens on its first resource group fully selected
  // (never a wall of greyed rows with Add disabled); a big untagged spec opens
  // with nothing selected so the user narrows; a small spec selects all.
  const seededRef = useRef<string>("");
  useEffect(() => {
    if (!candidates.length) {
      seededRef.current = "";
      return;
    }
    const key = `${fetched ? "f" : "p"}:${candidates.length}:${tags.join(",")}`;
    if (key === seededRef.current) return;
    seededRef.current = key;
    if (candidates.length > 40 && tags.length > 0) {
      setTag(tags[0]);
      setExcluded(new Set());
    } else if (candidates.length > 40) {
      setTag(null);
      setExcluded(new Set(candidates.map((_, i) => i)));
    } else {
      setTag(null);
      setExcluded(new Set());
    }
  }, [candidates, tags, fetched]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      candidates
        .map((c, i) => ({ c, i }))
        .filter(
          ({ c }) =>
            (!tag || c.tag === tag) &&
            (!q ||
              c.snapshot.urlRaw.toLowerCase().includes(q) ||
              c.name.toLowerCase().includes(q) ||
              c.snapshot.method.toLowerCase().includes(q))
        ),
    [candidates, tag, q]
  );
  const picks = filtered.filter(({ i }) => !excluded.has(i));

  const resetInput = (value: string) => {
    setRaw(value);
    setFetched(null);
    setExcluded(new Set());
    setFetchError(null);
    setSearch("");
    setTag(null);
    setServer("");
    setDest(null);
  };

  const fetchSpec = async () => {
    setFetching(true);
    setFetchError(null);
    const tok = authHeader.trim();
    const auth = tok
      ? /^(bearer|basic|apikey)\s/i.test(tok)
        ? tok
        : `Bearer ${tok}`
      : undefined;
    const result = await discoverSpec(trimmed, auth);
    setFetching(false);
    if ("error" in result) {
      setFetchError(result.error);
      return;
    }
    setSearch("");
    // Default the base to the server matching the fetched host, else the last
    // declared server (production is usually listed after local dev).
    let host = "";
    try {
      host = new URL(trimmed).host;
    } catch {
      /* not a URL host */
    }
    const preferred =
      result.servers.find((s) => {
        try {
          return new URL(s).host === host;
        } catch {
          return false;
        }
      }) ??
      result.servers[result.servers.length - 1] ??
      "";
    setServer(preferred);
    // Initial selection (first-tag for big specs) is handled centrally by the
    // effect below, so paste and fetch behave identically.
    setFetched({
      candidates: result.endpoints.map(endpointToCandidate),
      servers: result.servers,
    });
  };

  const setFilteredExcluded = (exclude: boolean) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      for (const { i } of filtered) exclude ? next.add(i) : next.delete(i);
      return next;
    });

  // Ensure a `{{base}}` environment exists for the chosen server and return its
  // id — WITHOUT switching the global active env. The id is pinned to the
  // destination origin instead, so importing one API never re-bases another.
  const ensureBaseEnv = (base: string): string | null => {
    if (!base) return null;
    const es = useEnvironmentStore.getState();
    const existing = es.environments.find((e) => e.variables.base === base);
    if (existing) return existing.id;
    let name = "imported";
    try {
      name = new URL(base).host;
    } catch {
      /* keep default */
    }
    es.addEnvironment({ name, variables: { base } });
    return (
      useEnvironmentStore
        .getState()
        .environments.find((e) => e.variables.base === base)?.id ?? null
    );
  };

  // Drop the batch below existing content instead of on top of it.
  const importAnchor = (): XYPosition => {
    const cs = useCanvasStore.getState();
    const nodes = cs.graphs[cs.activeGraphId]?.nodes ?? [];
    if (!nodes.length) {
      return screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    }
    let minX = Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.position.x);
      maxY = Math.max(maxY, n.position.y + (n.measured?.height ?? 120));
    }
    return { x: minX, y: maxY + 140 };
  };

  const fanOut = () => {
    if (!picks.length || picks.length > MAX_ADD) return;
    const cs = useCanvasStore.getState();
    const envId = chosenServer ? ensureBaseEnv(chosenServer) : null;

    if (effectiveDest === "new") cs.createGraph(hostName || "imported");

    const positions = gridPositions(picks.length, importAnchor());
    cs.addRequestNodes(
      picks.map(({ c }, i) => ({
        position: positions[i],
        snapshot: c.snapshot,
        name: c.name,
      }))
    );

    // Pin the API's env (and its default auth) to the destination origin, so
    // {{base}} resolves for this tree without touching the global active env.
    const after = useCanvasStore.getState();
    const g = after.graphs[after.activeGraphId];
    const origin = g?.nodes.find((n) => n.type === "collection");
    if (origin) {
      const patch: Partial<CollectionNodeData> = {};
      if (envId) patch.environmentId = envId;
      const auth = picks.find(
        ({ c }) => c.snapshot.authType && c.snapshot.authType !== "none"
      )?.c.snapshot;
      if (auth) {
        patch.authType = auth.authType;
        patch.authConfig = { ...auth.authConfig };
      }
      if (Object.keys(patch).length) cs.updateNodeData(origin.id, patch);
    }

    // A new canvas is framed by the graph-change effect; a merge into the
    // current board isn't, so bring the fresh nodes into view here.
    if (effectiveDest === "current") {
      setTimeout(
        () =>
          void fitView({
            padding: 0.2,
            minZoom: 0.6,
            maxZoom: 1,
            duration: 300,
          }),
        60
      );
    }
    onClose();
  };

  const tooMany = picks.length > MAX_ADD;
  const input =
    "rounded-md border border-border/50 bg-bg px-2.5 py-1.5 text-[12px] text-primary outline-none focus:border-accent/60 placeholder:text-muted/70";

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg/60 backdrop-blur-[2px]">
      <div className="flex max-h-[82vh] w-[560px] max-w-[calc(100vw-32px)] flex-col rounded-xl border border-border/60 bg-bg-secondary/95 font-sans shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)] backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-border/40 px-3 py-2.5">
          <span className="text-[12px] text-muted">
            import — curl · fetch · HAR · OpenAPI (JSON/YAML) · Swagger URL
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted hover:text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <textarea
          rows={Math.min(Math.max(raw.split("\n").length, 2), 10)}
          className="m-3 shrink-0 resize-none rounded-md border border-border/50 bg-bg px-2.5 py-2 font-mono text-[13px] outline-none focus:border-accent/60 placeholder:text-muted/70"
          placeholder="paste curl · fetch · HAR · OpenAPI (JSON/YAML) — or a Swagger/spec URL to fetch"
          value={raw}
          onChange={(e) => resetInput(e.target.value)}
          autoFocus
          spellCheck={false}
        />

        {isSpecUrl && !fetched && (
          <div className="space-y-1.5 px-3 pb-1">
            <input
              type="text"
              value={authHeader}
              onChange={(e) => setAuthHeader(e.target.value)}
              placeholder="Authorization for a protected spec (optional) — e.g. Bearer <token> or Basic <…>"
              className={cn(input, "w-full font-mono")}
              spellCheck={false}
            />
            <button
              type="button"
              onClick={fetchSpec}
              disabled={fetching}
              className="w-full rounded-md border border-border/50 bg-bg px-3 py-2 text-[13px] font-semibold text-primary transition-colors hover:border-accent/60 disabled:opacity-60"
            >
              {fetching ? "Fetching…" : "Fetch spec from URL"}
            </button>
            {fetchError && <p className="text-[12px] text-danger">{fetchError}</p>}
          </div>
        )}

        {candidates.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="filter by path or name…"
                  className={cn(input, "w-full pl-7")}
                  spellCheck={false}
                />
              </div>
              <button
                type="button"
                onClick={() => setFilteredExcluded(false)}
                className="rounded-md border border-border/50 px-2 py-1 text-[12px] text-secondary hover:text-primary"
              >
                all
              </button>
              <button
                type="button"
                onClick={() => setFilteredExcluded(true)}
                className="rounded-md border border-border/50 px-2 py-1 text-[12px] text-secondary hover:text-primary"
              >
                none
              </button>
            </div>

            {servers.length > 0 && (
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5 px-3 text-[11px]">
                <span className="text-muted">base</span>
                {servers.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setServer(s)}
                    title={s}
                    className={cn(
                      "max-w-[240px] truncate rounded-full border px-2 py-0.5 font-mono transition-colors",
                      s === chosenServer
                        ? "border-accent/60 bg-accent/10 text-accent"
                        : "border-border/50 text-muted hover:text-secondary"
                    )}
                  >
                    {s.replace(/^https?:\/\//, "")}
                  </button>
                ))}
                <span className="text-muted">→ {"{{base}}"}</span>
              </div>
            )}

            {tags.length > 0 && (
              <div className="mb-1 flex max-h-[64px] flex-wrap gap-1 overflow-y-auto px-3">
                <button
                  type="button"
                  onClick={() => setTag(null)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                    tag === null
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-border/50 text-muted hover:text-secondary"
                  )}
                >
                  all
                </button>
                {tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t === tag ? null : t)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                      t === tag
                        ? "border-accent/60 bg-accent/10 text-accent"
                        : "border-border/50 text-muted hover:text-secondary"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
              {filtered.slice(0, MAX_ROWS).map(({ c, i }) => {
                const off = excluded.has(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setExcluded((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md border px-2 py-1 text-left transition-colors",
                      off
                        ? "border-border/30 opacity-40"
                        : "border-border/50 hover:border-accent/50"
                    )}
                  >
                    <MethodPill method={c.snapshot.method} className="text-[12px]" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-primary">
                      {pathOf(c.snapshot.urlRaw)}
                    </span>
                    <span className="max-w-[140px] shrink-0 truncate text-[12px] text-muted">
                      {c.tag || c.name}
                    </span>
                  </button>
                );
              })}
              {filtered.length > MAX_ROWS && (
                <p className="py-1 text-center text-[12px] text-muted">
                  +{filtered.length - MAX_ROWS} more — filter or pick a tag to
                  narrow
                </p>
              )}
            </div>
          </>
        )}

        {candidates.length > 0 && (
        <div className="mt-2 flex items-center justify-between border-t border-border/40 px-3 py-2.5">
          <span className="text-[12px] text-muted">
            {`${picks.length} selected of ${filtered.length} shown`}
          </span>
          <div className="flex items-center gap-2">
            {candidates.length > 0 && (
              <div className="flex overflow-hidden rounded-md border border-border/50 text-[11px]">
                {(["new", "current"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDest(d)}
                    title={
                      d === "new"
                        ? "Add on a fresh canvas named after the API"
                        : "Add to the canvas you're on now"
                    }
                    className={cn(
                      "px-2 py-1 transition-colors",
                      effectiveDest === d
                        ? "bg-accent/15 text-accent"
                        : "text-muted hover:text-secondary"
                    )}
                  >
                    {d === "new" ? "new canvas" : "this canvas"}
                  </button>
                ))}
              </div>
            )}
            {tooMany && (
              <span className="text-[12px] text-warning">
                narrow to ≤{MAX_ADD}
              </span>
            )}
            <button
              type="button"
              onClick={fanOut}
              disabled={picks.length === 0 || tooMany}
              className={cn(
                "rounded-md px-3 py-1 text-[13px] font-semibold transition-colors",
                picks.length > 0 && !tooMany
                  ? "bg-accent text-accent-text hover:bg-accent-hover"
                  : "bg-bg text-muted cursor-not-allowed"
              )}
            >
              add {picks.length || ""} node{picks.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
