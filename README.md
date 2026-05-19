# JUSTAPI

A simple REST API client. Type a URL, pick a method, send. Save what you reuse.

## Stack

- Next.js 15 (App Router)
- React 18
- Zustand for state
- Tailwind CSS
- Monaco editor for request/response bodies

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

- `app/` — Next route files (`page.tsx`, `api/proxy/route.ts`, root `layout.tsx`).
- `src/components/` — UI grouped by feature: `collections`, `environment`, `history`, `layout`, `request`, `response`, `ui`.
- `src/stores/` — one Zustand store per concern (`request`, `response`, `collections`, `environment`, `history`, `app`, `toast`).
- `src/hooks/` — `use-request` (send pipeline), `use-is-dirty` (unsaved-changes check), `use-pwa`.
- `src/utils/` — `http` (proxy fetch), `sharing` (URL-hash share), `variables` (`{{var}}` substitution).

## Outgoing requests

The browser calls `/api/proxy`, which forwards to the target URL server-side. This sidesteps CORS for arbitrary endpoints.

## Persistence

Saved requests, environments, history, and theme persist to localStorage via `zustand/middleware/persist`. There's no backend account system.
