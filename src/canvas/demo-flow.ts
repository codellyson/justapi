import type { FlowSpec } from "./flow-spec";

/**
 * The curated flow the marketing embed always shows, independent of any saved
 * canvas. It declares no `environment`, so materializing it touches nothing but
 * the canvas store (which is no-write in the embed). URLs are illustrative — the
 * embed is read-only and never runs, so {{token}}/{{todoId}} simply render as
 * the templating they demonstrate.
 */
export const DEMO_FLOW: FlowSpec = {
  justapiFlow: 1,
  name: "Demo · auth & todos",
  requests: [
    {
      id: "login",
      name: "log in",
      method: "POST",
      url: "https://api.acme.dev/login",
      body: {
        type: "json",
        content: '{"email":"you@acme.dev","password":"••••••••"}',
      },
      captures: [{ path: "data.token", var: "token" }],
      asserts: [
        { path: "status", op: "equals", value: "200" },
        { path: "data.token", op: "exists" },
      ],
    },
    {
      id: "create",
      name: "create todo",
      method: "POST",
      url: "https://api.acme.dev/todos",
      auth: { type: "bearer", token: "{{token}}" },
      body: { type: "json", content: '{"title":"Ship the graph"}' },
      bindings: [
        { from: "login", path: "data.token", as: "variable", name: "token" },
      ],
      captures: [{ path: "data.id", var: "todoId" }],
      asserts: [
        { path: "status", op: "equals", value: "201" },
        { path: "data.id", op: "exists" },
      ],
    },
    {
      id: "read",
      name: "read it back",
      method: "GET",
      url: "https://api.acme.dev/todos/{{todoId}}",
      auth: { type: "bearer", token: "{{token}}" },
      bindings: [
        { from: "create", path: "data.id", as: "variable", name: "todoId" },
      ],
      asserts: [{ path: "status", op: "equals", value: "200" }],
    },
  ],
};
