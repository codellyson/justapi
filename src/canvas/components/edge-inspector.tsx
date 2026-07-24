"use client";

import { useMemo } from "react";
import { X, Trash2 } from "lucide-react";
import { cn } from "../../utils/cn";
import { extractFromResponse, extractedToString } from "../get-path";
import type { BindingEdgeData } from "../types";
import { useCanvasStore, useActiveGraph } from "../use-canvas-store";
import { useRunStore } from "../use-run-store";

interface Leaf {
  path: string;
  value: unknown;
}

const LEAF_CAP = 60;

/** Flatten a response payload into pickable `data.x[0].y` leaf paths. */
const collectLeaves = (value: unknown, prefix: string, out: Leaf[]): void => {
  if (out.length >= LEAF_CAP) return;
  if (value === null || typeof value !== "object") {
    out.push({ path: prefix, value });
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (out.length >= LEAF_CAP) return;
      collectLeaves(value[i], `${prefix}[${i}]`, out);
    }
    return;
  }
  for (const [k, v] of Object.entries(value)) {
    if (out.length >= LEAF_CAP) return;
    collectLeaves(v, `${prefix}.${k}`, out);
  }
};

/** Last meaningful segment of a path, for auto-naming the variable. */
const lastSegment = (path: string): string => {
  const m = path.match(/\.?([A-Za-z_$][\w$]*)(?:\[\d+\])*$/);
  return m ? m[1] : "";
};

/**
 * Popover anchored under the edge label: edit the extraction path, the
 * binding kind (variable vs header), and the target name — with a live
 * preview of the extracted value when the source has a cached response,
 * and a click-to-pick list of the response's fields.
 */
export const EdgeInspector = ({ edgeId }: { edgeId: string }) => {
  const graph = useActiveGraph();
  const updateEdgeData = useCanvasStore((s) => s.updateEdgeData);
  const removeEdge = useCanvasStore((s) => s.removeEdge);
  const setInspectedEdge = useCanvasStore((s) => s.setInspectedEdge);

  const edge = graph.edges.find((e) => e.id === edgeId);
  const data = edge?.data as BindingEdgeData | undefined;
  const sourceRun = useRunStore((s) =>
    edge ? s.runs[edge.source] : undefined
  );

  const preview = useMemo(() => {
    if (!data || !sourceRun?.response) return null;
    const value = extractFromResponse(sourceRun.response, data.sourcePath);
    if (value === undefined) return { ok: false, text: "no match" };
    const text = extractedToString(value);
    return { ok: true, text: text.length > 60 ? `${text.slice(0, 60)}…` : text };
  }, [data, sourceRun]);

  const leaves = useMemo(() => {
    const body = sourceRun?.response?.data;
    if (body === undefined || body instanceof ArrayBuffer) return [];
    const out: Leaf[] = [];
    collectLeaves(body, "data", out);
    return out;
  }, [sourceRun]);

  const pick = (leaf: Leaf) => {
    updateEdgeData(edgeId, {
      sourcePath: leaf.path,
      // Auto-name the variable after the picked field unless the user
      // already chose a name.
      ...(data && !data.targetName
        ? { targetName: lastSegment(leaf.path) }
        : {}),
    });
  };

  if (!edge || !data) return null;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-60 rounded-lg border border-border/60 bg-bg-secondary/95 backdrop-blur-sm shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5)] font-sans text-[13px] p-2.5 space-y-2 z-10"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted">
          binding
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => removeEdge(edgeId)}
            className="p-0.5 rounded text-muted hover:text-danger"
            title="Delete binding"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setInspectedEdge(null)}
            className="p-0.5 rounded text-muted hover:text-primary"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[12px] text-secondary">
          extract from response
        </label>
        <input
          className="w-full font-mono rounded-md border border-border/50 bg-bg px-2 py-1 text-[13px] outline-none focus:border-accent/60 placeholder:text-muted/70"
          placeholder="data.token · status · headers.etag"
          value={data.sourcePath}
          onChange={(e) => updateEdgeData(edgeId, { sourcePath: e.target.value })}
          spellCheck={false}
          autoFocus
        />
        {preview && (
          <div
            className={cn(
              "px-2 py-1 font-mono rounded-md border text-[12px] truncate",
              preview.ok
                ? "border-success/30 bg-success/5 text-success"
                : "border-warning/30 bg-warning/5 text-warning"
            )}
            title={preview.text}
          >
            {preview.ok ? `= ${preview.text}` : preview.text}
          </div>
        )}
        {!sourceRun?.response && (
          <div className="px-2 py-1 rounded-md border border-border/40 text-[12px] text-muted">
            run the source node to preview &amp; pick fields
          </div>
        )}
        {leaves.length > 0 && (
          <div className="space-y-1">
            <div className="text-[12px] text-secondary">or pick a field</div>
            <div className="nowheel nodrag max-h-36 overflow-y-auto rounded-md border border-border/40 bg-bg/40">
              {leaves.map((leaf) => (
                <button
                  key={leaf.path}
                  type="button"
                  onClick={() => pick(leaf)}
                  className={cn(
                    "flex w-full items-center gap-2 px-2 py-1 text-left font-mono text-[12px] transition-colors hover:bg-bg/70",
                    data.sourcePath === leaf.path
                      ? "bg-accent/10 text-accent"
                      : "text-secondary"
                  )}
                >
                  <span className="truncate">{leaf.path}</span>
                  <span className="ml-auto max-w-[80px] shrink-0 truncate text-muted">
                    {leaf.value === null ? "null" : String(leaf.value)}
                  </span>
                </button>
              ))}
              {leaves.length >= LEAF_CAP && (
                <div className="px-2 py-1 text-[10px] text-muted">
                  first {LEAF_CAP} fields shown — type deeper paths above
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-[12px] text-secondary">feed into</label>
        <div className="flex gap-1">
          {(["variable", "header"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => updateEdgeData(edgeId, { targetKind: kind })}
              className={cn(
                "px-1.5 py-0.5 rounded border text-[12px]",
                data.targetKind === kind
                  ? "border-accent/60 bg-accent/10 text-accent"
                  : "border-border/40 text-muted hover:text-secondary"
              )}
            >
              {kind}
            </button>
          ))}
        </div>
        <input
          className="w-full font-mono rounded-md border border-border/50 bg-bg px-2 py-1 text-[13px] outline-none focus:border-accent/60 placeholder:text-muted/70"
          placeholder={
            data.targetKind === "variable"
              ? "name — use as {{name}} in target"
              : "header name, e.g. Authorization"
          }
          value={data.targetName}
          onChange={(e) => updateEdgeData(edgeId, { targetName: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") setInspectedEdge(null);
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
};
