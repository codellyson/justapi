"use client";

import { memo, useMemo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { cn } from "../../utils/cn";
import { extractHost, hostAccent } from "../host";
import type {
  BindingEdge as BindingEdgeType,
  BindingEdgeData,
  RequestNodeData,
} from "../types";
import { useCanvasStore } from "../use-canvas-store";
import { EdgeInspector } from "./edge-inspector";

export const BindingEdgeView = memo((props: EdgeProps<BindingEdgeType>) => {
  const {
    id,
    source,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
  } = props;
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const inspectedEdgeId = useCanvasStore((s) => s.inspectedEdgeId);
  const setInspectedEdge = useCanvasStore((s) => s.setInspectedEdge);
  const sourceNode = useCanvasStore((s) => {
    const g = s.graphs[s.activeGraphId];
    return g?.nodes.find((n) => n.id === source);
  });
  const targetType = useCanvasStore((s) => {
    const g = s.graphs[s.activeGraphId];
    return g?.nodes.find((n) => n.id === props.target)?.type;
  });
  const binding = data as BindingEdgeData | undefined;
  const inspected = inspectedEdgeId === id;

  // Wires inherit the source's identity: host hue for request nodes,
  // success green for env nodes, dashed accent for collection spawns,
  // dashed amber into assert nodes. Brighter when selected/inspected.
  const isAssert = targetType === "assert";
  const isSpawn = sourceNode?.type === "collection" || isAssert;
  const stroke = useMemo(() => {
    const active = selected || inspected;
    if (isAssert) {
      return `rgb(var(--warning) / ${active ? 0.8 : 0.45})`;
    }
    if (sourceNode?.type === "env") {
      return `rgb(var(--success) / ${active ? 0.9 : 0.5})`;
    }
    if (sourceNode?.type === "collection") {
      return `rgb(var(--accent) / ${active ? 0.8 : 0.4})`;
    }
    if (sourceNode?.type === "request") {
      const d = sourceNode.data as RequestNodeData;
      const host = extractHost(d.snapshot.urlRaw || d.snapshot.url);
      if (host && host !== "(invalid url)") {
        return `hsl(${hostAccent(host).hue} 70% 55% / ${active ? 0.95 : 0.6})`;
      }
    }
    return undefined; // fall back to the themed default stroke
  }, [sourceNode, isAssert, selected, inspected]);

  const label = !binding
    ? "env"
    : binding.targetName
    ? binding.targetKind === "variable"
      ? `${binding.sourcePath} → {{${binding.targetName}}}`
      : `${binding.sourcePath} → ${binding.targetName}:`
    : "bind…";

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke,
          strokeWidth: selected || inspected ? 2 : 1.5,
          strokeDasharray: isSpawn ? "5 4" : undefined,
        }}
      />
      {/* Spawn edges are provenance, not data flow — no label chip. */}
      {!isSpawn && (
      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-auto nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <button
            type="button"
            onClick={() => binding && setInspectedEdge(inspected ? null : id)}
            className={cn(
              "px-1.5 py-0.5 rounded-md border font-mono text-[10px] backdrop-blur-sm transition-colors max-w-[220px] truncate block",
              !binding
                ? "border-success/40 bg-bg-secondary/90 text-success cursor-default"
                : inspected || selected
                ? "border-accent/70 bg-accent/10 text-accent"
                : binding.targetName
                ? "border-border/60 bg-bg-secondary/90 text-secondary hover:text-primary hover:border-accent/50"
                : "border-warning/50 bg-bg-secondary/90 text-warning hover:border-warning"
            )}
            title={binding ? "Edit binding" : "Environment connection"}
          >
            {label}
          </button>
          {inspected && binding && <EdgeInspector edgeId={id} />}
        </div>
      </EdgeLabelRenderer>
      )}
    </>
  );
});

BindingEdgeView.displayName = "BindingEdgeView";
