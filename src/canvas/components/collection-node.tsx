"use client";

import { memo, useMemo } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { Bookmark, Trash2, Plus, ArrowRight, Play, Check } from "lucide-react";
import { cn } from "../../utils/cn";
import { MethodPill } from "./method-pill";
import { useCollectionsStore, type SavedRequest } from "../use-collections-store";
import type {
  CollectionNode as CollectionNodeType,
  CollectionNodeData,
  RequestNodeData,
} from "../types";
import { useCanvasStore, useActiveGraph } from "../use-canvas-store";
import { useRunStore, idleRun } from "../use-run-store";
import { runFlow } from "../engine";

const SPAWN_X_GAP = 420;
const SPAWN_Y_GAP = 150;

/**
 * The entry point of a flow: references a collection, fans its saved
 * requests out as wired nodes, and runs everything downstream in order.
 */
export const CollectionNodeCard = memo(
  ({ id, data }: NodeProps<CollectionNodeType>) => {
    const { collectionId } = data as CollectionNodeData;
    const collections = useCollectionsStore((s) => s.collections);
    const updateNodeData = useCanvasStore((s) => s.updateNodeData);
    const removeNode = useCanvasStore((s) => s.removeNode);
    const spawnLinked = useCanvasStore((s) => s.spawnLinked);
    const graph = useActiveGraph();
    const run = useRunStore((s) => s.runs[id]) ?? idleRun;
    const { fitView } = useReactFlow();

    const collection = collections.find((c) => c.id === collectionId);
    const running = run.status === "pending";

    /** Saved-request id → live node id, for requests already spawned
     *  from this collection node and still wired to it. */
    const spawnedNodes = useMemo(() => {
      const targets = new Set(
        graph.edges.filter((e) => e.source === id).map((e) => e.target)
      );
      const map = new Map<string, string>();
      for (const n of graph.nodes) {
        if (n.type !== "request" || !targets.has(n.id)) continue;
        const from = (n.data as RequestNodeData).spawnedFrom;
        if (typeof from === "string" && !map.has(from)) map.set(from, n.id);
      }
      return map;
    }, [graph, id]);

    const missing = useMemo(
      () =>
        collection?.requests.filter((r) => !spawnedNodes.has(r.id)) ?? [],
      [collection, spawnedNodes]
    );

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
          spawnedFrom: r.id,
        }))
      );
    };

    /** Pan/zoom to a request's already-spawned node. */
    const focusNode = (nodeId: string) => {
      void fitView({
        nodes: [{ id: nodeId }],
        padding: 0.4,
        duration: 300,
        maxZoom: 1,
      });
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
            onClick={() => void runFlow(id)}
            disabled={running}
            className={cn(
              "nodrag flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
              running
                ? "animate-pulse border-accent/60 text-accent"
                : "border-accent/50 text-accent hover:bg-accent hover:text-accent-text"
            )}
            title="Run flow — executes everything wired downstream, in order"
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
          {collection?.requests.map((r) => {
            const liveNodeId = spawnedNodes.get(r.id);
            return (
              <div
                key={r.id}
                className="group/row nodrag flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-bg/60"
                onClick={() =>
                  liveNodeId ? focusNode(liveNodeId) : spawn([r])
                }
                title={`${r.snapshot.method} ${r.snapshot.urlRaw}\n${
                  liveNodeId ? "On the board — click to jump to it" : "Spawn on canvas"
                }`}
              >
                <MethodPill
                  method={r.snapshot.method}
                  className="px-1 py-0 text-[9px]"
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[10px] group-hover/row:text-primary",
                    liveNodeId ? "text-primary/90" : "text-secondary"
                  )}
                >
                  {r.name || r.snapshot.urlRaw}
                </span>
                {liveNodeId ? (
                  <Check className="h-3 w-3 shrink-0 text-success/80" />
                ) : (
                  <Plus className="h-3 w-3 shrink-0 text-accent opacity-0 group-hover/row:opacity-100" />
                )}
              </div>
            );
          })}
        </div>

        {/* spawn the not-yet-spawned */}
        {collection && collection.requests.length > 0 && (
          missing.length > 0 ? (
            <button
              type="button"
              onClick={() => spawn(missing)}
              className={cn(
                "nodrag flex w-full items-center justify-center gap-1.5 border-t border-border/40 px-3 py-1.5",
                "text-[10px] font-medium text-accent transition-colors hover:bg-accent/10",
                run.status === "idle" && "rounded-b-[11px]"
              )}
            >
              {missing.length === collection.requests.length
                ? `spawn all ${missing.length}`
                : `spawn ${missing.length} remaining`}
              <ArrowRight className="h-3 w-3" />
            </button>
          ) : (
            <div
              className={cn(
                "flex w-full items-center justify-center gap-1.5 border-t border-border/40 px-3 py-1.5 text-[10px] text-muted",
                run.status === "idle" && "rounded-b-[11px]"
              )}
            >
              <Check className="h-3 w-3 text-success/70" />
              all on the board
            </div>
          )
        )}

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
