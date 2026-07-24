"use client";

import { useReactFlow } from "@xyflow/react";
import { Plus, Import, Play } from "lucide-react";
import { useCanvasStore } from "../use-canvas-store";
import { materializeFlow, findFlowOrigin } from "../materialize";
import { runFlow } from "../engine";
import type { FlowSpec } from "../flow-spec";

interface EmptyStateProps {
  onOpenImport: () => void;
}

/** The demo tree: three chained requests against a public API, with a
 *  binding and asserts — everything the tool is about, in one run. */
const DEMO_SPEC: FlowSpec = {
  justapiFlow: 1,
  name: "demo: todos",
  environment: {
    name: "demo",
    variables: { base: "https://jsonplaceholder.typicode.com" },
  },
  requests: [
    {
      id: "list",
      name: "list todos",
      method: "GET",
      url: "{{base}}/todos?_limit=3",
      asserts: [{ path: "status", op: "equals", value: "200" }],
    },
    {
      id: "read",
      name: "read the first one",
      method: "GET",
      url: "{{base}}/todos/{{todoId}}",
      bindings: [
        { from: "list", path: "data[0].id", as: "variable", name: "todoId" },
      ],
      asserts: [
        { path: "status", op: "equals", value: "200" },
        { path: "data.id", op: "exists" },
      ],
    },
    {
      id: "create",
      name: "create a todo",
      method: "POST",
      url: "{{base}}/todos",
      body: {
        type: "json",
        content: '{"title":"ship it","completed":false}',
      },
      after: "read",
      asserts: [{ path: "status", op: "equals", value: "201" }],
    },
  ],
};

/** Empty canvas: the fastest path to understanding is watching a flow
 *  execute — origin fans out, wires carry values, asserts flip green. */
export const EmptyState = ({ onOpenImport }: EmptyStateProps) => {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const addRequestNode = useCanvasStore((s) => s.addRequestNode);

  const runDemo = () => {
    // Reuse the demo board if it already exists (idempotent by name).
    const existing = findFlowOrigin(DEMO_SPEC.name);
    const { originId } = existing ?? materializeFlow(DEMO_SPEC);
    if (existing) {
      useCanvasStore.getState().setActiveGraph(existing.graphId);
    }
    // A beat so the tree renders (and fits) before it lights up.
    setTimeout(() => {
      void fitView({ padding: 0.2, minZoom: 0.65, maxZoom: 1, duration: 300 });
      setTimeout(() => void runFlow(originId), 500);
    }, 150);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center pl-12">
      <div className="text-center font-sans">
        <div className="mb-5 select-none font-mono text-[15px] leading-relaxed">
          <span className="text-muted">$</span>{" "}
          <span className="text-success">GET</span>{" "}
          <span className="text-secondary">https://</span>
          <span className="animate-pulse text-accent">▌</span>
        </div>

        <div className="pointer-events-auto flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={runDemo}
            className="flex items-center gap-2 rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-[13px] font-medium text-accent backdrop-blur-sm transition-colors hover:bg-accent hover:text-accent-text"
          >
            <Play className="h-3.5 w-3.5" />
            watch a demo flow run
          </button>

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                addRequestNode(
                  screenToFlowPosition({
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2,
                  })
                )
              }
              className="flex items-center gap-1.5 rounded-md border border-border/60 bg-bg-secondary/80 px-3 py-1.5 text-[12px] text-secondary backdrop-blur-sm transition-colors hover:border-accent/60 hover:text-primary"
            >
              <Plus className="h-3 w-3 text-accent" />
              new request
            </button>
            <button
              type="button"
              onClick={onOpenImport}
              className="flex items-center gap-1.5 rounded-md border border-border/60 bg-bg-secondary/80 px-3 py-1.5 text-[12px] text-secondary backdrop-blur-sm transition-colors hover:border-accent/60 hover:text-primary"
            >
              <Import className="h-3 w-3 text-accent" />
              import curl · fetch · HAR · OpenAPI
            </button>
          </div>
        </div>

        <p className="mt-4 text-[12px] text-muted">
          requests branch from an origin · wires feed one response into the
          next · asserts grade the run
        </p>
      </div>
    </div>
  );
};
