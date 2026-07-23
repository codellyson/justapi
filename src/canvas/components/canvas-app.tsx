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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "../canvas.css";

import { useCanvasStore, useActiveGraph } from "../use-canvas-store";
import { runNode } from "../engine";
import { loadSharedSnapshot } from "../share";
import { useAgentSync } from "../use-agent-sync";
import { RequestNodeCard } from "./request-node";
import { CollectionNodeCard } from "./collection-node";
import { AssertNodeCard } from "./assert-node";
import { BindingEdgeView } from "./binding-edge";
import { Rail } from "./rail";
import { Library } from "./library";
import { StatusBar } from "./status-bar";
import { ImportDialog } from "./import-dialog";
import { EmptyState } from "./empty-state";
import { ThemeToggle } from "../../components/ui/theme-toggle";

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
  const [libraryOpen, setLibraryOpen] = useState(false);
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
    <div className="justapi-canvas relative h-[100dvh] w-full bg-bg text-primary">
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onPaneClick={() => {
          setInspectedEdge(null);
          setSelectedNodeId(null);
        }}
        onMoveEnd={(_e, viewport) => setViewport(viewport)}
        defaultViewport={graph.viewport ?? undefined}
        fitView={!graph.viewport}
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        deleteKeyCode={["Backspace", "Delete"]}
        minZoom={0.15}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} />
      </ReactFlow>

      <Rail
        libraryOpen={libraryOpen}
        onToggleLibrary={() => setLibraryOpen((o) => !o)}
        onOpenImport={() => setImportOpen(true)}
      />
      {libraryOpen && <Library />}
      <StatusBar />

      {graph.nodes.length === 0 && (
        <EmptyState onOpenImport={() => setImportOpen(true)} />
      )}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}

      <ThemeToggle />
    </div>
  );
};

export const CanvasApp = () => (
  <ReactFlowProvider>
    <CanvasInner />
  </ReactFlowProvider>
);

export default CanvasApp;
