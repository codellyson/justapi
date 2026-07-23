"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Viewport,
  type XYPosition,
} from "@xyflow/react";
import type { HttpMethod } from "../utils/http";
import type { CardRequestSnapshot } from "./types";
import type {
  CanvasGraph,
  CanvasNode,
  BindingEdge,
  RequestNode,
  RequestNodeData,
  CollectionNodeData,
  AssertNodeData,
  BindingEdgeData,
} from "./types";

const uid = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const emptySnapshot = (
  partial?: Partial<CardRequestSnapshot>
): CardRequestSnapshot => ({
  method: "GET" as HttpMethod,
  url: "",
  urlRaw: "",
  headers: {},
  body: null,
  bodyType: "none",
  authType: "none",
  authConfig: {},
  ...partial,
});

const makeGraph = (name: string): CanvasGraph => ({
  id: uid(),
  name,
  createdAt: Date.now(),
  nodes: [],
  edges: [],
  viewport: null,
});

interface CanvasState {
  graphs: Record<string, CanvasGraph>;
  activeGraphId: string;
  /** Edge whose inspector popover is open (set on connect / label click). */
  inspectedEdgeId: string | null;

  createGraph: (name?: string) => string;
  renameGraph: (id: string, name: string) => void;
  deleteGraph: (id: string) => void;
  /** Remove every node and edge from the active graph. */
  clearGraph: () => void;
  setActiveGraph: (id: string) => void;

  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<BindingEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  setViewport: (viewport: Viewport) => void;

  addRequestNode: (
    position: XYPosition,
    snapshot?: Partial<CardRequestSnapshot>,
    name?: string
  ) => string;
  addRequestNodes: (
    items: { position: XYPosition; snapshot: CardRequestSnapshot; name: string }[]
  ) => void;
  addCollectionNode: (position: XYPosition, collectionId: string) => string;
  /** Add a new blank request node wired from a source node — how a flow
   *  tree grows from its origin (and branches from its requests). */
  addLinkedRequest: (sourceNodeId: string, position: XYPosition) => string;
  /** Hang an assert node off a request to grade its response. */
  addAssertNode: (sourceNodeId: string, position: XYPosition) => string;
  updateNodeData: (
    id: string,
    patch:
      | Partial<RequestNodeData>
      | Partial<CollectionNodeData>
      | Partial<AssertNodeData>
  ) => void;
  updateSnapshot: (id: string, patch: Partial<CardRequestSnapshot>) => void;
  updateEdgeData: (id: string, patch: Partial<BindingEdgeData>) => void;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;
  setInspectedEdge: (id: string | null) => void;
}

const initialGraph = makeGraph("main");

