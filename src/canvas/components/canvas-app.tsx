"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useRunStore } from "../use-run-store";
import { settlePosition } from "../layout";
import { runNode } from "../engine";
import { loadSharedSnapshot } from "../share";
import { useAgentSync } from "../use-agent-sync";
import { useSession } from "../../lib/auth-client";
import { isEmbedded } from "../embedded";
import { materializeFlow } from "../materialize";
import { makeDemoFlow } from "../demo-flow";
import { DemoOverlay } from "./demo-overlay";
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
  const { screenToFlowPosition, fitView, setViewport: applyViewport, setCenter, getZoom } =
    useReactFlow();
  const tidyGraph = useCanvasStore((s) => s.tidyGraph);

  // Live preview inside the marketing-page iframe: read-only, no bridge, and
  // seeded with a curated demo flow instead of the visitor's saved canvas.
  const embedded = useMemo(() => isEmbedded(), []);

  useEffect(() => {
    if (!embedded) return;
    materializeFlow(makeDemoFlow(`${window.location.origin}/api/sample`));
    // The demo is added after React Flow's initial (empty-graph) fitView, which
    // doesn't re-fire on graph changes — so once the new nodes have mounted and
    // measured, arrange and frame them (what the tidy button does manually).
    const t = setTimeout(() => {
      tidyGraph();
      void fitView({ padding: 0.2, minZoom: 0.5, maxZoom: 1, duration: 300 });
    }, 250);
    return () => clearTimeout(t);
  }, [embedded, tidyGraph, fitView]);

  // After the initial mount, React Flow's fitView prop doesn't re-fire when the
  // active graph changes — an agent materializes a flow, or you switch canvases.
  // Restore that graph's saved view, or frame it if it has none. (No re-layout,
  // so a hand-arranged board is never reshuffled.)
  const prevGraphIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (embedded) return;
    const prev = prevGraphIdRef.current;
    prevGraphIdRef.current = graph.id;
    if (prev === null || prev === graph.id) return;
    const vp = useCanvasStore.getState().graphs[graph.id]?.viewport;
    if (vp) {
      void applyViewport(vp, { duration: 200 });
      return;
    }
    const t = setTimeout(() => {
      void fitView({ padding: 0.2, minZoom: 0.65, maxZoom: 1, duration: 250 });
    }, 150);
    return () => clearTimeout(t);
  }, [graph.id, embedded, applyViewport, fitView]);

  // Follow the run: pan the camera node-by-node as the flow executes, so the
  // human watches it move through the tree. Subscribing to the run store (vs a
  // React effect on `runs`) catches every pending transition even when requests
  // finish faster than React re-renders; a paced queue dwells on each node so a
  // fast flow doesn't skip straight to the last one. Only request nodes are
  // followed — the origin stays pending for the whole flow. Pans, never zooms.
  // Runs in the embed too, so the demo play button gets the same follow.
  useEffect(() => {
    const queue: string[] = [];
    const seen = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let runActive = false;
    // Captured once per run so rapid pans never read a mid-animation zoom and
    // drift the camera; we only pan, so the zoom stays exactly where it started.
    let runZoom = 1;

    const centerOn = (id: string) => {
      const n = useCanvasStore
        .getState()
        .graphs[graph.id]?.nodes.find((x) => x.id === id);
      if (!n) return;
      const w = n.measured?.width ?? n.width ?? 320;
      const h = n.measured?.height ?? n.height ?? 120;
      void setCenter(n.position.x + w / 2, n.position.y + h / 2, {
        zoom: runZoom,
        duration: 350,
      });
    };

    const advance = () => {
      const id = queue.shift();
      if (!id) {
        timer = null;
        return;
      }
      centerOn(id);
      timer = setTimeout(advance, 550);
    };

    let prev = useRunStore.getState().runs;
    const unsub = useRunStore.subscribe((state) => {
      const next = state.runs;
      const anyPending = Object.values(next).some((r) => r.status === "pending");
      if (anyPending && !runActive) {
        // A fresh run started — reset the walk and lock in a comfortable zoom
        // (so the movement is visible even from a zoomed-out view).
        runActive = true;
        seen.clear();
        queue.length = 0;
        runZoom = Math.min(Math.max(getZoom(), 0.8), 1.4);
        // Begin at the origin so a whole-flow run always pans back to the top
        // of the tree first. Only runFlow marks the origin pending — a single
        // node run won't, and shouldn't jump to the origin.
        const origin = useCanvasStore
          .getState()
          .graphs[graph.id]?.nodes.find((n) => n.type === "collection");
        if (origin && next[origin.id]?.status === "pending") {
          seen.add(origin.id);
          queue.push(origin.id);
          if (!timer) advance();
        }
      }
      for (const id in next) {
        if (
          next[id]?.status === "pending" &&
          prev[id]?.status !== "pending" &&
          !seen.has(id)
        ) {
          const node = useCanvasStore
            .getState()
            .graphs[graph.id]?.nodes.find((n) => n.id === id);
          if (node?.type === "request") {
            seen.add(id);
            queue.push(id);
            if (!timer) advance();
          }
        }
      }
      if (!anyPending) runActive = false;
      prev = next;
    });

    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [graph.id, setCenter, getZoom]);

  // Agents push flows and run requests through the local bridge; this
  // browser is where they materialize and execute. Signed-in only (the
  // bridge is account-scoped), and never from the embedded preview.
  const { data: session } = useSession();
  useAgentSync(!embedded && Boolean(session));

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
      {/* main row: rail · docked pane · canvas · docked drawer.
          The embed hides all chrome and shows only the canvas. */}
      <div className="flex min-h-0 flex-1">
        {!embedded && (
          <>
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
          </>
        )}

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
            deleteKeyCode={embedded ? null : ["Backspace", "Delete"]}
            nodesDraggable={!embedded}
            nodesConnectable={!embedded}
            elementsSelectable={!embedded}
            minZoom={0.15}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={30} size={1} />
          </ReactFlow>

          {!embedded && <ControlCluster />}
          {embedded && <DemoOverlay />}
          {!embedded && graph.nodes.length === 0 && (
            <EmptyState onOpenImport={() => setImportOpen(true)} />
          )}
        </div>

        {!embedded && (
          <div
            className={cn(
              "flex flex-none overflow-hidden transition-[width] duration-200 ease-out",
              specOpen ? "w-[380px]" : "w-0"
            )}
          >
            {specMounted && <SpecDrawer onClose={() => setSpecOpen(false)} />}
          </div>
        )}
      </div>

      {!embedded && <StatusBar />}

      {!embedded && importOpen && (
        <ImportDialog onClose={() => setImportOpen(false)} />
      )}
      {!embedded && <Tour startSignal={tourSignal} />}
    </div>
  );
};

export const CanvasApp = () => (
  <ReactFlowProvider>
    <CanvasInner />
  </ReactFlowProvider>
);

export default CanvasApp;
