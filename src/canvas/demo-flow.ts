import type { FlowSpec } from "./flow-spec";

/**
 * The curated flow the marketing embed always shows, and can actually run when
 * the visitor hits the play overlay. It points at the app's own public sample
 * API (same origin) so it executes for real — login captures a token, the rest
 * chain off it. `base` is passed in as the current origin so it works in dev and
 * on the deployed site alike. In the embed the canvas + environment stores are
 * no-write, so running it touches no real data.
 */
export const makeDemoFlow = (base: string): FlowSpec => ({
  justapiFlow: 1,
  name: "Demo · auth & todos",
  environment: { name: "Demo", variables: { base } },
  requests: [
    {
      id: "login",
      name: "log in",
      method: "POST",
      url: "{{base}}/login",
      body: {
        type: "json",
        content: '{"username":"demo","password":"••••••••"}',
      },
      captures: [{ path: "data.access_token", var: "token" }],
      asserts: [
        { path: "status", op: "equals", value: "200" },
        { path: "data.access_token", op: "exists" },
      ],
    },
    {
      id: "create",
      name: "create todo",
      method: "POST",
      url: "{{base}}/todos",
      auth: { type: "bearer", token: "{{token}}" },
      body: { type: "json", content: '{"title":"Ship the graph"}' },
      bindings: [
        { from: "login", path: "data.access_token", as: "variable", name: "token" },
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
      url: "{{base}}/todos/{{todoId}}",
      auth: { type: "bearer", token: "{{token}}" },
      bindings: [
        { from: "create", path: "data.id", as: "variable", name: "todoId" },
      ],
      asserts: [
        { path: "status", op: "equals", value: "200" },
        { path: "data.title", op: "equals", value: "Ship the graph" },
      ],
    },
    {
      id: "list",
      name: "list all",
      method: "GET",
      url: "{{base}}/todos",
      auth: { type: "bearer", token: "{{token}}" },
      after: "read",
      asserts: [{ path: "status", op: "equals", value: "200" }],
    },
  ],
});
