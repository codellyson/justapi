"use client";

import { executeRequest } from "./execute-request";
import { useEnvironmentStore } from "../stores/use-environment-store";
import { extractFromResponse, extractedToString } from "./get-path";
import { useCanvasStore } from "./use-canvas-store";
import { useRunStore, abortControllers } from "./use-run-store";
import type {
  CanvasGraph,
  CanvasNode,
  RequestNodeData,
  EnvNodeData,
  BindingEdgeData,
} from "./types";

const activeGraph = (): CanvasGraph | null => {
  const s = useCanvasStore.getState();
  return s.graphs[s.activeGraphId] ?? null;
};

const nodeById = (g: CanvasGraph, id: string): CanvasNode | undefined =>
  g.nodes.find((n) => n.id === id);

const isRequestNode = (n: CanvasNode | undefined): boolean =>
  n?.type === "request";

/**
 * Topological order of the request-node subgraph upstream of (and
 * including) `targetId`. Env nodes are excluded — they contribute
 * variables, not execution steps. Returns the cycle path on failure.
 */
export const upstreamOrder = (
  targetId: string,
  g: CanvasGraph
): { order: string[] } | { cycle: string[] } => {
  // Collect the upstream closure over request→request edges.
  const upstream = new Set<string>([targetId]);
  const queue = [targetId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const e of g.edges) {
      if (e.target !== id) continue;
      if (!isRequestNode(nodeById(g, e.source))) continue;
      if (!upstream.has(e.source)) {
        upstream.add(e.source);
        queue.push(e.source);
      }
    }
  }

  // Kahn over the induced subgraph.
  const indegree = new Map<string, number>();
  upstream.forEach((id) => indegree.set(id, 0));
  const edges = g.edges.filter(
    (e) => upstream.has(e.source) && upstream.has(e.target)
  );
  for (const e of edges) {
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
  }
  // Dedupe parallel edges for indegree purposes? No — Kahn works as long
  // as we decrement once per edge.
  const ready = [...upstream].filter((id) => (indegree.get(id) ?? 0) === 0);
  const order: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift()!;
    order.push(id);
    for (const e of edges) {
      if (e.source !== id) continue;
      const d = (indegree.get(e.target) ?? 0) - 1;
      indegree.set(e.target, d);
      if (d === 0) ready.push(e.target);
    }
  }
  if (order.length !== upstream.size) {
    const cycle = [...upstream].filter((id) => (indegree.get(id) ?? 0) > 0);
    return { cycle };
  }
  return { order };
};

/**
 * Variables visible to a node, lowest precedence first:
 * active environment → connected env nodes → incoming variable bindings.
 */
export const collectVariables = (
  nodeId: string,
  g: CanvasGraph
): Record<string, string> => {
  const vars: Record<string, string> = {
    ...(useEnvironmentStore.getState().getActiveEnvironment()?.variables ?? {}),
  };

  const envs = useEnvironmentStore.getState().environments;
  const runs = useRunStore.getState().runs;

  for (const e of g.edges) {
    if (e.target !== nodeId) continue;
    const source = nodeById(g, e.source);
    if (source?.type === "env") {
      const envId = (source.data as EnvNodeData).environmentId;
      const env = envs.find((x) => x.id === envId);
      if (env) Object.assign(vars, env.variables);
    }
  }

  for (const e of g.edges) {
    if (e.target !== nodeId) continue;
    const data = e.data as BindingEdgeData | undefined;
    if (!data || data.targetKind !== "variable" || !data.targetName) continue;
    const run = runs[e.source];
    if (!run?.response) continue;
    vars[data.targetName] = extractedToString(
      extractFromResponse(run.response, data.sourcePath)
    );
  }

  return vars;
};

/** Headers bound via `targetKind: "header"` edges, merged over snapshot headers. */
export const collectBoundHeaders = (
  nodeId: string,
  g: CanvasGraph
): Record<string, string> => {
  const headers: Record<string, string> = {};
  const runs = useRunStore.getState().runs;
  for (const e of g.edges) {
    if (e.target !== nodeId) continue;
    const data = e.data as BindingEdgeData | undefined;
    if (!data || data.targetKind !== "header" || !data.targetName) continue;
    const run = runs[e.source];
    if (!run?.response) continue;
    headers[data.targetName] = extractedToString(
      extractFromResponse(run.response, data.sourcePath)
    );
  }
  return headers;
};

const runSingle = async (nodeId: string, g: CanvasGraph): Promise<boolean> => {
  const node = nodeById(g, nodeId);
  if (node?.type !== "request") return false;
  const data = node.data as RequestNodeData;

  const runStore = useRunStore.getState();
  runStore.setPending(nodeId);

  abortControllers.get(nodeId)?.abort();
  const controller = new AbortController();
  abortControllers.set(nodeId, controller);

  const variables = collectVariables(nodeId, g);
  const boundHeaders = collectBoundHeaders(nodeId, g);
  const snapshot = {
    ...data.snapshot,
    headers: { ...data.snapshot.headers, ...boundHeaders },
  };

  try {
    const response = await executeRequest(snapshot, variables, controller.signal);
    if (controller.signal.aborted) return false;
    if (response.status === 0) {
      useRunStore.getState().setError(nodeId, response.statusText, response);
      return false;
    }
    useRunStore.getState().setSuccess(nodeId, response);
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      useRunStore.getState().setError(nodeId, "cancelled");
      return false;
    }
    const msg = err instanceof Error ? err.message : "Request failed";
    useRunStore.getState().setError(nodeId, msg);
    return false;
  } finally {
    if (abortControllers.get(nodeId) === controller) {
      abortControllers.delete(nodeId);
    }
  }
};

/**
 * Run a node, resolving upstream request dependencies first in topological
 * order. Cached successful upstream responses are reused unless `force`.
 * The target node itself always runs. Stops the chain on upstream failure.
 */
export const runNode = async (
  nodeId: string,
  opts?: { force?: boolean }
): Promise<void> => {
  const g = activeGraph();
  if (!g) return;

  const result = upstreamOrder(nodeId, g);
  if ("cycle" in result) {
    const names = result.cycle
      .map((id) => {
        const n = nodeById(g, id);
        const d = n?.data as RequestNodeData | undefined;
        return d?.name || d?.snapshot.urlRaw || id.slice(0, 6);
      })
      .join(" → ");
    useRunStore.getState().setError(nodeId, `cycle detected: ${names}`);
    return;
  }

  const runs = useRunStore.getState().runs;
  for (const id of result.order) {
    const isTarget = id === nodeId;
    if (!isTarget && !opts?.force && runs[id]?.status === "success") continue;
    const ok = await runSingle(id, g);
    if (!ok && !isTarget) return; // upstream failed/aborted — stop the chain
    if (isTarget) return;
  }
};

/** Force-re-run the whole upstream closure plus the node itself. */
export const runChain = (nodeId: string): Promise<void> =>
  runNode(nodeId, { force: true });
