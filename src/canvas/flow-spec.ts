import type { HttpMethod } from "../utils/http";
import type { AssertOp } from "./types";

/**
 * The declarative flow format — the contract agents (MCP, CLI, files)
 * use to describe a runnable request tree. Versioned via `justapiFlow`.
 */

export interface FlowBinding {
  /** Spec-local id of the source request. */
  from: string;
  /** Extraction path into the source response: `status`, `data.id`, … */
  path: string;
  as?: "variable" | "header";
  /** Variable name (used as {{name}}) or header name. */
  name: string;
}

export interface FlowAssert {
  path: string;
  op: AssertOp;
  value?: string;
}

export interface FlowAuth {
  type: "bearer" | "basic" | "api-key";
  token?: string;
  username?: string;
  password?: string;
  header?: string;
  key?: string;
}

export interface FlowRequest {
  /** Spec-local id — stable across upserts, used by bindings/`after`. */
  id: string;
  name?: string;
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: { type: "json" | "raw"; content: string } | null;
  auth?: FlowAuth | null;
  /** Parent request id for sequencing without a data binding. Defaults
   *  to the origin (bindings imply their own parent edges). */
  after?: string;
  bindings?: FlowBinding[];
  asserts?: FlowAssert[];
}

export interface FlowSpec {
  justapiFlow: 1;
  /** Flow name — also the collection/origin name and the slug source. */
  name: string;
  environment?: {
    name: string;
    variables?: Record<string, string>;
  };
  /** Tree-wide defaults carried by the origin: headers merge under each
   *  request's own; auth applies to requests that don't set their own. */
  defaults?: {
    headers?: Record<string, string>;
    auth?: FlowAuth | null;
  };
  requests: FlowRequest[];
}

/** Per-run report returned to agents (`flow` slug added by the API). */
export interface FlowRunReport {
  startedAt: number;
  finishedAt: number;
  passed: boolean;
  verdict: string;
  requests: {
    id: string;
    name: string;
    method: string;
    url: string;
    ok: boolean;
    status: number | null;
    time: number | null;
    error: string | null;
  }[];
  checks: {
    request: string;
    path: string;
    op: string;
    value?: string;
    pass: boolean;
    actual: string;
  }[];
}

export const flowSlug = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "flow";

const METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);
const OPS = new Set(["exists", "equals", "contains", "gt", "lt"]);

/** Validate an untrusted payload into a FlowSpec, or return errors. */
export const parseFlowSpec = (
  raw: unknown
): { spec: FlowSpec; errors: null } | { spec: null; errors: string[] } => {
  const errors: string[] = [];
  const o = raw as Record<string, unknown>;
  if (typeof o !== "object" || o === null) {
    return { spec: null, errors: ["payload must be a JSON object"] };
  }
  if (o.justapiFlow !== 1) {
    errors.push('missing or unsupported "justapiFlow" version (expected 1)');
  }
  if (typeof o.name !== "string" || !o.name.trim()) {
    errors.push('"name" is required');
  }
  const requests = o.requests;
  if (!Array.isArray(requests) || requests.length === 0) {
    errors.push('"requests" must be a non-empty array');
    return { spec: null, errors };
  }
  const ids = new Set<string>();
  requests.forEach((r: Record<string, unknown>, i: number) => {
    const at = `requests[${i}]`;
    if (typeof r !== "object" || r === null) {
      errors.push(`${at} must be an object`);
      return;
    }
    if (typeof r.id !== "string" || !r.id.trim()) {
      errors.push(`${at}.id is required`);
    } else if (ids.has(r.id)) {
      errors.push(`${at}.id "${r.id}" is duplicated`);
    } else {
      ids.add(r.id);
    }
    if (typeof r.method !== "string" || !METHODS.has(r.method)) {
      errors.push(`${at}.method must be one of ${[...METHODS].join("/")}`);
    }
    if (typeof r.url !== "string" || !r.url.trim()) {
      errors.push(`${at}.url is required`);
    }
    if (r.body != null) {
      const b = r.body as Record<string, unknown>;
      if (b.type !== "json" && b.type !== "raw") {
        errors.push(`${at}.body.type must be "json" or "raw"`);
      }
      if (typeof b.content !== "string") {
        errors.push(`${at}.body.content must be a string`);
      }
    }
    (Array.isArray(r.bindings) ? r.bindings : []).forEach(
      (b: Record<string, unknown>, j: number) => {
        if (typeof b.from !== "string") {
          errors.push(`${at}.bindings[${j}].from is required`);
        }
        if (typeof b.path !== "string" || !b.path.trim()) {
          errors.push(`${at}.bindings[${j}].path is required`);
        }
        if (typeof b.name !== "string" || !b.name.trim()) {
          errors.push(`${at}.bindings[${j}].name is required`);
        }
        if (b.as != null && b.as !== "variable" && b.as !== "header") {
          errors.push(`${at}.bindings[${j}].as must be "variable" or "header"`);
        }
      }
    );
    (Array.isArray(r.asserts) ? r.asserts : []).forEach(
      (a: Record<string, unknown>, j: number) => {
        if (typeof a.path !== "string" || !a.path.trim()) {
          errors.push(`${at}.asserts[${j}].path is required`);
        }
        if (typeof a.op !== "string" || !OPS.has(a.op)) {
          errors.push(`${at}.asserts[${j}].op must be one of ${[...OPS].join("/")}`);
        }
      }
    );
  });
  // Referential integrity: bindings/`after` must point at known ids.
  requests.forEach((r: Record<string, unknown>, i: number) => {
    const at = `requests[${i}]`;
    if (r.after != null && !ids.has(r.after as string)) {
      errors.push(`${at}.after references unknown request "${r.after}"`);
    }
    (Array.isArray(r.bindings) ? r.bindings : []).forEach(
      (b: Record<string, unknown>, j: number) => {
        if (typeof b.from === "string" && !ids.has(b.from)) {
          errors.push(
            `${at}.bindings[${j}].from references unknown request "${b.from}"`
          );
        }
      }
    );
  });
  if (errors.length > 0) return { spec: null, errors };
  return { spec: raw as FlowSpec, errors: null };
};
