# JustAPI agent bridge

JustAPI is a canvas where API flows are drawn as trees: an **origin**
(collection + environment) fans out into **requests**, wires carry
**bindings** (a value from one response feeding the next request), and
**asserts** grade responses. This bridge lets an agent build and run
those flows over plain HTTP while a human watches them execute live on
the canvas.

Requires the app running locally (`pnpm dev`). With the canvas open in
a browser at `http://localhost:3000`, flows execute *in the browser* so
the human sees every request light up. With no canvas connected — CI,
background agents — runs fall back to a headless server-side executor
with the same semantics and report shape.

## Push a flow

`POST /api/flows` (or `PUT /api/flows/:slug`) with a flow spec:

```json
{
  "justapiFlow": 1,
  "name": "todos crud",
  "environment": {
    "name": "local",
    "variables": { "base": "https://jsonplaceholder.typicode.com" }
  },
  "requests": [
    {
      "id": "login",
      "method": "POST",
      "url": "{{base}}/login",
      "body": { "type": "json", "content": "{\"user\":\"a\"}" },
      "asserts": [{ "path": "status", "op": "equals", "value": "200" }]
    },
    {
      "id": "read",
      "method": "GET",
      "url": "{{base}}/todos/1",
      "after": "login",
      "asserts": [
        { "path": "status", "op": "equals", "value": "200" },
        { "path": "data.id", "op": "exists" }
      ]
    },
    {
      "id": "update",
      "method": "PUT",
      "url": "{{base}}/todos/{{todoId}}",
      "body": { "type": "json", "content": "{\"title\":\"x\"}" },
      "bindings": [
        { "from": "read", "path": "data.id", "as": "variable", "name": "todoId" }
      ]
    }
  ]
}
```

Semantics:

- `name` — the flow/collection/canvas name; its slug is the flow id.
- `environment` — upserted by name; variables merge. The whole tree
  resolves `{{vars}}` against it.
- `defaults` — optional tree-wide defaults, carried by the origin:
  `defaults.headers` merge under each request's own headers, and
  `defaults.auth` applies to requests that set no auth of their own.
  Precedence: bound headers > request headers > default headers.
- `requests[].id` — stable spec-local id (used by `after`, `bindings`,
  and run reports). Upserting the same flow name replaces the tree but
  keeps positions of requests whose ids survive.
- Parenting: `bindings[].from` wires a data edge (value extracted at
  `path` becomes `{{name}}` or a header). `after` sequences without
  data. Neither → the request hangs off the origin.
- Paths: `status`, `statusText`, `headers.<name>`, `data.x[0].y`.
- Assert ops: `exists`, `equals`, `contains`, `gt`, `lt`.

Response: `{ "slug": "todos-crud", "canvasConnected": true, "run": "/api/flows/todos-crud/run" }`.
The flow materializes on the open canvas immediately.

## Run it

```
POST /api/flows/:slug/run          # long-polls until done (?timeout=ms, default 60000)
```

Returns the report:

```json
{
  "flow": "todos-crud",
  "passed": true,
  "verdict": "3 passed · 3 checks ✓",
  "requests": [
    { "id": "read", "ok": true, "status": 200, "time": 185, "error": null }
  ],
  "checks": [
    { "request": "read", "path": "data.id", "op": "exists", "pass": true, "actual": "1" }
  ]
}
```

With a canvas connected the run executes live on the board; otherwise
it runs headless server-side (variables come from the spec's
`environment`, defaults from `defaults`). The response's `mode` field
says which happened (`"canvas"` or `"headless"`); force server-side
with `?mode=headless`. Requests execute in topological order; failures
don't halt the suite — they're reported.

## Inspect

```
GET /api/flows                     # list flows
GET /api/flows/:slug               # spec + last run report
```

Flows persist under `.justapi/flows/*.json` — editing those files and
re-`POST`ing works too, so file-only agents need nothing but curl.

## MCP

`mcp/server.mjs` wraps this API as an MCP server (stdio). Register it
with any MCP client — Claude Code:

```
claude mcp add justapi -- node /path/to/justapi/mcp/server.mjs
```

Tools: `push_flow`, `run_flow`, `push_and_run_flow`, `get_flow`,
`list_flows`. The flow-spec reference ships inside the tool
descriptions, so agents can author flows without reading this file.
Point at a non-default app URL with `JUSTAPI_URL`.

