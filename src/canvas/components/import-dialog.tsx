"use client";

import { useMemo, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import { smartParse } from "../parse-curl";
import { parseHar } from "../../utils/har";
import { parseOpenApi } from "../parse-openapi";
import { emptySnapshot, useCanvasStore } from "../use-canvas-store";
import { gridPositions } from "../layout";
import { MethodPill } from "./method-pill";
import type { CardRequestSnapshot } from "../types";

interface Candidate {
  name: string;
  snapshot: CardRequestSnapshot;
}

const pathOf = (url: string): string => {
  try {
    const u = new URL(url.replace(/\{\{([^}]+)\}\}/g, "_$1_"));
    return u.pathname;
  } catch {
    return url;
  }
};

/**
 * Detect and parse pasted content into request candidates:
 * OpenAPI JSON → endpoints; HAR → captured requests; otherwise split into
 * blocks and `smartParse` each (cURL / copy-as-fetch / "GET url" lines).
 */
const parseInput = (raw: string): Candidate[] => {
  const text = raw.trim();
  if (!text) return [];

  const openapi = parseOpenApi(text);
  if (openapi) {
    return openapi.map((ep) => ({
      name: ep.name,
      snapshot: emptySnapshot({ method: ep.method, url: ep.url, urlRaw: ep.url }),
    }));
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
        return har
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
          }));
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
  return out;
};

interface ImportDialogProps {
  onClose: () => void;
}

export const ImportDialog = ({ onClose }: ImportDialogProps) => {
  const { screenToFlowPosition } = useReactFlow();
  const addRequestNodes = useCanvasStore((s) => s.addRequestNodes);

  const [raw, setRaw] = useState("");
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  const candidates = useMemo(() => parseInput(raw), [raw]);
  const selected = candidates.filter((_, i) => !excluded.has(i));

  const fanOut = () => {
    if (selected.length === 0) return;
    const origin = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const positions = gridPositions(selected.length, origin);
    addRequestNodes(
      selected.map((c, i) => ({
        position: positions[i],
        snapshot: c.snapshot,
        name: c.name,
      }))
    );
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-bg/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-[520px] max-w-[calc(100vw-32px)] max-h-[80vh] flex flex-col rounded-xl border border-border/60 bg-bg-secondary/95 backdrop-blur-sm shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
          <span className="text-[10px] uppercase tracking-wide text-muted">
            import — curl · fetch · HAR · OpenAPI json
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-primary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <textarea
          className="m-3 h-36 shrink-0 resize-none font-mono rounded-md border border-border/50 bg-bg px-2.5 py-2 text-[11px] outline-none focus:border-accent/60 placeholder:text-muted/50"
          placeholder={`curl -H 'Authorization: Bearer {{token}}' https://api.example.com/users\n\npaste one or many — blocks are split automatically`}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          autoFocus
          spellCheck={false}
        />

        {candidates.length > 0 && (
          <div className="flex-1 min-h-0 overflow-y-auto px-3 space-y-1">
            {candidates.map((c, i) => {
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
                    "w-full flex items-center gap-2 px-2 py-1 rounded-md border text-left transition-colors",
                    off
                      ? "border-border/30 opacity-40"
                      : "border-border/50 hover:border-accent/50"
                  )}
                >
                  <MethodPill method={c.snapshot.method} className="text-[10px]" />
                  <span className="flex-1 min-w-0 truncate font-mono text-[11px] text-primary">
                    {c.snapshot.urlRaw}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted truncate max-w-[120px]">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/40 mt-3">
          <span className="text-[10px] text-muted">
            {raw.trim()
              ? `${selected.length} of ${candidates.length} selected`
              : ""}
          </span>
          <button
            type="button"
            onClick={fanOut}
            disabled={selected.length === 0}
            className={cn(
              "px-3 py-1 rounded-md text-[11px] font-semibold transition-colors",
              selected.length > 0
                ? "bg-accent text-accent-text hover:bg-accent-hover"
                : "bg-bg text-muted cursor-not-allowed"
            )}
          >
            add {selected.length > 0 ? selected.length : ""} node
            {selected.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
};
