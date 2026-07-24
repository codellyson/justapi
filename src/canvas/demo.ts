import type { FlowSpec } from "./flow-spec";
import { materializeFlow, findFlowOrigin } from "./materialize";
import { useCanvasStore } from "./use-canvas-store";

/** The demo tree: three chained requests against a public API, with a
 *  binding and asserts — everything the tool is about, in one run. */
export const DEMO_SPEC: FlowSpec = {
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

/** Make the demo board exist and active, idempotently (reused by name).
 *  Returns the origin node id so callers can fit/run it. */
export const ensureDemoFlow = (): { originId: string } => {
  const existing = findFlowOrigin(DEMO_SPEC.name);
  if (existing) {
    useCanvasStore.getState().setActiveGraph(existing.graphId);
    return { originId: existing.originId };
  }
  return materializeFlow(DEMO_SPEC);
};
