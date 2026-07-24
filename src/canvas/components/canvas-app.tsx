"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useReactFlow,
  type NodeMouseHandler,
  type OnConnectEnd,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "../canvas.css";
import { cn } from "../../utils/cn";

import { useCanvasStore, useActiveGraph } from "../use-canvas-store";
import { settlePosition } from "../layout";
import { runNode } from "../engine";
import { loadSharedSnapshot } from "../share";
import { useAgentSync } from "../use-agent-sync";
import { RequestNodeCard } from "./request-node";
import { CollectionNodeCard } from "./collection-node";
import { AssertNodeCard } from "./assert-node";
import { BindingEdgeView } from "./binding-edge";
import { Rail } from "./rail";
import { CollectionsPane } from "./collections-pane";
import { CanvasPane } from "./canvas-pane";
import { SnippetsPane } from "./snippets-pane";
import { ThemePane } from "./theme-pane";
import { StatusBar } from "./status-bar";
import { useSnippetsStore } from "../use-snippets-store";
import { ImportDialog } from "./import-dialog";
import { EmptyState } from "./empty-state";
import { SpecDrawer } from "./spec-drawer";
import { ControlCluster } from "./control-cluster";
import { Tour } from "./tour";

// Constant identity — React Flow warns (and re-mounts nodes) otherwise.
const nodeTypes = {
  request: RequestNodeCard,
  collection: CollectionNodeCard,
  assert: AssertNodeCard,
};
const edgeTypes = { binding: BindingEdgeView };

