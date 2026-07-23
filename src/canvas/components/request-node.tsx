"use client";

import { memo, useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Play,
  Square,
  ChevronDown,
  ChevronRight,
  Trash2,
  Bookmark,
  Check,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { methodPillColor } from "./method-pill";
import { JsonView } from "./json-view";
import { extractHost, hostAccent } from "../host";
import { replaceVariables } from "../../utils/variables";
import { useEnvironmentStore } from "../../stores/use-environment-store";
import { formatSize } from "../format";
import { cn } from "../../utils/cn";
import type { HttpMethod } from "../../utils/http";
import type { AuthType, BodyType } from "../types";
import type { RequestNode as RequestNodeType, RequestNodeData } from "../types";
import { useCanvasStore } from "../use-canvas-store";
import { useRunStore, idleRun, abortNode } from "../use-run-store";
import { useCollectionsStore } from "../use-collections-store";
import { runNode, runChain } from "../engine";

const METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

/** Text color half of the method pill classes (drop the bg utility). */
const methodTextColor: Record<HttpMethod, string> = Object.fromEntries(
  Object.entries(methodPillColor).map(([m, cls]) => [
    m,
    cls
      .split(" ")
      .filter((c) => !c.startsWith("bg-"))
      .join(" "),
  ])
) as Record<HttpMethod, string>;

const headersToText = (h: Record<string, string>): string =>
  Object.entries(h)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

const textToHeaders = (text: string): Record<string, string> => {
  const out: Record<string, string> = {};
  text.split("\n").forEach((line) => {
    const idx = line.indexOf(":");
    if (idx <= 0) return;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k) out[k] = v;
  });
  return out;
};