/** Mutate the active graph immutably. */
const withActive = (
  state: CanvasState,
  fn: (g: CanvasGraph) => Partial<CanvasGraph>
): Partial<CanvasState> => {
  const g = state.graphs[state.activeGraphId];
  if (!g) return {};
  return {
    graphs: { ...state.graphs, [g.id]: { ...g, ...fn(g) } },
  };
};

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      graphs: { [initialGraph.id]: initialGraph },
      activeGraphId: initialGraph.id,
      inspectedEdgeId: null,

      createGraph: (name) => {
        const g = makeGraph(name ?? `canvas ${Object.keys(get().graphs).length + 1}`);
        set((s) => ({
          graphs: { ...s.graphs, [g.id]: g },
          activeGraphId: g.id,
        }));
        return g.id;
      },
      renameGraph: (id, name) =>
        set((s) => {
          const g = s.graphs[id];
          if (!g) return {};
          return { graphs: { ...s.graphs, [id]: { ...g, name } } };
        }),
      deleteGraph: (id) =>
        set((s) => {
          const rest = { ...s.graphs };
          delete rest[id];
          let activeGraphId = s.activeGraphId;
          if (Object.keys(rest).length === 0) {
            const g = makeGraph("main");
            rest[g.id] = g;
            activeGraphId = g.id;
          } else if (activeGraphId === id) {
            activeGraphId = Object.keys(rest)[0];
          }
          return { graphs: rest, activeGraphId };
        }),
      clearGraph: () =>
        set((s) => ({
          ...withActive(s, () => ({ nodes: [], edges: [] })),
          inspectedEdgeId: null,
        })),
      setActiveGraph: (id) =>
        set((s) => (s.graphs[id] ? { activeGraphId: id, inspectedEdgeId: null } : {})),

      onNodesChange: (changes) =>
        set((s) =>
          withActive(s, (g) => ({
            nodes: applyNodeChanges(changes, g.nodes),
          }))
        ),
      onEdgesChange: (changes) =>
        set((s) =>
          withActive(s, (g) => ({
            edges: applyEdgeChanges(changes, g.edges),
          }))
        ),
      onConnect: (connection) => {
        if (!connection.source || !connection.target) return;
        const s = get();
        const g = s.graphs[s.activeGraphId];
        if (!g) return;
        if (connection.source === connection.target) return;
        const sourceNode = g.nodes.find((n) => n.id === connection.source);
        const targetNode = g.nodes.find((n) => n.id === connection.target);
        // Origin sources and assert targets carry no binding data —
        // those edges express structure, not value flow.
        const silent =
          sourceNode?.type === "collection" || targetNode?.type === "assert";
        const edge: BindingEdge = {
          id: uid(),
          source: connection.source,
          target: connection.target,
          type: "binding",
          data: silent
            ? undefined
            : { sourcePath: "data.", targetKind: "variable", targetName: "" },
        };
        set((state) => ({
          ...withActive(state, (graph) => ({ edges: [...graph.edges, edge] })),
          // Open the inspector right away for request→request bindings.
          inspectedEdgeId: silent ? state.inspectedEdgeId : edge.id,
        }));
      },
      setViewport: (viewport) =>
        set((s) => withActive(s, () => ({ viewport }))),

      addRequestNode: (position, snapshot, name) => {
        const id = uid();
        const snap = emptySnapshot(snapshot);
        const node: RequestNode = {
          id,
          type: "request",
          position,
          data: {
            name: name ?? "",
            snapshot: snap,
            collapsed: false,
          },
        };
        set((s) => withActive(s, (g) => ({ nodes: [...g.nodes, node] })));
        return id;
      },
      addRequestNodes: (items) => {
        const nodes: RequestNode[] = items.map((it) => ({
          id: uid(),
          type: "request",
          position: it.position,
          data: { name: it.name, snapshot: it.snapshot, collapsed: true },
        }));
        set((s) => withActive(s, (g) => ({ nodes: [...g.nodes, ...nodes] })));
      },
      addCollectionNode: (position, collectionId) => {
        const id = uid();
        const node: CanvasNode = {
          id,
          type: "collection",
          position,
          data: { collectionId },
        };
        set((s) => withActive(s, (g) => ({ nodes: [...g.nodes, node] })));
        return id;
      },
      addLinkedRequest: (sourceNodeId, position) => {
        const s = get();
        const g = s.graphs[s.activeGraphId];
        const source = g?.nodes.find((n) => n.id === sourceNodeId);
        if (!source) return "";
        const nodeId = uid();
        const node: RequestNode = {
          id: nodeId,
          type: "request",
          position,
          data: { name: "", snapshot: emptySnapshot(), collapsed: false },
        };
        // Origin sources wire silently; request sources get a binding
        // shell to fill in later (no inspector popup — the node is blank).
        const silent = source.type === "collection";
        const edge: BindingEdge = {
          id: uid(),
          source: sourceNodeId,
          target: nodeId,
          type: "binding",
          data: silent
            ? undefined
            : { sourcePath: "data.", targetKind: "variable", targetName: "" },
        };
        set((state) =>
          withActive(state, (graph) => ({
            nodes: [...graph.nodes, node],
            edges: [...graph.edges, edge],
          }))
        );
        return nodeId;
      },
      addAssertNode: (sourceNodeId, position) => {
        const s = get();
        const g = s.graphs[s.activeGraphId];
        const source = g?.nodes.find((n) => n.id === sourceNodeId);
        if (!source || source.type !== "request") return "";
        const nodeId = uid();
        const node: CanvasNode = {
          id: nodeId,
          type: "assert",
          position,
          data: {
            checks: [{ id: uid(), path: "status", op: "equals", value: "200" }],
          },
        };
        const edge: BindingEdge = {
          id: uid(),
          source: sourceNodeId,
          target: nodeId,
          type: "binding",
          data: undefined,
        };
        set((state) =>
          withActive(state, (graph) => ({
            nodes: [...graph.nodes, node],
            edges: [...graph.edges, edge],
          }))
        );
        return nodeId;
      },
      updateNodeData: (id, patch) =>
        set((s) =>
          withActive(s, (g) => ({
            nodes: g.nodes.map((n) =>
              n.id === id
                ? ({ ...n, data: { ...n.data, ...patch } } as CanvasNode)
                : n
            ),
          }))
        ),
      updateSnapshot: (id, patch) =>
        set((s) =>
          withActive(s, (g) => ({
            nodes: g.nodes.map((n) => {
              if (n.id !== id || n.type !== "request") return n;
              const data = n.data as RequestNodeData;
              return {
                ...n,
                data: {
                  ...data,
                  snapshot: { ...data.snapshot, ...patch },
                },
              } as CanvasNode;
            }),
          }))
        ),
      updateEdgeData: (id, patch) =>
        set((s) =>
          withActive(s, (g) => ({
            edges: g.edges.map((e) =>
              e.id === id
                ? {
                    ...e,
                    data: {
                      sourcePath: "data.",
                      targetKind: "variable" as const,
                      targetName: "",
                      ...e.data,
                      ...patch,
                    },
                  }
                : e
            ),
          }))
        ),
      removeNode: (id) =>
        set((s) =>
          withActive(s, (g) => ({
            nodes: g.nodes.filter((n) => n.id !== id),
            edges: g.edges.filter((e) => e.source !== id && e.target !== id),
          }))
        ),
      removeEdge: (id) =>
        set((s) => ({
          ...withActive(s, (g) => ({
            edges: g.edges.filter((e) => e.id !== id),
          })),
          inspectedEdgeId: s.inspectedEdgeId === id ? null : s.inspectedEdgeId,
        })),
      setInspectedEdge: (id) => set({ inspectedEdgeId: id }),
    }),
    {
      name: "justapi-canvas",
      version: 2,
      // v2: environments moved onto the origin node — standalone env
      // nodes (and their edges) are stripped from persisted graphs.
      migrate: (persisted, version) => {
        const state = persisted as Pick<CanvasState, "graphs" | "activeGraphId">;
        if (version < 2 && state?.graphs) {
          for (const g of Object.values(state.graphs)) {
            const envIds = new Set(
              g.nodes
                .filter((n) => (n.type as string) === "env")
                .map((n) => n.id)
            );
            if (envIds.size === 0) continue;
            g.nodes = g.nodes.filter((n) => !envIds.has(n.id));
            g.edges = g.edges.filter(
              (e) => !envIds.has(e.source) && !envIds.has(e.target)
            );
          }
        }
        return state;
      },
      partialize: (s) => ({
        graphs: s.graphs,
        activeGraphId: s.activeGraphId,
      }),
    }
  )
);

export const useActiveGraph = (): CanvasGraph => {
  const graphs = useCanvasStore((s) => s.graphs);
  const activeGraphId = useCanvasStore((s) => s.activeGraphId);
  return graphs[activeGraphId] ?? Object.values(graphs)[0];
};
