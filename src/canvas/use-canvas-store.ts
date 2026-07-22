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
  EnvNodeData,
  CollectionNodeData,
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
  addEnvNode: (position: XYPosition, environmentId: string) => string;
  addCollectionNode: (position: XYPosition, collectionId: string) => string;
  /** Spawn request nodes linked (dataless edges) from a source node —
   *  used by collection nodes to fan out their saved requests. */
  spawnLinked: (
    sourceNodeId: string,
    items: { position: XYPosition; snapshot: CardRequestSnapshot; name: string }[]
  ) => void;
  updateNodeData: (
    id: string,
    patch:
      | Partial<RequestNodeData>
      | Partial<EnvNodeData>
      | Partial<CollectionNodeData>
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
        // Env and collection sources carry no binding data — they mean
        // "uses this environment" / "spawned from this collection".
        const silent =
          sourceNode?.type === "env" || sourceNode?.type === "collection";
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
      addEnvNode: (position, environmentId) => {
        const id = uid();
        const node: CanvasNode = {
          id,
          type: "env",
          position,
          data: { environmentId },
        };
        set((s) => withActive(s, (g) => ({ nodes: [...g.nodes, node] })));
        return id;
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
      spawnLinked: (sourceNodeId, items) => {
        const nodes: RequestNode[] = items.map((it) => ({
          id: uid(),
          type: "request",
          position: it.position,
          data: {
            name: it.name,
            // Copy so node edits never mutate the saved collection entry.
            snapshot: {
              ...it.snapshot,
              headers: { ...it.snapshot.headers },
              authConfig: { ...it.snapshot.authConfig },
            },
            collapsed: true,
          },
        }));
        const edges: BindingEdge[] = nodes.map((n) => ({
          id: uid(),
          source: sourceNodeId,
          target: n.id,
          type: "binding",
          data: undefined,
        }));
        set((s) =>
          withActive(s, (g) => ({
            nodes: [...g.nodes, ...nodes],
            edges: [...g.edges, ...edges],
          }))
        );
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
      version: 1,
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
