import type { Node, Edge, Viewport } from "@xyflow/react";
import type { HttpMethod } from "../utils/http";

export type BodyType = "json" | "form-data" | "raw" | "none";
export type AuthType = "none" | "bearer" | "basic" | "api-key";

export interface AuthConfig {
  bearerToken?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiKeyHeader?: string;
}

/** A frozen, self-contained request: everything needed to (re)send it. */
export interface CardRequestSnapshot {
  method: HttpMethod;
  url: string;
  urlRaw: string;
  headers: Record<string, string>;
  body: string | null;
  bodyType: BodyType;
  authType: AuthType;
  authConfig: Record<string, string | undefined>;
}

/** A post-response capture: after this request runs, extract `path` from
 *  its response and set variable `var` (used as {{var}} downstream). */
export interface Capture {
  id: string;
  path: string;
  var: string;
}

/** Data payload of a request node. The snapshot reuses the v1 frozen
 *  request shape so send/parse/share machinery works unchanged. */
export interface RequestNodeData extends Record<string, unknown> {
  name: string;
  snapshot: CardRequestSnapshot;
  collapsed: boolean;
  /** Spec-local id when this node was materialized from a flow spec —
   *  keeps agent upserts idempotent and run reports addressable. */
  specId?: string;
  /** Values pulled from this request's response into variables on run. */
  captures?: Capture[];
}

/** Collection nodes are flow origins: the root of a request tree.
 *  Requests are added from them (and branch from each other), and every
 *  request wired under an origin belongs to that collection. The origin
 *  also carries the environment its whole tree runs under, plus default
 *  headers/auth every request in the tree inherits. */
export interface CollectionNodeData extends Record<string, unknown> {
  /** The collection/flow name. The origin owns its own identity — there is
   *  no separate collections store. */
  name: string;
  /** Environment for the tree; null/undefined = the active environment. */
  environmentId?: string | null;
  /** Headers inherited by every request in the tree. A request's own
   *  header of the same name wins; bound headers win over both. */
  headers?: Record<string, string>;
  /** Auth inherited by requests whose own auth is "none". */
  authType?: AuthType;
  authConfig?: Record<string, string | undefined>;
}

/**
 * A binding edge feeds a value extracted from the source node's response
 * into the target request — either as a `{{targetName}}` variable or as a
 * literal header. Env→request edges have no data (they mean "use this
 * environment's variables").
 */
export interface BindingEdgeData extends Record<string, unknown> {
  sourcePath: string;
  targetKind: "variable" | "header";
  targetName: string;
}

export type AssertOp = "exists" | "equals" | "contains" | "gt" | "lt";

export interface AssertCheck {
  id: string;
  /** Extraction path into the upstream response: `status`, `data.id`, … */
  path: string;
  op: AssertOp;
  /** Expected value (unused for `exists`). */
  value: string;
}

/** Assert nodes hang off a request and grade its response. They evaluate
 *  live and count toward the flow verdict. */
export interface AssertNodeData extends Record<string, unknown> {
  checks: AssertCheck[];
}

export type RequestNode = Node<RequestNodeData, "request">;
export type CollectionNode = Node<CollectionNodeData, "collection">;
export type AssertNode = Node<AssertNodeData, "assert">;
export type CanvasNode = RequestNode | CollectionNode | AssertNode;
export type BindingEdge = Edge<BindingEdgeData>;

export interface CanvasGraph {
  id: string;
  name: string;
  createdAt: number;
  nodes: CanvasNode[];
  edges: BindingEdge[];
  viewport: Viewport | null;
}

export type RunStatus = "idle" | "pending" | "success" | "error";
