# JustAPI

A node-based API explorer. Drop requests on a canvas, chain response values
into the next request, and run whole flows. Import cURL, fetch, HAR, or
OpenAPI and fan endpoints out as nodes.

## Stack

- Next.js 15 (App Router) on **Cloudflare Workers** via `@opennextjs/cloudflare`
- React 18
- @xyflow/react (React Flow) for the canvas
- Zustand for client state
- **better-auth** (email/password + API keys) on **Cloudflare D1** (Drizzle ORM)
- **R2** for share snapshots
- Tailwind CSS

## Develop

```bash
pnpm install
pnpm db:migrate:local   # apply auth schema to the local D1
pnpm dev                # next dev on :3100, Cloudflare bindings via miniflare
```

Then open the app, create an account, and you're on the canvas. Auth secrets
live in `.dev.vars` (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`).

## Build

```bash
pnpm build
pnpm start
```

## Layout

- `app/` — Next route files: `page.tsx` is the marketing landing, `app/page.tsx` renders the
  canvas (route `/app`); `login/`, `signup/`, `account/` pages; `api/auth/[...all]` (better-auth),
  `api/flows` + `api/agent` (the agent bridge), `api/proxy` (+ `multipart`), and `api/share`
  routes; root `layout.tsx`. `src/marketing/` holds the landing's client bits (theme toggle).
- `middleware.ts` — optimistic session-cookie gate; redirects unauthenticated visitors to `/login`.
- `src/canvas/` — the client app:
  - `use-canvas-store.ts` — persisted graphs (nodes/edges/viewport, multiple named canvases).
  - `use-run-store.ts` — in-memory per-node run state (responses are never persisted).
  - `engine.ts` — chain execution: topological upstream resolution, cycle detection, variable/header bindings.
  - `execute-request.ts` — pure send pipeline (auth headers, `{{var}}` substitution, JSON validation).
  - `get-path.ts` — `data.token` / `status` / `headers.etag` extraction from responses.
  - `flow-spec.ts` / `materialize.ts` — the declarative flow spec (parse/validate) and spec → live graph.
  - `parse-curl.ts` / `parse-openapi.ts` — importers behind the import dialog.
  - `use-agent-sync.ts` — subscribes the browser as the execution host for agent-pushed flows (SSE).
  - `components/` — request/collection/assert nodes, binding edge + inspector, rail, library, status bar, import dialog.
- `src/server/` — server-side layer:
  - `auth.ts` — builds better-auth per-request from the D1 binding; `auth-shared.ts` holds the plugin config.
  - `require-auth.ts` — bridge guard: session cookie or bearer token → userId, else 401.
  - `agent-hub.ts` — in-memory hub (flows persisted to `.justapi/flows/*.json`); SSE broadcast + run long-polling.
  - `run-flow-spec.ts` — headless executor that mirrors the browser engine's semantics and report shape.
- `src/db/schema.ts` — better-auth Drizzle schema (D1); `src/lib/auth-client.ts` — the browser auth client.
- `mcp/server.mjs` — stdio MCP server exposing flows as tools (`pnpm mcp`).
- `src/stores/use-environment-store.ts` — environments with `{{variable}}` substitution.
- `src/utils/` — `http` (proxy fetch), `variables`, `har`, theme plumbing.
- `extension/` — standalone MV3 Chrome extension that intercepts `fetch`/`XHR`. Currently not
  wired to the canvas (the in-app debugger UI was removed); HAR import works from pasted `.har` files.

## Concepts

- **Request node** — method, URL, headers, body, auth; run it and the response
  renders inline. `⌘↵` runs the selected node; double-click ▶ re-runs the whole chain.
- **Binding edge** — connect node A → node B and pick a value from A's response
  (`data.token`, `status`, `headers.etag`); it feeds B as a `{{variable}}` or a header.
  Running B runs its upstream chain first (topological order, cycles rejected).
- **Origin node** — the root of a flow tree, named after a collection. Requests
  are added from it and branch off each other; every request in the tree shows a
  membership badge. ▶ on the origin runs the whole tree in dependency order.
  The origin also carries the tree's environment (expandable variable editor);
  precedence: edge bindings > origin env > active environment.
- **Assert node** — hangs off a request and grades its response
  (`status = 200`, `data.id exists`, contains/>/<). Checks evaluate live as
  responses arrive, and the flow verdict counts them: "4 passed · 2 checks ✓".

## Agents

JustAPI doubles as the UI an AI agent uses to prove a backend works:
push a declarative flow spec over HTTP (`POST /api/flows`), watch it
materialize on the open canvas, run it (`POST /api/flows/:slug/run`),
and get a machine-readable verdict — while the human supervises the
tree executing live. With no canvas connected (CI, background agents)
runs execute headless server-side with the same report. An MCP server
(`pnpm mcp`) exposes the same as native tools for Claude Code and
other MCP clients. See [docs/agent-api.md](docs/agent-api.md).

## Accounts & auth

**Auth is optional.** Anonymous users get the full canvas locally — graphs live
in their browser's localStorage. Signing in unlocks the account-scoped features:
the agent bridge, sharing, token minting, and canvas sync across devices.

`middleware.ts` only guards `/account`; everything else is open. The bridge
routes (`/api/flows`, `/api/agent/*`, `/api/share/*`) call `requireAuth`, which
accepts **either** the browser session cookie **or** an
`Authorization: Bearer <token>` — so a signed-out canvas simply doesn't open
them (the agent-bridge SSE only connects when signed in).

- **Users** sign up at `/signup`, sign in at `/login`. The rail's account icon
  shows "Sign in" when signed out, "Account" when signed in.
- **Social login (Google / GitHub)** appears automatically once its credentials
  are set — see below. Signed-in users link/unlink providers from `/account`.
- **Tokens** are minted at `/account` — the plaintext is shown once. Use it as
  the MCP bridge's `JUSTAPI_TOKEN`.

### Google & GitHub login

Each provider turns on only when **both** halves of its credential are present,
so the buttons stay hidden until you configure them. Create an OAuth app with
these callback URLs (dev shown; swap the origin for your deployed URL):

- Google — Authorized redirect URI: `http://localhost:3100/api/auth/callback/google`
- GitHub — Authorization callback URL: `http://localhost:3100/api/auth/callback/github`

Then set the credentials. **Dev** (`.dev.vars`, restart `pnpm dev` to pick up):

```
GOOGLE_CLIENT_ID=…
GOOGLE_CLIENT_SECRET=…
GITHUB_CLIENT_ID=…
GITHUB_CLIENT_SECRET=…
```

**Production** (Cloudflare secrets):

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
```

No migration is needed — the existing `account` table already stores linked
providers.
- Auth is [better-auth](https://better-auth.com): `src/server/auth.ts` builds it
  per-request from the D1 binding; `app/api/auth/[...all]` mounts the handler.
  Schema lives in `src/db/schema.ts` (regenerate with `pnpm auth:generate`, then
  `pnpm db:generate` for the SQL migration).

The MCP server (`mcp/server.mjs`) sends the token on every call:

```bash
claude mcp add justapi \
  -e JUSTAPI_URL=http://localhost:3100 \
  -e JUSTAPI_TOKEN=<minted-token> \
  -- node /path/to/justapi/mcp/server.mjs
```

## Deploy (Cloudflare)

```bash
wrangler d1 create justapi                 # paste database_id into wrangler.jsonc
wrangler r2 bucket create justapi-shares
pnpm db:migrate                            # apply schema to remote D1
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put BETTER_AUTH_URL        # your deployed origin
pnpm deploy                                # opennextjs build + deploy
```

`pnpm preview` runs the built Worker locally (miniflare) for a production-like check.

## Outgoing requests

The browser calls `/api/proxy`, which forwards to the target URL server-side.
This sidesteps CORS for arbitrary endpoints.

## Persistence

Graphs persist to localStorage (`justapi-canvas`) for a local-first, works-signed-out
experience. **Signed-in, canvases + environments also sync to D1 per user**
(`src/canvas/use-canvas-sync.ts`): the server is the source of truth on load, a
canvas the server lacks is either uploaded (never-synced local work) or dropped
(deleted on another device — tracked via a local `justapi-synced-ids` set so a
delete doesn't resurrect). Responses are kept in memory only. Accounts, sessions,
and API tokens persist to **D1**. Share links (`/app?s=ID`) resolve via
`/api/share` (**R2**) and spawn a request node; legacy `/?s=ID` and
`/playground?s=ID` links redirect to the canvas at `/app`.

App tables (`canvas`, `environment`) live in `src/db/app-schema.ts` — **separate
from `src/db/schema.ts`**, which `pnpm auth:generate` overwrites. After changing
either, run `pnpm db:generate` then `pnpm db:migrate:local` (`--remote` for prod).

### Plans & limits

`src/server/plan.ts` defines per-plan limits; everyone is on **free (5 canvases)**
until billing exists (`getUserPlan` is the seam to change). The cap blocks
*creating* new canvases past the limit — existing canvases are grandfathered
(bulk `POST /api/canvases/import` bypasses it; per-canvas `PUT` enforces it with a
`402`). The client also gates creation (`createCanvasGuarded`) and the account
page shows usage as `N / limit`.
