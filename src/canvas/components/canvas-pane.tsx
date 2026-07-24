"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, Plus, Eraser } from "lucide-react";
import { cn } from "../../utils/cn";
import { useCanvasStore } from "../use-canvas-store";

/**
 * Canvases panel: every named board, docked beside the rail like the
 * collections pane. Switch, rename, delete, add — the list scrolls, so it
 * scales past a handful the way a floating popover never could.
 */
export const CanvasPane = () => {
  const graphs = useCanvasStore((s) => s.graphs);
  const activeGraphId = useCanvasStore((s) => s.activeGraphId);
  const setActiveGraph = useCanvasStore((s) => s.setActiveGraph);
  const createGraph = useCanvasStore((s) => s.createGraph);
  const renameGraph = useCanvasStore((s) => s.renameGraph);
  const deleteGraph = useCanvasStore((s) => s.deleteGraph);
  const clearGraph = useCanvasStore((s) => s.clearGraph);

  const [confirmClear, setConfirmClear] = useState(false);
  const active = graphs[activeGraphId];
  const list = Object.values(graphs).sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="flex w-60 flex-none flex-col border-r border-border/50 bg-bg-secondary font-sans">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <span className="text-[11px] text-muted">canvases</span>
        <button
          type="button"
          onClick={() => createGraph()}
          className="rounded p-1 text-secondary hover:text-primary hover:bg-bg/60"
          title="New canvas"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {list.map((g) => (
          <div
            key={g.id}
            className={cn(
              "group flex items-center gap-1 px-2 py-1.5 text-[13px] hover:bg-bg/50",
              g.id === activeGraphId ? "text-accent" : "text-secondary"
            )}
          >
            <button
              type="button"
              onClick={() => setActiveGraph(g.id)}
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left hover:text-primary"
            >
              {g.id === activeGraphId ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              <span className="flex-1 truncate">{g.name}</span>
              <span
                className="text-[12px] text-muted"
                title={`${g.nodes.length} node${g.nodes.length === 1 ? "" : "s"}`}
              >
                {g.nodes.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                const name = window.prompt("Rename canvas", g.name);
                if (name?.trim()) renameGraph(g.id, name.trim());
              }}
              className="hidden rounded p-0.5 text-muted hover:text-primary group-hover:block"
              title="Rename"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete canvas "${g.name}"?`)) deleteGraph(g.id);
              }}
              className="hidden rounded p-0.5 text-muted hover:text-danger group-hover:block"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          const count = active?.nodes.length ?? 0;
          if (count > 0 && !confirmClear) {
            setConfirmClear(true);
            return;
          }
          clearGraph();
          setConfirmClear(false);
        }}
        className={cn(
          "flex items-center gap-2 border-t border-border/40 px-3 py-2 text-[13px] transition-colors",
          confirmClear
            ? "bg-danger/10 text-danger"
            : "text-secondary hover:bg-danger/10 hover:text-danger"
        )}
      >
        <Eraser className="h-3.5 w-3.5" />
        {confirmClear
          ? `really clear ${active?.nodes.length ?? 0} nodes?`
          : "clear board"}
      </button>
    </div>
  );
};
