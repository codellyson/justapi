"use client";

import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { ChevronDown, ChevronRight, FolderPlus, Hexagon } from "lucide-react";
import { MethodPill } from "./method-pill";
import { useActiveGraph, useCanvasStore } from "../use-canvas-store";
import type {
  CanvasNode,
  CollectionNodeData,
  RequestNode,
  RequestNodeData,
} from "../types";

/** Walk backward over edges to the origin (collection node) a request
 *  traces to, or null when the request hangs loose. */
const originIdOf = (
  nodeId: string,
  nodes: CanvasNode[],
  edges: { source: string; target: string }[]
): string | null => {
  const visited = new Set<string>([nodeId]);
  const queue = [nodeId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const e of edges) {
      if (e.target !== cur) continue;
      const src = nodes.find((n) => n.id === e.source);
      if (!src || visited.has(src.id)) continue;
      if (src.type === "collection") return src.id;
      if (src.type === "request") {
        visited.add(src.id);
        queue.push(src.id);
      }
    }
  }
  return null;
};

/**
 * Collections on the active canvas. A collection is a flow tree — its
 * origin plus every request wired under it — derived from the board, not a
 * separate store. Click a request to focus its node.
 */
export const CollectionsPane = () => {
  const { fitView, screenToFlowPosition } = useReactFlow();
  const graph = useActiveGraph();
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const addCollectionNode = useCanvasStore((s) => s.addCollectionNode);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const origins = graph.nodes.filter((n) => n.type === "collection");
  const requests = graph.nodes.filter(
    (n): n is RequestNode => n.type === "request"
  );

  const members: Record<string, RequestNode[]> = {};
  const loose: RequestNode[] = [];
  for (const r of requests) {
    const oid = originIdOf(r.id, graph.nodes, graph.edges);
    if (oid) (members[oid] ??= []).push(r);
    else loose.push(r);
  }

  const focus = (nodeId: string) => {
    onNodesChange(
      graph.nodes.map((n) => ({
        id: n.id,
        type: "select" as const,
        selected: n.id === nodeId,
      }))
    );
    void fitView({
      nodes: [{ id: nodeId }],
      duration: 400,
      padding: 0.6,
      maxZoom: 1,
    });
  };

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const newCollection = () => {
    const name = window.prompt("New collection name");
    if (!name?.trim()) return;
    addCollectionNode(
      screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }),
      name.trim()
    );
  };

  const requestRow = (r: RequestNode) => {
    const data = r.data as RequestNodeData;
    return (
      <button
        key={r.id}
        type="button"
        onClick={() => focus(r.id)}
        className="group flex w-full items-center gap-1.5 py-1 pl-6 pr-2 text-left hover:bg-bg/60"
        title={`${data.snapshot.method} ${data.snapshot.urlRaw}\nClick to focus on canvas`}
      >
        <MethodPill
          method={data.snapshot.method}
          className="px-1 py-0 text-[10px]"
        />
        <span className="flex-1 truncate text-[12px] text-secondary group-hover:text-primary">
          {data.name || data.snapshot.urlRaw || "untitled request"}
        </span>
      </button>
    );
  };

  const isEmpty = origins.length === 0 && loose.length === 0;

  return (
    <div className="flex w-60 flex-none flex-col border-r border-border/50 bg-bg-secondary font-sans">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <span className="text-[11px] text-muted">collections · this canvas</span>
        <button
          type="button"
          onClick={newCollection}
          className="rounded p-1 text-secondary hover:bg-bg/60 hover:text-primary"
          title="New collection on this canvas"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {isEmpty && (
          <div className="px-3 py-4 text-[12px] leading-relaxed text-muted">
            No collections on this canvas yet.
            <br />
            Create one with the{" "}
            <span className="text-secondary">＋</span> above, or run the demo
            flow from an empty board.
          </div>
        )}

        {origins.map((o) => {
          const memberList = members[o.id] ?? [];
          const open = !collapsed.has(o.id);
          return (
            <div key={o.id}>
              <div className="group flex items-center gap-1 px-2 py-1 text-[13px] text-secondary hover:bg-bg/50">
                <button
                  type="button"
                  onClick={() => toggle(o.id)}
                  className="flex flex-1 items-center gap-1 text-left hover:text-primary min-w-0"
                >
                  {open ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-muted" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted" />
                  )}
                  <Hexagon className="h-3 w-3 shrink-0 text-accent" />
                  <span className="flex-1 truncate">
                    {(o.data as CollectionNodeData).name || "untitled"}
                  </span>
                  <span className="text-[12px] text-muted">
                    {memberList.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => focus(o.id)}
                  className="hidden rounded px-1 text-[11px] text-muted hover:text-primary group-hover:block"
                  title="Focus origin on canvas"
                >
                  focus
                </button>
              </div>
              {open &&
                (memberList.length > 0 ? (
                  memberList.map(requestRow)
                ) : (
                  <div className="py-1 pl-6 pr-2 text-[12px] text-muted">
                    no requests yet
                  </div>
                ))}
            </div>
          );
        })}

        {loose.length > 0 && (
          <div className="mt-1 border-t border-border/40 pt-1">
            <div className="px-2 py-1 text-[11px] text-warning" title="Requests not wired under any origin">
              loose · {loose.length} not in a collection
            </div>
            {loose.map(requestRow)}
          </div>
        )}
      </div>
    </div>
  );
};
