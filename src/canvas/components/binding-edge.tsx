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
import { replaceVariables } from "../../utils/variables";
import { useEnvironmentStore } from "../../stores/use-environment-store";
import type {
  BindingEdge as BindingEdgeType,
  BindingEdgeData,
  RequestNodeData,
  CollectionNodeData,
} from "../types";
import { useCanvasStore } from "../use-canvas-store";
import { useRunStore } from "../use-run-store";
import { findOrigin } from "../engine";
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

  // A wire is "carrying" while its target executes (inputs in flight) —
  // or, for assert edges, while the graded source is still running.
  const targetPending = useRunStore(
    (s) => s.runs[props.target]?.status === "pending"
  );
  const sourcePending = useRunStore(
    (s) => s.runs[source]?.status === "pending"
  );

  // Env vars scoping the source's tree — so a var-based host
  // ({{base}}/todos) still yields the right hue for its wires.
  const originEnvironmentId = useCanvasStore((s) => {
    if (sourceNode?.type !== "request") return null;
    const g = s.graphs[s.activeGraphId];
    if (!g) return null;
    const origin = findOrigin(source, g);
    return origin
      ? (origin.data as CollectionNodeData).environmentId ?? null
      : null;
  });
  const displayVars = useEnvironmentStore((s) => {
    const active =
      s.environments.find((e) => e.id === s.activeEnvironmentId)?.variables ??
      {};
    const origin = originEnvironmentId
      ? s.environments.find((e) => e.id === originEnvironmentId)?.variables
      : undefined;
    return JSON.stringify({ ...active, ...(origin ?? {}) });
  });

  // Wires inherit the source's identity: host hue for request nodes,
  // dashed accent for origin spawns, dashed amber into assert nodes.
  // Brighter when selected/inspected.
  const isAssert = targetType === "assert";
  const isSpawn = sourceNode?.type === "collection" || isAssert;
  const flowing = targetPending || (isAssert && sourcePending);
  const stroke = useMemo(() => {
    const active = selected || inspected || flowing;
    if (isAssert) {
      return `rgb(var(--warning) / ${active ? 0.7 : 0.4})`;
    }
    if (sourceNode?.type === "collection") {
      return `rgb(var(--accent) / ${active ? 0.7 : 0.4})`;
    }
    if (sourceNode?.type === "request") {
      const d = sourceNode.data as RequestNodeData;
      const raw = d.snapshot.urlRaw || d.snapshot.url;
      const host = raw
        ? extractHost(replaceVariables(raw, JSON.parse(displayVars)))
        : "";
      if (host && host !== "(invalid url)") {
        return `hsl(${hostAccent(host).hue} 45% 62% / ${active ? 0.9 : 0.45})`;
      }
    }
    return undefined; // fall back to the themed default stroke
  }, [sourceNode, isAssert, selected, inspected, flowing, displayVars]);

  const label = !binding
    ? null
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
        className={flowing ? "justapi-edge-flowing" : undefined}
        style={{
          stroke,
          strokeWidth: selected || inspected || flowing ? 2 : 1.5,
          strokeDasharray: flowing ? "6 4" : isSpawn ? "5 4" : undefined,
        }}
      />
      {/* Structural edges (origin spawns, assert grades) carry no label. */}
      {!isSpawn && label !== null && (
      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-auto nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <button
            type="button"
            onClick={() => setInspectedEdge(inspected ? null : id)}
            className={cn(
              "px-1.5 py-0.5 rounded-md border font-mono text-[10px] backdrop-blur-sm transition-colors max-w-[220px] truncate block",
              inspected || selected
                ? "border-accent/70 bg-accent/10 text-accent"
                : binding?.targetName
                ? "border-border/60 bg-bg-secondary/90 text-secondary hover:text-primary hover:border-accent/50"
                : "border-warning/50 bg-bg-secondary/90 text-warning hover:border-warning"
            )}
            title="Edit binding"
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