const CanvasInner = () => {
  const graph = useActiveGraph();
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const setInspectedEdge = useCanvasStore((s) => s.setInspectedEdge);

  const [importOpen, setImportOpen] = useState(false);
  const [leftPane, setLeftPane] = useState<
    null | "collections" | "canvases" | "snippets" | "theme"
  >(null);
  const [specOpen, setSpecOpen] = useState(false);
  const [tourSignal, setTourSignal] = useState(0);
  const togglePane = (
    pane: "collections" | "canvases" | "snippets" | "theme"
  ) => setLeftPane((p) => (p === pane ? null : pane));

  // Keep pane/drawer content mounted through the collapse animation, so
  // closing slides out instead of vanishing.
  const [displayedPane, setDisplayedPane] = useState(leftPane);
  useEffect(() => {
    if (leftPane) {
      setDisplayedPane(leftPane);
      return;
    }
    const t = setTimeout(() => setDisplayedPane(null), 200);
    return () => clearTimeout(t);
  }, [leftPane]);

  const [specMounted, setSpecMounted] = useState(false);
  useEffect(() => {
    if (specOpen) {
      setSpecMounted(true);
      return;
    }
    const t = setTimeout(() => setSpecMounted(false), 200);
    return () => clearTimeout(t);
  }, [specOpen]);

  // One-time migration: legacy saved requests (from when collections
  // doubled as a request library) become global snippets. Read straight
  // from localStorage so the retired collections store can be deleted.
  useEffect(() => {
    const snip = useSnippetsStore.getState();
    if (snip.migrated) return;
    try {
      const raw = localStorage.getItem("justapi-canvas-collections");
      const parsed = raw ? JSON.parse(raw) : null;
      const legacy = (parsed?.state?.collections ?? []).flatMap(
        (c: { requests?: { name: string; snapshot: unknown; createdAt: number }[] }) =>
          (c.requests ?? []).map((r) => ({
            name: r.name,
            snapshot: r.snapshot as never,
            createdAt: r.createdAt,
          }))
      );
      snip.seedFromLegacy(legacy);
    } catch {
      snip.seedFromLegacy([]);
    }
  }, []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Agents push flows and run requests through the local bridge; this
  // browser is where they materialize and execute.
  useAgentSync();

  const onNodeClick: NodeMouseHandler = useCallback(
    (_e, node) => setSelectedNodeId(node.id),
    []
  );

  // Dropping a wire on empty canvas grows the tree: a new blank request
  // appears right there, already wired from wherever the drag started.
  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (connectionState.isValid) return;
      const fromNode = connectionState.fromNode;
      if (!fromNode || connectionState.fromHandle?.type !== "source") return;
      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0] : event;
      const position = screenToFlowPosition({ x: clientX, y: clientY });
      useCanvasStore.getState().addLinkedRequest(fromNode.id, position);
    },
    [screenToFlowPosition]
  );

  // A node dropped onto another slides to the nearest clear spot —
  // the board never ends up with nodes stacked on top of each other.
  // Only the grabbed node is settled; its selection group (if any)
  // translates by the same delta so relative layout survives.
  const onNodeDragStop: OnNodeDrag = useCallback((_e, node) => {
    const state = useCanvasStore.getState();
    const g = state.graphs[state.activeGraphId];
    if (!g) return;
    const current = g.nodes.find((n) => n.id === node.id);
    if (!current) return;
    const group = node.selected
      ? new Set(g.nodes.filter((n) => n.selected).map((n) => n.id))
      : new Set([node.id]);
    const others = g.nodes.filter((n) => !group.has(n.id));
    const pos = settlePosition(others, current.position, current.type);
    const dx = pos.x - current.position.x;
    const dy = pos.y - current.position.y;
    if (dx === 0 && dy === 0) return;
    state.onNodesChange(
      g.nodes
        .filter((n) => group.has(n.id))
        .map((n) => ({
          id: n.id,
          type: "position" as const,
          position: { x: n.position.x + dx, y: n.position.y + dy },
          dragging: false,
        }))
    );
  }, []);

  // Share links (`/?s=ID`, incl. redirected legacy /playground links):
  // spawn a request node from the shared config and run it.
  useEffect(() => {
    void loadSharedSnapshot().then((snapshot) => {
      if (!snapshot) return;
      const state = useCanvasStore.getState();
      const id = state.addRequestNode({ x: 0, y: 0 }, snapshot, "shared");
      void runNode(id);
    });
  }, []);

  // Cmd/Ctrl+Enter runs the selected node.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && selectedNodeId) {
        const el = e.target as HTMLElement | null;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
        e.preventDefault();
        void runNode(selectedNodeId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedNodeId]);

  return (
    <div className="justapi-canvas flex h-[100dvh] w-full flex-col bg-bg text-primary">
      {/* main row: rail · docked pane · canvas · docked drawer */}
      <div className="flex min-h-0 flex-1">
        <Rail
          libraryOpen={leftPane === "collections"}
          onToggleLibrary={() => togglePane("collections")}
          onOpenImport={() => setImportOpen(true)}
          specOpen={specOpen}
          onToggleSpec={() => setSpecOpen((o) => !o)}
          canvasesOpen={leftPane === "canvases"}
          onToggleCanvases={() => togglePane("canvases")}
          snippetsOpen={leftPane === "snippets"}
          onToggleSnippets={() => togglePane("snippets")}
          themeOpen={leftPane === "theme"}
          onToggleTheme={() => togglePane("theme")}
          onStartTour={() => setTourSignal((n) => n + 1)}
        />
        <div
          className={cn(
            "flex flex-none overflow-hidden transition-[width] duration-200 ease-out",
            leftPane ? "w-60" : "w-0"
          )}
        >
          {displayedPane === "collections" && <CollectionsPane />}
          {displayedPane === "canvases" && <CanvasPane />}
          {displayedPane === "snippets" && <SnippetsPane />}
          {displayedPane === "theme" && <ThemePane />}
        </div>

        <div className="relative min-w-0 flex-1">
          <ReactFlow
            nodes={graph.nodes}
            edges={graph.edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onPaneClick={() => {
              setInspectedEdge(null);
              setSelectedNodeId(null);
            }}
            onMoveEnd={(_e, viewport) => setViewport(viewport)}
            defaultViewport={graph.viewport ?? undefined}
            fitView={!graph.viewport}
            fitViewOptions={{ padding: 0.25, maxZoom: 1, minZoom: 0.65 }}
            deleteKeyCode={["Backspace", "Delete"]}
            minZoom={0.15}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={30} size={1} />
          </ReactFlow>

          <ControlCluster />
          {graph.nodes.length === 0 && (
            <EmptyState onOpenImport={() => setImportOpen(true)} />
          )}
        </div>

        <div
          className={cn(
            "flex flex-none overflow-hidden transition-[width] duration-200 ease-out",
            specOpen ? "w-[380px]" : "w-0"
          )}
        >
          {specMounted && <SpecDrawer onClose={() => setSpecOpen(false)} />}
        </div>
      </div>

      <StatusBar />

      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}
      <Tour startSignal={tourSignal} />
    </div>
  );
};

export const CanvasApp = () => (
  <ReactFlowProvider>
    <CanvasInner />
  </ReactFlowProvider>
);

export default CanvasApp;
