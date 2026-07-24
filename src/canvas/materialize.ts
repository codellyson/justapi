"use client";

import type { XYPosition } from "@xyflow/react";
import { useCanvasStore } from "./use-canvas-store";
import { useEnvironmentStore } from "../stores/use-environment-store";
import { flowSlug } from "./flow-spec";
import type { FlowSpec, FlowRequest } from "./flow-spec";
import type {
  CanvasNode,
  BindingEdge,
  RequestNodeData,
  CardRequestSnapshot,
} from "./types";

const uid = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const X_GAP = 560;
const Y_GAP = 210;

const authToSnapshot = (
  req: FlowRequest
): Pick<CardRequestSnapshot, "authType" | "authConfig"> => {
  const a = req.auth;
  if (!a) return { authType: "none", authConfig: {} };
  if (a.type === "bearer") {
    return { authType: "bearer", authConfig: { bearerToken: a.token } };
  }
  if (a.type === "basic") {
    return {
      authType: "basic",
      authConfig: { username: a.username, password: a.password },
    };
  }
  return {
    authType: "api-key",
    authConfig: { apiKey: a.key, apiKeyHeader: a.header ?? "X-Api-Key" },
  };
};

/**
 * Materialize a flow spec onto the board: upsert the collection and
 * environment by name, rebuild the flow's graph (one canvas per flow,
 * named after it), and switch to it. Re-upserts preserve positions of
 * requests the agent kept (matched by spec id).
 */
