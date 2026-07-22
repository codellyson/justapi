"use client";

import { useMemo } from "react";
import { X, Trash2 } from "lucide-react";
import { cn } from "../../utils/cn";
import { extractFromResponse, extractedToString } from "../get-path";
import type { BindingEdgeData } from "../types";
import { useCanvasStore, useActiveGraph } from "../use-canvas-store";
import { useRunStore } from "../use-run-store";

/**
 * Popover anchored under the edge label: edit the extraction path, the
 * binding kind (variable vs header), and the target name — with a live
 * preview of the extracted value when the source has a cached response.
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

  if (!edge || !data) return null;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-60 rounded-lg border border-border/60 bg-bg-secondary/95 backdrop-blur-sm shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5)] font-sans text-[11px] p-2.5 space-y-2 z-10"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-muted">
          binding
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => removeEdge(edgeId)}
            className="p-0.5 rounded text-muted/60 hover:text-danger"
            title="Delete binding"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setInspectedEdge(null)}
            className="p-0.5 rounded text-muted/60 hover:text-primary"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] text-secondary">
          extract from response
        </label>
        <input
          className="w-full font-mono rounded-md border border-border/50 bg-bg px-2 py-1 text-[11px] outline-none focus:border-accent/60 placeholder:text-muted/60"
          placeholder="data.token · status · headers.etag"
          value={data.sourcePath}
          onChange={(e) => updateEdgeData(edgeId, { sourcePath: e.target.value })}
          spellCheck={false}
          autoFocus
        />
        {preview && (
          <div
            className={cn(
              "px-2 py-1 font-mono rounded-md border text-[10px] truncate",
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
          <div className="px-2 py-1 rounded-md border border-border/40 text-[10px] text-muted">
            run the source node to preview
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] text-secondary">feed into</label>
        <div className="flex gap-1">
          {(["variable", "header"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => updateEdgeData(edgeId, { targetKind: kind })}
              className={cn(
                "px-1.5 py-0.5 rounded border text-[10px]",
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
          className="w-full font-mono rounded-md border border-border/50 bg-bg px-2 py-1 text-[11px] outline-none focus:border-accent/60 placeholder:text-muted/60"
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
