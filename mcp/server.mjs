#!/usr/bin/env node
/**
 * JustAPI MCP server — exposes the local agent bridge as MCP tools so
 * any MCP client (Claude Code, etc.) can build and run flows on the
 * canvas natively.
 *
 * Register (Claude Code):
 *   claude mcp add justapi -- node /path/to/justapi/mcp/server.mjs
 *
 * Requires the app running (`pnpm dev`) and the canvas open in a
 * browser — flows execute there so the human watches them run.
 * Override the app URL with JUSTAPI_URL (default http://localhost:3000).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.JUSTAPI_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);

const SPEC_REFERENCE = `Flow spec (justapiFlow: 1):
{
  "justapiFlow": 1,
  "name": "checkout e2e",                       // flow/canvas/collection name; slug derives from it
  "environment": {                              // optional; upserted by name, variables merged
    "name": "local",
    "variables": { "base": "http://localhost:4000" }
  },
  "defaults": {                                 // optional tree-wide defaults, carried by the origin
    "headers": { "X-Tenant": "acme" },          // merged UNDER each request's own headers
    "auth": { "type": "bearer", "token": "{{token}}" }  // for requests that set no auth of their own
  },
  "requests": [
    {
      "id": "login",                            // stable spec-local id
      "name": "log in",                         // optional label
      "method": "POST",                         // GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS
      "url": "{{base}}/auth/login",             // {{vars}} resolve against the environment
      "headers": { "X-Debug": "1" },            // optional
      "body": { "type": "json", "content": "{\\"user\\":\\"a\\"}" },  // or type "raw"; optional
      "auth": { "type": "bearer", "token": "{{token}}" },             // or basic{username,password} / api-key{header,key}; optional
      "after": "somePriorId",                   // optional: sequence after another request (no data flow)
      "bindings": [                             // optional: values from earlier responses
        { "from": "login", "path": "data.token", "as": "variable", "name": "token" }
      ],                                        // "as": "variable" (use as {{name}}) or "header"
      "asserts": [                              // optional: graded checks
        { "path": "status", "op": "equals", "value": "200" },
        { "path": "data.id", "op": "exists" }
      ]                                         // ops: exists, equals, contains, gt, lt
    }
  ]
}
Paths address the response: "status", "statusText", "headers.<name>", "data.x[0].y".
Requests with no "after" and no bindings hang off the origin and run first.`;

const server = new McpServer(
  { name: "justapi", version: "1.0.0" },
  {
    instructions:
      "JustAPI renders API test flows as a visual tree the human watches execute. " +
      "Push a declarative flow spec (auth → … → feature under test), then run it " +
      "and read the verdict. The app must be running locally with the canvas open " +
      "in a browser. Prefer push_and_run_flow for a one-shot build-and-verify.\n\n" +
      SPEC_REFERENCE,
  }
);

const jsonResult = (data) => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});

const errorResult = (message) => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

const call = async (path, init) => {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch (err) {
    throw new Error(
      `Could not reach JustAPI at ${BASE} (${err.message}). ` +
        "Start it with `pnpm dev` in the justapi repo and open it in a browser."
    );
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body.errors
      ? body.errors.join("; ")
      : body.error ?? res.statusText;
    throw new Error(`${res.status}: ${detail}`);
  }
  return body;
};

const pushFlow = (spec) =>
  call("/api/flows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(spec),
  });

const runFlow = (slug, timeoutMs) =>
  call(
    `/api/flows/${encodeURIComponent(slug)}/run?timeout=${timeoutMs ?? 60000}`,
    { method: "POST" }
  );

server.registerTool(
  "push_flow",
  {
    description:
      "Create or update a JustAPI flow from a declarative spec. It materializes " +
      "on the open canvas immediately (its own named board). Idempotent per flow " +
      "name — re-push to edit.\n\n" +
      SPEC_REFERENCE,
    inputSchema: { spec: z.record(z.string(), z.unknown()) },
  },
  async ({ spec }) => {
    try {
      return jsonResult(await pushFlow(spec));
    } catch (err) {
      return errorResult(err.message);
    }
  }
);

server.registerTool(
  "run_flow",
  {
    description:
      "Run a flow end-to-end on the canvas (topological order, bindings resolved, " +
      "asserts graded; failures reported, not fatal). Blocks until done and returns " +
      "the report: verdict, passed, per-request status/time, per-check pass/actual.",
    inputSchema: {
      slug: z.string().describe("Flow slug (returned by push_flow)"),
      timeoutMs: z.number().optional().describe("Max wait, default 60000"),
    },
  },
  async ({ slug, timeoutMs }) => {
    try {
      return jsonResult(await runFlow(slug, timeoutMs));
    } catch (err) {
      return errorResult(err.message);
    }
  }
);

server.registerTool(
  "push_and_run_flow",
  {
    description:
      "One-shot: push a flow spec and immediately run it, returning the run " +
      "report. Equivalent to push_flow then run_flow.\n\n" +
      SPEC_REFERENCE,
    inputSchema: {
      spec: z.record(z.string(), z.unknown()),
      timeoutMs: z.number().optional().describe("Max wait, default 60000"),
    },
  },
  async ({ spec, timeoutMs }) => {
    try {
      const { slug } = await pushFlow(spec);
      return jsonResult(await runFlow(slug, timeoutMs));
    } catch (err) {
      return errorResult(err.message);
    }
  }
);

server.registerTool(
  "get_flow",
  {
    description:
      "Read a flow's spec and its last run report (null if never run).",
    inputSchema: { slug: z.string() },
  },
  async ({ slug }) => {
    try {
      return jsonResult(
        await call(`/api/flows/${encodeURIComponent(slug)}`, { method: "GET" })
      );
    } catch (err) {
      return errorResult(err.message);
    }
  }
);

server.registerTool(
  "list_flows",
  {
    description: "List all known flows (slug, name, request count).",
    inputSchema: {},
  },
  async () => {
    try {
      return jsonResult(await call("/api/flows", { method: "GET" }));
    } catch (err) {
      return errorResult(err.message);
    }
  }
);

await server.connect(new StdioServerTransport());