export const materializeFlow = (
  spec: FlowSpec
): { graphId: string; originId: string } => {
  const canvas = useCanvasStore.getState();
  const envStore = useEnvironmentStore.getState();

  // Environment (optional): find by name, create if missing, merge vars.
  let environmentId: string | null = null;
  if (spec.environment) {
    let env = envStore.environments.find(
      (e) => e.name.toLowerCase() === spec.environment!.name.toLowerCase()
    );
    if (!env) {
      envStore.addEnvironment({
        name: spec.environment.name,
        variables: {},
      });
      env = useEnvironmentStore
        .getState()
        .environments.find(
          (e) =>
            e.name.toLowerCase() === spec.environment!.name.toLowerCase()
        );
    }
    if (env) {
      environmentId = env.id;
      if (spec.environment.variables) {
        useEnvironmentStore.getState().updateEnvironment(env.id, {
          variables: { ...env.variables, ...spec.environment.variables },
        });
      }
    }
  }

  // One canvas per flow, named after it.
  const graphName = spec.name;
  let graph = Object.values(canvas.graphs).find(
    (g) => g.name.toLowerCase() === graphName.toLowerCase()
  );
  const graphId = graph?.id ?? canvas.createGraph(graphName);
  graph = useCanvasStore.getState().graphs[graphId];

  // Keep positions the agent/user already arranged (matched by specId;
  // origin keeps its spot too).
  const oldPositions = new Map<string, XYPosition>();
  let originId: string | null = null;
  let originPosition: XYPosition = { x: 0, y: 0 };
  for (const n of graph.nodes) {
    if (n.type === "collection") {
      originId = n.id;
      originPosition = n.position;
    } else if (n.type === "request") {
      const sid = (n.data as RequestNodeData).specId;
      if (sid) oldPositions.set(sid, n.position);
    }
  }
  if (!originId) originId = uid();

  // Layout: BFS depth from the origin; siblings stack per depth.
  const byId = new Map(spec.requests.map((r) => [r.id, r]));
  const parentOf = (r: FlowRequest): string | null =>
    r.after ?? r.bindings?.[0]?.from ?? null;
  const depthOf = (r: FlowRequest, seen = new Set<string>()): number => {
    const p = parentOf(r);
    if (!p || seen.has(r.id)) return 0;
    const parent = byId.get(p);
    if (!parent) return 0;
    seen.add(r.id);
    return depthOf(parent, seen) + 1;
  };
  const perDepthCount = new Map<number, number>();

  // Tree-wide defaults ride on the origin (headers under each request's
  // own; auth for requests that don't set their own).
  const defaultAuth = spec.defaults?.auth
    ? authToSnapshot({ auth: spec.defaults.auth } as FlowRequest)
    : null;
  const nodes: CanvasNode[] = [
    {
      id: originId,
      type: "collection",
      position: originPosition,
      data: {
        name: spec.name,
        environmentId,
        ...(spec.defaults?.headers
          ? { headers: { ...spec.defaults.headers } }
          : {}),
        ...(defaultAuth
          ? {
              authType: defaultAuth.authType,
              authConfig: defaultAuth.authConfig,
            }
          : {}),
      },
    },
  ];
  const edges: BindingEdge[] = [];
  const nodeIdBySpec = new Map<string, string>();

  for (const r of spec.requests) {
    const depth = depthOf(r) + 1;
    const index = perDepthCount.get(depth) ?? 0;
    perDepthCount.set(depth, index + 1);
    const position = oldPositions.get(r.id) ?? {
      x: originPosition.x + depth * X_GAP,
      y: originPosition.y + index * Y_GAP,
    };
    const nodeId = uid();
    nodeIdBySpec.set(r.id, nodeId);
    const snapshot: CardRequestSnapshot = {
      method: r.method,
      url: r.url,
      urlRaw: r.url,
      headers: { ...(r.headers ?? {}) },
      body: r.body?.content ?? null,
      bodyType: r.body ? r.body.type : "none",
      ...authToSnapshot(r),
    };
    nodes.push({
      id: nodeId,
      type: "request",
      position,
      data: {
        name: r.name ?? r.id,
        snapshot,
        collapsed: true,
        specId: r.id,
      },
    });
  }

  for (const r of spec.requests) {
    const nodeId = nodeIdBySpec.get(r.id)!;
    const bindings = r.bindings ?? [];
    const boundSources = new Set<string>();
    for (const b of bindings) {
      const sourceNodeId = nodeIdBySpec.get(b.from);
      if (!sourceNodeId) continue;
      boundSources.add(b.from);
      edges.push({
        id: uid(),
        source: sourceNodeId,
        target: nodeId,
        type: "binding",
        data: {
          sourcePath: b.path,
          targetKind: b.as ?? "variable",
          targetName: b.name,
        },
      });
    }
    // Sequencing parent: `after` (if not already an edge via a binding),
    // else the origin when nothing upstream exists.
    if (r.after && !boundSources.has(r.after)) {
      const sourceNodeId = nodeIdBySpec.get(r.after);
      if (sourceNodeId) {
        edges.push({
          id: uid(),
          source: sourceNodeId,
          target: nodeId,
          type: "binding",
          data: undefined,
        });
      }
    } else if (!r.after && bindings.length === 0) {
      edges.push({
        id: uid(),
        source: originId,
        target: nodeId,
        type: "binding",
        data: undefined,
      });
    }

    // Asserts hang below their request.
    const asserts = r.asserts ?? [];
    if (asserts.length > 0) {
      const reqNode = nodes.find((n) => n.id === nodeId)!;
      const assertId = uid();
      nodes.push({
        id: assertId,
        type: "assert",
        position: {
          x: reqNode.position.x + 50,
          y: reqNode.position.y + 120,
        },
        data: {
          checks: asserts.map((a) => ({
            id: uid(),
            path: a.path,
            op: a.op,
            value: a.value ?? "",
          })),
        },
      });
      edges.push({
        id: uid(),
        source: nodeId,
        target: assertId,
        type: "binding",
        data: undefined,
      });
    }
  }

  useCanvasStore.setState((s) => ({
    graphs: {
      ...s.graphs,
      [graphId]: { ...s.graphs[graphId], name: graphName, nodes, edges },
    },
    activeGraphId: graphId,
  }));

  return { graphId, originId };
};

/** Resolve a flow's origin node on the board by flow name/slug. */
export const findFlowOrigin = (
  name: string
): { graphId: string; originId: string } | null => {
  const s = useCanvasStore.getState();
  const slug = flowSlug(name);
  const graph = Object.values(s.graphs).find(
    (g) => flowSlug(g.name) === slug
  );
  if (!graph) return null;
  const origin = graph.nodes.find((n) => n.type === "collection");
  return origin ? { graphId: graph.id, originId: origin.id } : null;
};