const stringifyResponse = (data: unknown): string => {
  if (data instanceof ArrayBuffer) return "(binary)";
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

const statusStripClasses = (status: number): string => {
  if (status >= 200 && status < 300) return "bg-success/[0.07] text-success";
  if (status >= 300 && status < 400) return "bg-accent/[0.07] text-accent";
  if (status >= 400 && status < 500) return "bg-warning/[0.07] text-warning";
  return "bg-danger/[0.07] text-danger";
};

/** Render a URL as typography: origin dimmed, path bright, `{{vars}}` in
 *  accent. Falls back gracefully for partial URLs. */
const UrlText = ({ url }: { url: string }) => {
  const parts = useMemo(() => {
    const m = url.match(/^(https?:\/\/[^/?#]+)(.*)$/);
    const origin = m ? m[1] : "";
    const rest = m ? m[2] : url;
    const segs = (rest || "/").split(/(\{\{\w+\}\})/g).filter(Boolean);
    return { origin, segs };
  }, [url]);

  return (
    <span className="truncate">
      {parts.origin && (
        <span className="text-muted/80">
          {parts.origin.replace(/^https?:\/\//, "")}
        </span>
      )}
      {parts.segs.map((s, i) =>
        /^\{\{\w+\}\}$/.test(s) ? (
          <span key={i} className="text-accent">
            {s}
          </span>
        ) : (
          <span key={i} className="text-primary">
            {s}
          </span>
        )
      )}
    </span>
  );
};

type Section = "headers" | "body" | "auth" | null;

/** Walk upstream from a node to the flow origin it belongs to (if any)
 *  and return the requested field of that origin's data. */
const findOriginField = (
  nodes: { id: string; type?: string; data: Record<string, unknown> }[],
  edges: { source: string; target: string }[],
  nodeId: string,
  field: "collectionId" | "environmentId"
): string | null => {
  const visited = new Set<string>([nodeId]);
  const queue = [nodeId];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const e of edges) {
      if (e.target !== cur) continue;
      const src = nodes.find((n) => n.id === e.source);
      if (!src || visited.has(src.id)) continue;
      if (src.type === "collection") {
        return (src.data[field] as string) ?? null;
      }
      if (src.type === "request") {
        visited.add(src.id);
        queue.push(src.id);
      }
    }
  }
  return null;
};

export const RequestNodeCard = memo(
  ({ id, data, selected }: NodeProps<RequestNodeType>) => {
    const { name, snapshot, collapsed } = data as RequestNodeData;
    const run = useRunStore((s) => s.runs[id]) ?? idleRun;
    const updateSnapshot = useCanvasStore((s) => s.updateSnapshot);
    const updateNodeData = useCanvasStore((s) => s.updateNodeData);
    const removeNode = useCanvasStore((s) => s.removeNode);
    const addLinkedRequest = useCanvasStore((s) => s.addLinkedRequest);
    const addAssertNode = useCanvasStore((s) => s.addAssertNode);

    // Which flow origin does this request trace back to? Shown as a
    // membership badge in the eyebrow.
    const originCollectionId = useCanvasStore((s) => {
      const g = s.graphs[s.activeGraphId];
      if (!g) return null;
      return findOriginField(g.nodes, g.edges, id, "collectionId");
    });
    const originName = useCollectionsStore((s) =>
      originCollectionId
        ? s.collections.find((c) => c.id === originCollectionId)?.name ?? null
        : null
    );

    // Env vars the tree runs under (origin env over active env) — used to
    // resolve {{vars}} in the URL for display, so a request whose host
    // lives in a variable still gets its identity band.
    const originEnvironmentId = useCanvasStore((s) => {
      const g = s.graphs[s.activeGraphId];
      if (!g) return null;
      return findOriginField(g.nodes, g.edges, id, "environmentId");
    });
    const displayVars = useEnvironmentStore((s) => {
      const active =
        s.environments.find((e) => e.id === s.activeEnvironmentId)
          ?.variables ?? {};
      const origin = originEnvironmentId
        ? s.environments.find((e) => e.id === originEnvironmentId)?.variables
        : undefined;
      return JSON.stringify({ ...active, ...(origin ?? {}) });
    });

    const [openSection, setOpenSection] = useState<Section>(null);
    const [editingUrl, setEditingUrl] = useState(!snapshot.urlRaw);
    const [saveOpen, setSaveOpen] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const collections = useCollectionsStore((s) => s.collections);
    const saveRequest = useCollectionsStore((s) => s.saveRequest);
    const createCollection = useCollectionsStore((s) => s.createCollection);

    const saveTo = (collectionId: string) => {
      saveRequest(collectionId, name || snapshot.urlRaw, snapshot);
      setSaveOpen(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    };

    // Resolve {{vars}} before extracting the host so var-based URLs
    // ({{base}}/todos/1) keep their hue and eyebrow identity.
    const host = useMemo(() => {
      const raw = snapshot.urlRaw || snapshot.url;
      if (!raw) return "";
      return extractHost(replaceVariables(raw, JSON.parse(displayVars)));
    }, [snapshot.urlRaw, snapshot.url, displayVars]);
    const accent = useMemo(() => hostAccent(host), [host]);
    const pending = run.status === "pending";
    const hasHost = host !== "(invalid url)" && host.length > 0;
    // Unresolvable var-URLs show their leading token ({{base}}…) rather
    // than pretending the request is new.
    const eyebrowFallback = snapshot.urlRaw
      ? snapshot.urlRaw.split("/")[0] || "new request"
      : "new request";

    const cycleMethod = () => {
      const next =
        METHODS[(METHODS.indexOf(snapshot.method) + 1) % METHODS.length];
      updateSnapshot(id, { method: next });
    };

    const responseText = useMemo(
      () => (run.response ? stringifyResponse(run.response.data) : ""),
      [run.response]
    );

    const toggleSection = (s: Section) =>
      setOpenSection((cur) => (cur === s ? null : s));

    const headerCount = Object.keys(snapshot.headers).length;

    /** Add the next request in the chain, wired from this one. */
    const branch = () => {
      const s = useCanvasStore.getState();
      const g = s.graphs[s.activeGraphId];
      const self = g?.nodes.find((n) => n.id === id);
      if (!self || !g) return;
      const outgoing = g.edges.filter((e) => e.source === id).length;
      addLinkedRequest(id, {
        x: self.position.x + 420,
        y: self.position.y + outgoing * 150,
      });
    };

    /** Hang an assert node off this request's response. */
    const assert = () => {
      const s = useCanvasStore.getState();
      const g = s.graphs[s.activeGraphId];
      const self = g?.nodes.find((n) => n.id === id);
      if (!self || !g) return;
      const outgoing = g.edges.filter((e) => e.source === id).length;
      addAssertNode(id, {
        x: self.position.x + 420,
        y: self.position.y + outgoing * 150,
      });
    };

    const metaChip = (
      section: Exclude<Section, null>,
      label: string,
      set: boolean
    ) => (
      <button
        key={section}
        type="button"
        onClick={() => toggleSection(section)}
        className={cn(
          "nodrag text-[10px] tracking-wide transition-colors",
          openSection === section
            ? "text-accent"
            : set
            ? "text-secondary hover:text-primary"
            : "text-muted/60 hover:text-secondary"
        )}
      >
        {label}
      </button>
    );

    return (
      <div
        className={cn(
          "group relative w-[360px] overflow-visible rounded-xl border bg-bg-secondary/95 font-sans shadow-[0_10px_28px_-14px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-[border-color,box-shadow]",
          selected
            ? "border-accent/60 shadow-[0_10px_32px_-12px_rgba(0,0,0,0.55)]"
            : "border-border/60 hover:border-border"
        )}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="justapi-handle"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="justapi-handle"
          style={hasHost ? { borderColor: accent.stripe } : undefined}
        />

        {/* branch: add the next request in the chain. Anchored at the
            bottom-right corner, OFF the horizontal centerline — wires and
            their bind labels travel along the center, and the button used
            to sit exactly where labels land when nodes are close. */}
        <button
          type="button"
          onClick={branch}
          className="nodrag absolute -right-9 bottom-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-bg-secondary/95 text-secondary opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:border-accent hover:text-accent group-hover:opacity-100"
          title="Add next request — branches from this one"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={assert}
          className="nodrag absolute -right-9 bottom-9 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-bg-secondary/95 text-secondary opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:border-warning hover:text-warning group-hover:opacity-100"
          title="Assert on this response — adds graded checks"
        >
          <ShieldCheck className="h-3 w-3" />
        </button>

        {/* eyebrow: host identity band */}
        <div
          className="flex items-center gap-1.5 rounded-t-[11px] px-3 py-1.5"
          style={{ background: hasHost ? accent.strip : undefined }}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              pending && "animate-pulse"
            )}
            style={{
              background: hasHost ? accent.stripe : "rgb(var(--text-muted))",
            }}
          />
          <span
            className="truncate text-[9px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: hasHost ? accent.stripe : undefined }}
          >
            {hasHost ? host : eyebrowFallback}
          </span>
          <div className="flex-1" />
          {originName && (
            <span
              className="flex max-w-[90px] shrink-0 items-center gap-1 rounded bg-accent/10 px-1 py-px text-[8px] font-semibold uppercase tracking-[0.1em] text-accent"
              title={`Part of the "${originName}" flow`}
            >
              <Bookmark className="h-2 w-2 shrink-0" />
              <span className="truncate">{originName}</span>
            </span>
          )}
          <input
            className="nodrag w-28 bg-transparent text-right text-[9px] uppercase tracking-[0.12em] text-secondary/80 outline-none placeholder:text-muted/40"
            placeholder="name"
            value={name}
            onChange={(e) => updateNodeData(id, { name: e.target.value })}
            spellCheck={false}
          />
        </div>

        {/* request line */}
        <div className="flex items-center gap-2 px-3 pb-1 pt-1.5">
          <button
            type="button"
            onClick={cycleMethod}
            className={cn(
              "nodrag shrink-0 font-mono text-[12px] font-bold tracking-wide",
              methodTextColor[snapshot.method]
            )}
            title="Click to cycle method"
          >
            {snapshot.method}
          </button>

          {editingUrl ? (
            <input
              className="nodrag min-w-0 flex-1 bg-transparent font-mono text-[12px] text-primary outline-none placeholder:text-muted/50"
              placeholder="https://api.example.com/{{path}}"
              value={snapshot.urlRaw}
              onChange={(e) =>
                updateSnapshot(id, {
                  urlRaw: e.target.value,
                  url: e.target.value,
                })
              }
              onBlur={() => snapshot.urlRaw && setEditingUrl(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  setEditingUrl(false);
                  void runNode(id);
                } else if (e.key === "Enter" || e.key === "Escape") {
                  if (snapshot.urlRaw) setEditingUrl(false);
                }
              }}
              autoFocus
              spellCheck={false}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingUrl(true)}
              className="nodrag flex min-w-0 flex-1 items-center text-left font-mono text-[12px]"
              title="Click to edit URL"
            >
              <UrlText url={snapshot.urlRaw} />
            </button>
          )}

          {pending ? (
            <button
              type="button"
              onClick={() => abortNode(id)}
              className="nodrag flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-danger/40 text-danger transition-colors hover:bg-danger/10"
              title="Cancel"
            >
              <Square className="h-2.5 w-2.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void runNode(id)}
              onDoubleClick={() => void runChain(id)}
              className="nodrag flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/60 text-secondary transition-colors hover:border-accent hover:bg-accent hover:text-accent-text"
              title="Run (double-click: re-run whole chain)"
            >
              <Play className="ml-px h-3 w-3" />
            </button>
          )}
        </div>

        {/* meta line */}
        <div className="flex items-center gap-3 px-3 pb-2">
          {metaChip(
            "headers",
            headerCount > 0 ? `headers·${headerCount}` : "headers",
            headerCount > 0
          )}
          {metaChip(
            "body",
            snapshot.bodyType !== "none" ? `body·${snapshot.bodyType}` : "body",
            snapshot.bodyType !== "none"
          )}
          {metaChip(
            "auth",
            snapshot.authType !== "none" ? `auth·${snapshot.authType}` : "auth",
            snapshot.authType !== "none"
          )}
          <div className="flex-1" />
          <div className="relative flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => setSaveOpen((o) => !o)}
              className={cn(
                "nodrag rounded p-0.5",
                savedFlash
                  ? "text-success"
                  : saveOpen
                  ? "text-accent"
                  : "text-muted/70 hover:text-accent"
              )}
              title="Save to collection"
            >
              {savedFlash ? (
                <Check className="h-3 w-3" />
              ) : (
                <Bookmark className="h-3 w-3" />
              )}
            </button>
            <button
              type="button"
              onClick={() => removeNode(id)}
              className="nodrag rounded p-0.5 text-muted/70 hover:text-danger"
              title="Delete node"
            >
              <Trash2 className="h-3 w-3" />
            </button>
            {saveOpen && (
              <div className="nodrag absolute right-0 top-full z-20 mt-1.5 w-44 rounded-lg border border-border/60 bg-bg-secondary/95 py-1 font-sans shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5)] backdrop-blur-sm">
                <div className="px-2 pb-1 pt-0.5 text-[9px] uppercase tracking-[0.14em] text-muted">
                  save to
                </div>
                {collections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => saveTo(c.id)}
                    className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-[11px] text-secondary hover:bg-bg/60 hover:text-primary"
                  >
                    <Bookmark className="h-3 w-3 shrink-0 text-muted/60" />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const cname = window.prompt("New collection name");
                    if (cname?.trim()) saveTo(createCollection(cname.trim()));
                  }}
                  className={cn(
                    "flex w-full items-center gap-1.5 px-2 py-1 text-left text-[11px] text-accent hover:bg-accent/10",
                    collections.length > 0 &&
                      "mt-1 border-t border-border/40 pt-1.5"
                  )}
                >
                  + new collection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* editors */}
        {openSection === "headers" && (
          <div className="border-t border-border/40 px-3 py-2">
            <textarea
              className="nodrag nowheel h-16 w-full resize-none font-mono rounded-md border border-border/50 bg-bg px-2 py-1.5 text-[11px] outline-none placeholder:text-muted/50 focus:border-accent/60"
              placeholder={"Content-Type: application/json\nX-Api-Key: {{key}}"}
              defaultValue={headersToText(snapshot.headers)}
              onBlur={(e) =>
                updateSnapshot(id, { headers: textToHeaders(e.target.value) })
              }
              spellCheck={false}
            />
          </div>
        )}
        {openSection === "body" && (
          <div className="space-y-1.5 border-t border-border/40 px-3 py-2">
            <div className="flex gap-3">
              {(["none", "json", "raw"] as BodyType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateSnapshot(id, { bodyType: t })}
                  className={cn(
                    "nodrag text-[10px] tracking-wide",
                    snapshot.bodyType === t
                      ? "text-accent"
                      : "text-muted/60 hover:text-secondary"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            {snapshot.bodyType !== "none" && (
              <textarea
                className="nodrag nowheel h-24 w-full resize-none font-mono rounded-md border border-border/50 bg-bg px-2 py-1.5 text-[11px] outline-none placeholder:text-muted/50 focus:border-accent/60"
                placeholder={
                  snapshot.bodyType === "json" ? '{ "id": "{{id}}" }' : "raw body"
                }
                defaultValue={snapshot.body ?? ""}
                onBlur={(e) => updateSnapshot(id, { body: e.target.value })}
                spellCheck={false}
              />
            )}
          </div>
        )}
        {openSection === "auth" && (
          <div className="space-y-1.5 border-t border-border/40 px-3 py-2">
            <div className="flex gap-3">
              {(["none", "bearer", "basic", "api-key"] as AuthType[]).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateSnapshot(id, { authType: t })}
                    className={cn(
                      "nodrag text-[10px] tracking-wide",
                      snapshot.authType === t
                        ? "text-accent"
                        : "text-muted/60 hover:text-secondary"
                    )}
                  >
                    {t}
                  </button>
                )
              )}
            </div>
            {snapshot.authType === "bearer" && (
              <input
                className="nodrag w-full font-mono rounded-md border border-border/50 bg-bg px-2 py-1 text-[11px] outline-none placeholder:text-muted/50 focus:border-accent/60"
                placeholder="token or {{token}}"
                defaultValue={snapshot.authConfig.bearerToken ?? ""}
                onBlur={(e) =>
                  updateSnapshot(id, {
                    authConfig: {
                      ...snapshot.authConfig,
                      bearerToken: e.target.value,
                    },
                  })
                }
                spellCheck={false}
              />
            )}
            {snapshot.authType === "basic" && (
              <div className="flex gap-1.5">
                <input
                  className="nodrag min-w-0 flex-1 font-mono rounded-md border border-border/50 bg-bg px-2 py-1 text-[11px] outline-none placeholder:text-muted/50 focus:border-accent/60"
                  placeholder="username"
                  defaultValue={snapshot.authConfig.username ?? ""}
                  onBlur={(e) =>
                    updateSnapshot(id, {
                      authConfig: {
                        ...snapshot.authConfig,
                        username: e.target.value,
                      },
                    })
                  }
                  spellCheck={false}
                />
                <input
                  className="nodrag min-w-0 flex-1 font-mono rounded-md border border-border/50 bg-bg px-2 py-1 text-[11px] outline-none placeholder:text-muted/50 focus:border-accent/60"
                  placeholder="password"
                  type="password"
                  defaultValue={snapshot.authConfig.password ?? ""}
                  onBlur={(e) =>
                    updateSnapshot(id, {
                      authConfig: {
                        ...snapshot.authConfig,
                        password: e.target.value,
                      },
                    })
                  }
                />
              </div>
            )}
            {snapshot.authType === "api-key" && (
              <div className="flex gap-1.5">
                <input
                  className="nodrag min-w-0 flex-1 font-mono rounded-md border border-border/50 bg-bg px-2 py-1 text-[11px] outline-none placeholder:text-muted/50 focus:border-accent/60"
                  placeholder="X-Api-Key"
                  defaultValue={snapshot.authConfig.apiKeyHeader ?? ""}
                  onBlur={(e) =>
                    updateSnapshot(id, {
                      authConfig: {
                        ...snapshot.authConfig,
                        apiKeyHeader: e.target.value,
                      },
                    })
                  }
                  spellCheck={false}
                />
                <input
                  className="nodrag min-w-0 flex-1 font-mono rounded-md border border-border/50 bg-bg px-2 py-1 text-[11px] outline-none placeholder:text-muted/50 focus:border-accent/60"
                  placeholder="key or {{key}}"
                  defaultValue={snapshot.authConfig.apiKey ?? ""}
                  onBlur={(e) =>
                    updateSnapshot(id, {
                      authConfig: {
                        ...snapshot.authConfig,
                        apiKey: e.target.value,
                      },
                    })
                  }
                  spellCheck={false}
                />
              </div>
            )}
          </div>
        )}

        {/* run state */}
        {run.status === "pending" && (
          <div className="border-t border-border/40 px-3 py-1.5 text-[10px] text-accent">
            <span className="animate-pulse">sending…</span>
          </div>
        )}
        {run.status === "error" && !run.response && (
          <div className="break-words border-t border-border/40 bg-danger/[0.06] px-3 py-1.5 text-[10px] text-danger">
            {run.error}
          </div>
        )}
        {run.response && run.status !== "pending" && (
          <div className="overflow-hidden rounded-b-[11px] border-t border-border/40">
            <button
              type="button"
              onClick={() => updateNodeData(id, { collapsed: !collapsed })}
              className={cn(
                "nodrag flex w-full items-center gap-2 px-3 py-1.5 text-left text-[10px] transition-colors",
                statusStripClasses(run.response.status)
              )}
            >
              {collapsed ? (
                <ChevronRight className="h-3 w-3 opacity-60" />
              ) : (
                <ChevronDown className="h-3 w-3 opacity-60" />
              )}
              <span className="font-bold">
                {run.response.status === 0 ? "ERR" : run.response.status}
              </span>
              <span className="opacity-70">
                {run.response.statusText && run.response.status !== 0
                  ? run.response.statusText.toLowerCase()
                  : ""}
              </span>
              <div className="flex-1" />
              <span className="opacity-70">
                {run.response.time}ms · {formatSize(run.response.size)}
              </span>
            </button>
            {!collapsed && (
              <div className="nodrag nowheel max-h-72 cursor-auto overflow-auto bg-bg/60">
                <JsonView value={responseText} className="px-3 py-2.5" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

RequestNodeCard.displayName = "RequestNodeCard";
