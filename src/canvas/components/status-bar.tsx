"use client";

import { useMemo } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { Minus, Plus, Maximize2, LayoutGrid } from "lucide-react";
import { cn } from "../../utils/cn";
import { useEnvironmentStore } from "../../stores/use-environment-store";
import { useActiveGraph, useCanvasStore } from "../use-canvas-store";
import { useRunStore } from "../use-run-store";
import { formatSize } from "../format";
import type { RequestNodeData } from "../types";

const statusTone = (status: number): string => {
  if (status >= 200 && status < 300) return "text-success";
  if (status >= 300 && status < 400) return "text-accent";
  if (status >= 400 && status < 500) return "text-warning";
  return "text-danger";
};

const pathOf = (url: string): string => {
  try {
    const u = new URL(url.replace(/\{\{([^}]+)\}\}/g, "_$1_"));
    return u.pathname + u.search;
  } catch {
    return url;
  }
};

/**
 * Bottom status line, written like a raw HTTP response: protocol on the
 * left, the most recent run as `METHOD /path → status · time · size`,
 * env + graph stats + zoom on the right.
 */
export const StatusBar = () => {
  const graph = useActiveGraph();
  const runs = useRunStore((s) => s.runs);
  const activeEnv = useEnvironmentStore((s) =>
    s.environments.find((e) => e.id === s.activeEnvironmentId)
  );
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const tidyGraph = useCanvasStore((s) => s.tidyGraph);

  // Fit never drops below readable zoom — big trees are panned, not
  // shrunk into eye strain.
  const FIT = { padding: 0.2, minZoom: 0.65, maxZoom: 1 };

  const tidy = () => {
    tidyGraph();
    void fitView({ ...FIT, duration: 350 });
  };

  const latest = useMemo(() => {
    let best: { nodeId: string; finishedAt: number } | null = null;
    let pending = false;
    for (const [nodeId, run] of Object.entries(runs)) {
      if (run.status === "pending") pending = true;
      if (run.finishedAt && (!best || run.finishedAt > best.finishedAt)) {
        best = { nodeId, finishedAt: run.finishedAt };
      }
    }
    if (!best) return { pending, run: null, node: null };
    const node = graph.nodes.find((n) => n.id === best!.nodeId);
    return {
      pending,
      run: runs[best.nodeId],
      node: node?.type === "request" ? (node.data as RequestNodeData) : null,
    };
  }, [runs, graph.nodes]);

  const requestCount = graph.nodes.filter((n) => n.type === "request").length;
  const bindingCount = graph.edges.filter((e) => e.data).length;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 flex h-7 items-center gap-3 border-t border-border/50 bg-bg-secondary/90 px-3 font-mono text-[12px] text-muted backdrop-blur-sm">
      <span className="tracking-[0.08em] text-secondary">JUSTAPI/1.1</span>

      {latest.pending ? (
        <span className="animate-pulse text-accent">sending…</span>
      ) : latest.run?.response && latest.node ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-secondary">{latest.node.snapshot.method}</span>
          <span className="truncate">
            {pathOf(latest.node.snapshot.urlRaw || latest.node.snapshot.url)}
          </span>
          <span>→</span>
          <span className={cn("font-semibold", statusTone(latest.run.response.status))}>
            {latest.run.response.status || "ERR"}
          </span>
          <span>
            · {latest.run.response.time}ms · {formatSize(latest.run.response.size)}
          </span>
        </span>
      ) : latest.run?.error ? (
        <span className="truncate text-danger">{latest.run.error}</span>
      ) : (
        <span>ready — drag between handles to chain requests</span>
      )}

      <div className="flex-1" />

      {activeEnv && (
        <span className="hidden sm:inline">
          env <span className="text-secondary">{activeEnv.name.toLowerCase()}</span>
        </span>
      )}
      <span className="hidden sm:inline">
        {requestCount} node{requestCount === 1 ? "" : "s"} · {bindingCount} bind
        {bindingCount === 1 ? "" : "s"}
      </span>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={tidy}
          className="rounded p-1 text-secondary hover:text-primary hover:bg-bg/60"
          title="Tidy — auto-arrange the tree"
        >
          <LayoutGrid className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => void zoomOut({ duration: 150 })}
          className="rounded p-1 text-secondary hover:text-primary hover:bg-bg/60"
          title="Zoom out"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-8 text-center text-secondary">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => void zoomIn({ duration: 150 })}
          className="rounded p-1 text-secondary hover:text-primary hover:bg-bg/60"
          title="Zoom in"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => void fitView({ ...FIT, duration: 300 })}
          className="ml-0.5 rounded p-1 text-secondary hover:text-primary hover:bg-bg/60"
          title="Fit view"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
