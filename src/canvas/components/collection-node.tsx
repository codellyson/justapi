"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bookmark, Trash2, Plus, ArrowRight } from "lucide-react";
import { cn } from "../../utils/cn";
import { MethodPill } from "./method-pill";
import { useCollectionsStore, type SavedRequest } from "../use-collections-store";
import type {
  CollectionNode as CollectionNodeType,
  CollectionNodeData,
} from "../types";
import { useCanvasStore } from "../use-canvas-store";

const SPAWN_X_GAP = 420;
const SPAWN_Y_GAP = 150;

/**
 * A spawn source: references a collection and fans its saved requests out
 * as linked request nodes to the right of the card.
 */
export const CollectionNodeCard = memo(
  ({ id, data }: NodeProps<CollectionNodeType>) => {
    const { collectionId } = data as CollectionNodeData;
    const collections = useCollectionsStore((s) => s.collections);
    const updateNodeData = useCanvasStore((s) => s.updateNodeData);
    const removeNode = useCanvasStore((s) => s.removeNode);
    const spawnLinked = useCanvasStore((s) => s.spawnLinked);

    const collection = collections.find((c) => c.id === collectionId);

    const spawn = (requests: SavedRequest[]) => {
      if (requests.length === 0) return;
      const s = useCanvasStore.getState();
      const self = s.graphs[s.activeGraphId]?.nodes.find((n) => n.id === id);
      if (!self) return;
      const baseX = self.position.x + SPAWN_X_GAP;
      const baseY =
        self.position.y - ((requests.length - 1) * SPAWN_Y_GAP) / 2;
      spawnLinked(
        id,
        requests.map((r, i) => ({
          position: { x: baseX, y: baseY + i * SPAWN_Y_GAP },
          snapshot: r.snapshot,
          name: r.name,
        }))
      );
    };

    return (
      <div className="group w-[250px] rounded-xl border border-border/60 bg-bg-secondary/95 font-sans text-[11px] text-primary shadow-[0_10px_28px_-14px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-[border-color] hover:border-border">
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
            collection
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
            onClick={() => removeNode(id)}
            className="nodrag rounded p-0.5 text-muted/60 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            title="Remove from canvas (collection is kept)"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* saved requests */}
        <div className="space-y-0.5 px-2 py-1.5">
          {!collection && (
            <div className="px-1 py-1 text-[10px] text-muted">
              This collection no longer exists — pick another above.
            </div>
          )}
          {collection && collection.requests.length === 0 && (
            <div className="px-1 py-1 text-[10px] text-muted">
              Empty — save requests here with a node's bookmark button.
            </div>
          )}
          {collection?.requests.map((r) => (
            <div
              key={r.id}
              className="group/row nodrag flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-bg/60"
              onClick={() => spawn([r])}
              title={`${r.snapshot.method} ${r.snapshot.urlRaw}\nSpawn on canvas`}
            >
              <MethodPill
                method={r.snapshot.method}
                className="px-1 py-0 text-[9px]"
              />
              <span className="min-w-0 flex-1 truncate text-[10px] text-secondary group-hover/row:text-primary">
                {r.name || r.snapshot.urlRaw}
              </span>
              <Plus className="h-3 w-3 text-accent opacity-0 group-hover/row:opacity-100" />
            </div>
          ))}
        </div>

        {/* spawn all */}
        {collection && collection.requests.length > 1 && (
          <button
            type="button"
            onClick={() => spawn(collection.requests)}
            className={cn(
              "nodrag flex w-full items-center justify-center gap-1.5 rounded-b-[11px] border-t border-border/40 px-3 py-1.5",
              "text-[10px] font-medium text-accent transition-colors hover:bg-accent/10"
            )}
          >
            spawn all {collection.requests.length}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }
);

CollectionNodeCard.displayName = "CollectionNodeCard";
