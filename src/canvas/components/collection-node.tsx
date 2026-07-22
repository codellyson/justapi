"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bookmark, Trash2, Plus, Play } from "lucide-react";
import { cn } from "../../utils/cn";
import { useCollectionsStore } from "../use-collections-store";
import type {
  CollectionNode as CollectionNodeType,
  CollectionNodeData,
} from "../types";
import { useCanvasStore, useActiveGraph } from "../use-canvas-store";
import { useRunStore, idleRun } from "../use-run-store";
import { runFlow } from "../engine";

const BRANCH_X_GAP = 420;
const BRANCH_Y_GAP = 150;

/**
 * The origin of a flow: the root every request in the tree traces back
 * to. Requests are added from here (and branch from each other); run
 * executes the whole tree in order.
 */
export const CollectionNodeCard = memo(
  ({ id, data }: NodeProps<CollectionNodeType>) => {
    const { collectionId } = data as CollectionNodeData;
    const collections = useCollectionsStore((s) => s.collections);
    const updateNodeData = useCanvasStore((s) => s.updateNodeData);
    const removeNode = useCanvasStore((s) => s.removeNode);
    const addLinkedRequest = useCanvasStore((s) => s.addLinkedRequest);
    const graph = useActiveGraph();
    const run = useRunStore((s) => s.runs[id]) ?? idleRun;

    const collection = collections.find((c) => c.id === collectionId);
    const running = run.status === "pending";
    const outgoing = graph.edges.filter((e) => e.source === id).length;

    const addRequest = () => {
      const s = useCanvasStore.getState();
      const self = s.graphs[s.activeGraphId]?.nodes.find((n) => n.id === id);
      if (!self) return;
      addLinkedRequest(id, {
        x: self.position.x + BRANCH_X_GAP,
        y: self.position.y + outgoing * BRANCH_Y_GAP,
      });
    };

    return (
      <div className="group w-[230px] rounded-xl border border-border/60 bg-bg-secondary/95 font-sans text-[11px] text-primary shadow-[0_10px_28px_-14px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-[border-color] hover:border-border">
        <Handle
          type="source"
          position={Position.Right}
          className="justapi-handle"
          style={{ borderColor: "rgb(var(--accent))" }}
        />

        {/* eyebrow */}
        <div className="flex items-center gap-1.5 rounded-t-[11px] bg-accent/[0.08] px-3 py-1.5">
          <Bookmark className="h-3 w-3 shrink-0 text-accent" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">
            origin
          </span>
          <select
            className="nodrag min-w-0 flex-1 cursor-pointer bg-transparent text-right text-[10px] uppercase tracking-[0.12em] text-secondary outline-none"
            value={collectionId}
            onChange={(e) =>
              updateNodeData(id, { collectionId: e.target.value })
            }
          >
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            {!collection && <option value={collectionId}>(deleted)</option>}
          </select>
          <button
            type="button"
            onClick={() => void runFlow(id)}
            disabled={running}
            className={cn(
              "nodrag flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
              running
                ? "animate-pulse border-accent/60 text-accent"
                : "border-accent/50 text-accent hover:bg-accent hover:text-accent-text"
            )}
            title="Run flow — executes every request in this tree, in order"
          >
            <Play className="ml-px h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => removeNode(id)}
            className="nodrag rounded p-0.5 text-muted/60 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            title="Remove from canvas (collection is kept)"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* grow the tree */}
        <button
          type="button"
          onClick={addRequest}
          className={cn(
            "nodrag flex w-full items-center justify-center gap-1.5 px-3 py-2",
            "text-[10px] font-medium text-accent transition-colors hover:bg-accent/10",
            run.status === "idle" && "rounded-b-[11px]"
          )}
          title="Add a request to this flow — it branches from the origin"
        >
          <Plus className="h-3 w-3" />
          add request
        </button>

        {/* flow verdict */}
        {running && (
          <div className="rounded-b-[11px] border-t border-border/40 px-3 py-1.5 text-[10px] text-accent">
            <span className="animate-pulse">running flow…</span>
          </div>
        )}
        {!running && run.error && (
          <div
            className={cn(
              "rounded-b-[11px] border-t border-border/40 px-3 py-1.5 text-[10px] font-medium",
              run.status === "error"
                ? "bg-danger/[0.07] text-danger"
                : "bg-success/[0.07] text-success"
            )}
          >
            {run.error}
          </div>
        )}
      </div>
    );
  }
);

CollectionNodeCard.displayName = "CollectionNodeCard";
