# JustAPI

A node-based API explorer. Drop requests on a canvas, chain response values
into the next request, and run whole flows. Import cURL, fetch, HAR, or
OpenAPI and fan endpoints out as nodes.

## Stack

- Next.js 15 (App Router)
- React 18
- @xyflow/react (React Flow) for the canvas
- Zustand for state
- Tailwind CSS

## Develop

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
pnpm start
```

## Layout

- `app/` — Next route files (`page.tsx` renders the canvas, `api/proxy` + `api/share` routes, root `layout.tsx`).
- `src/canvas/` — the whole app:
  - `use-canvas-store.ts` — persisted graphs (nodes/edges/viewport, multiple named canvases).
  - `use-run-store.ts` — in-memory per-node run state (responses are never persisted).
  - `engine.ts` — chain execution: topological upstream resolution, cycle detection, variable/header bindings.
  - `execute-request.ts` — pure send pipeline (auth headers, `{{var}}` substitution, JSON validation).
  - `get-path.ts` — `data.token` / `status` / `headers.etag` extraction from responses.
  - `parse-curl.ts` / `parse-openapi.ts` — importers behind the import dialog.
  - `components/` — request/env nodes, binding edge + inspector, toolbar, import dialog.
- `src/stores/use-environment-store.ts` — environments with `{{variable}}` substitution.
- `src/utils/` — `http` (proxy fetch), `variables`, `har`, theme plumbing.
- `extension/` — browser extension for capturing requests (HAR export imports into the canvas).

## Concepts

- **Request node** — method, URL, headers, body, auth; run it and the response
  renders inline. `⌘↵` runs the selected node; double-click ▶ re-runs the whole chain.
- **Binding edge** — connect node A → node B and pick a value from A's response
  (`data.token`, `status`, `headers.etag`); it feeds B as a `{{variable}}` or a header.
  Running B runs its upstream chain first (topological order, cycles rejected).
- **Env node** — an environment's variables on the canvas; connect it to requests
  that should use it. Precedence: edge bindings > env-node vars > active environment.

## Outgoing requests

The browser calls `/api/proxy`, which forwards to the target URL server-side.
This sidesteps CORS for arbitrary endpoints.

## Persistence

Graphs (nodes, edges, viewport) persist to localStorage (`justapi-canvas`).
Responses are kept in memory only. Share links (`/?s=ID`) resolve via
`/api/share` (Vercel Blob) and spawn a request node; legacy
`/playground?s=ID` links redirect here.
