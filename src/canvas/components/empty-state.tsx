"use client";

import { useReactFlow } from "@xyflow/react";
import { Plus, Import } from "lucide-react";
import { useCanvasStore } from "../use-canvas-store";

interface EmptyStateProps {
  onOpenImport: () => void;
}

/** Empty canvas, styled as the request you're about to make. */
export const EmptyState = ({ onOpenImport }: EmptyStateProps) => {
  const { screenToFlowPosition } = useReactFlow();
  const addRequestNode = useCanvasStore((s) => s.addRequestNode);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center pl-12">
      <div className="text-center font-sans">
        <div className="mb-4 select-none font-mono text-[13px] leading-relaxed">
          <span className="text-muted/60">$</span>{" "}
          <span className="text-success">GET</span>{" "}
          <span className="text-secondary">https://</span>
          <span className="animate-pulse text-accent">▌</span>
        </div>
        <div className="pointer-events-auto flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() =>
              addRequestNode(
                screenToFlowPosition({
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2,
                })
              )
            }
            className="flex items-center gap-1.5 rounded-md border border-border/60 bg-bg-secondary/80 px-3 py-1.5 text-[11px] text-secondary backdrop-blur-sm transition-colors hover:border-accent/60 hover:text-primary"
          >
            <Plus className="h-3 w-3 text-accent" />
            new request
          </button>
          <button
            type="button"
            onClick={onOpenImport}
            className="flex items-center gap-1.5 rounded-md border border-border/60 bg-bg-secondary/80 px-3 py-1.5 text-[11px] text-secondary backdrop-blur-sm transition-colors hover:border-accent/60 hover:text-primary"
          >
            <Import className="h-3 w-3 text-accent" />
            import curl · fetch · HAR · OpenAPI
          </button>
        </div>
        <p className="mt-3 text-[10px] text-muted/70">
          drag between node handles to feed one response into the next request
        </p>
      </div>
    </div>
  );
};
