"use client";

import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  Plus,
  Globe,
  Import,
  Bookmark,
  Layers,
  Check,
  Pencil,
  Trash2,
  Eraser,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useEnvironmentStore } from "../../stores/use-environment-store";
import { useCanvasStore } from "../use-canvas-store";

interface RailProps {
  libraryOpen: boolean;
  onToggleLibrary: () => void;
  onOpenImport: () => void;
}

const railBtn =
  "relative flex items-center justify-center w-8 h-8 rounded-md text-secondary hover:text-primary hover:bg-bg/70 transition-colors";

/**
 * The instrument rail: brand mark up top, node actions below it, the
 * library toggle, and the canvas switcher at the bottom. Everything the
 * old floating toolbar did, docked.
 */
export const Rail = ({ libraryOpen, onToggleLibrary, onOpenImport }: RailProps) => {
  const { screenToFlowPosition } = useReactFlow();
  const addRequestNode = useCanvasStore((s) => s.addRequestNode);
  const addEnvNode = useCanvasStore((s) => s.addEnvNode);
  const graphs = useCanvasStore((s) => s.graphs);
  const activeGraphId = useCanvasStore((s) => s.activeGraphId);
  const setActiveGraph = useCanvasStore((s) => s.setActiveGraph);
  const createGraph = useCanvasStore((s) => s.createGraph);
  const renameGraph = useCanvasStore((s) => s.renameGraph);
  const deleteGraph = useCanvasStore((s) => s.deleteGraph);
  const clearGraph = useCanvasStore((s) => s.clearGraph);

  const [graphsOpen, setGraphsOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const active = graphs[activeGraphId];

  const centerPosition = () =>
    screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

  return (
    <div className="absolute left-0 top-0 bottom-7 z-30 flex w-12 flex-col items-center gap-1 border-r border-border/50 bg-bg-secondary/85 backdrop-blur-sm py-2.5">
      {/* brand mark */}
      <div
        className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-bg font-mono text-[13px] font-bold text-accent select-none"
        title="JustAPI"
      >
        {"{}"}
      </div>

      <button
        type="button"
        onClick={() => addRequestNode(centerPosition())}
        className={railBtn}
        title="New request node"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          const envs = useEnvironmentStore.getState();
          const envId = envs.activeEnvironmentId ?? envs.environments[0]?.id;
          if (envId) addEnvNode(centerPosition(), envId);
        }}
        className={railBtn}
        title="New environment node"
      >
        <Globe className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onOpenImport}
        className={railBtn}
        title="Import cURL / fetch / HAR / OpenAPI"
      >
        <Import className="h-4 w-4" />
      </button>

      <div className="my-1.5 h-px w-6 bg-border/60" />

      <button
        type="button"
        onClick={onToggleLibrary}
        className={cn(railBtn, libraryOpen && "text-accent bg-accent/10")}
        title="Collections"
      >
        <Bookmark className="h-4 w-4" />
      </button>

      <div className="flex-1" />

      {/* canvas switcher */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setGraphsOpen((o) => !o);
            setConfirmClear(false);
          }}
          className={cn(railBtn, graphsOpen && "text-primary bg-bg/70")}
          title={`Canvas: ${active?.name ?? ""}`}
        >
          <Layers className="h-4 w-4" />
        </button>
        {graphsOpen && (
          <div className="absolute bottom-0 left-full ml-2 w-72 rounded-xl border border-border/60 bg-bg-secondary/95 py-1.5 font-sans text-[13px] shadow-[0_12px_28px_-12px_rgba(0,0,0,0.5)] backdrop-blur-sm">
            <div className="px-3.5 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.14em] text-muted">
              canvases
            </div>
            {Object.values(graphs)
              .sort((a, b) => a.createdAt - b.createdAt)
              .map((g) => (
                <div
                  key={g.id}
                  className={cn(
                    "group flex cursor-pointer items-center gap-2 px-3.5 py-2 hover:bg-bg/60",
                    g.id === activeGraphId ? "text-accent" : "text-secondary"
                  )}
                  onClick={() => {
                    setActiveGraph(g.id);
                    setGraphsOpen(false);
                  }}
                >
                  {g.id === activeGraphId ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : (
                    <span className="w-4 shrink-0" />
                  )}
                  <span className="flex-1 truncate">{g.name}</span>
                  <span
                    className="text-[11px] text-muted/70"
                    title={`${g.nodes.length} node${g.nodes.length === 1 ? "" : "s"}`}
                  >
                    {g.nodes.length}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const name = window.prompt("Rename canvas", g.name);
                      if (name?.trim()) renameGraph(g.id, name.trim());
                    }}
                    className="hidden rounded p-1 text-muted/60 hover:text-primary group-hover:block"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete canvas "${g.name}"?`)) {
                        deleteGraph(g.id);
                      }
                    }}
                    className="hidden rounded p-1 text-muted/60 hover:text-danger group-hover:block"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            <button
              type="button"
              onClick={() => {
                createGraph();
                setGraphsOpen(false);
              }}
              className="mt-1 flex w-full items-center gap-2 border-t border-border/40 px-3.5 py-2 text-secondary hover:text-primary hover:bg-bg/60"
            >
              <Plus className="h-4 w-4" />
              new canvas
            </button>
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
                setGraphsOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3.5 py-2 transition-colors",
                confirmClear
                  ? "bg-danger/10 text-danger"
                  : "text-secondary hover:text-danger hover:bg-danger/10"
              )}
            >
              <Eraser className="h-4 w-4" />
              {confirmClear
                ? `really clear ${active?.nodes.length ?? 0} nodes?`
                : "clear board"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
