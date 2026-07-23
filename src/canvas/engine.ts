"use client";

import { executeRequest } from "./execute-request";
import { useEnvironmentStore } from "../stores/use-environment-store";
import { extractFromResponse, extractedToString } from "./get-path";
import { evaluateChecks } from "./asserts";
import { useCanvasStore } from "./use-canvas-store";
import { useRunStore, abortControllers } from "./use-run-store";
import type {
  CanvasGraph,
  CanvasNode,
  RequestNodeData,
  EnvNodeData,
  AssertNodeData,
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

/** Kahn's algorithm over the subgraph induced by `members`. */
const topoOrder = (
  members: Set<string>,
  g: CanvasGraph
): { order: string[] } | { cycle: string[] } => {
  const indegree = new Map<string, number>();
  members.forEach((id) => indegree.set(id, 0));
  const edges = g.edges.filter(
    (e) => members.has(e.source) && members.has(e.target)
  );
  for (const e of edges) {
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
  }
  // Dedupe parallel edges for indegree purposes? No — Kahn works as long
  // as we decrement once per edge.
  const ready = [...members].filter((id) => (indegree.get(id) ?? 0) === 0);
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
  if (order.length !== members.size) {
    const cycle = [...members].filter((id) => (indegree.get(id) ?? 0) > 0);
    return { cycle };
  }
  return { order };
};

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
  return topoOrder(upstream, g);
};

/**
 * Topological order of every request node reachable downstream of a
 * flow-source node (following source→request and request→request edges).
 */
export const downstreamOrder = (
  sourceId: string,
  g: CanvasGraph
): { order: string[] } | { cycle: string[] } => {
  const downstream = new Set<string>();
  const queue = [sourceId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const e of g.edges) {
      if (e.source !== id) continue;
      if (!isRequestNode(nodeById(g, e.target))) continue;
      if (!downstream.has(e.target)) {
        downstream.add(e.target);
        queue.push(e.target);
      }
    }
  }
  return topoOrder(downstream, g);
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

/**
 * Run a flow from its source node: execute every request reachable
 * downstream, in topological order, continuing past failures (a test
 * suite reports failures rather than stopping at the first one). The
 * source node's run record carries the suite summary.
 */
export const runFlow = async (sourceId: string): Promise<void> => {
  const g = activeGraph();
  if (!g) return;

  const store = useRunStore.getState();
  const result = downstreamOrder(sourceId, g);
  if ("cycle" in result) {
    store.setSummary(sourceId, "cycle detected in flow", true);
    return;
  }
  if (result.order.length === 0) {
    store.setSummary(sourceId, "nothing wired to this flow", true);
    return;
  }

  store.setPending(sourceId);
  let failed = 0;
  for (const id of result.order) {
    const ok = await runSingle(id, g);
    if (!ok) failed++;
  }

  // Grade the tree's assert nodes against the fresh responses.
  const runs = useRunStore.getState().runs;
  const inFlow = new Set([sourceId, ...result.order]);
  let checksTotal = 0;
  let checksFailed = 0;
  for (const e of g.edges) {
    if (!inFlow.has(e.source)) continue;
    const target = nodeById(g, e.target);
    if (target?.type !== "assert") continue;
    const checks = (target.data as AssertNodeData).checks;
    if (checks.length === 0) continue;
    const { failed: f } = evaluateChecks(
      checks,
      runs[e.source]?.response ?? null
    );
    checksTotal += checks.length;
    checksFailed += f;
    useRunStore
      .getState()
      .setSummary(
        target.id,
        f === 0 ? `${checks.length} ✓` : `${f} of ${checks.length} failed`,
        f > 0
      );
  }

  const parts: string[] = [];
  if (failed === 0 && checksFailed === 0) {
    parts.push(`${result.order.length} passed`);
    if (checksTotal > 0) parts.push(`${checksTotal} checks ✓`);
  } else {
    if (failed > 0) parts.push(`${failed} of ${result.order.length} failed`);
    else parts.push(`${result.order.length} passed`);
    if (checksFailed > 0) parts.push(`${checksFailed} checks failed`);
    else if (checksTotal > 0) parts.push(`${checksTotal} checks ✓`);
  }
  useRunStore
    .getState()
    .setSummary(sourceId, parts.join(" · "), failed > 0 || checksFailed > 0);
};
