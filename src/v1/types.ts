import type { HttpMethod, HttpResponse } from "../utils/http";
import type { AuthType, BodyType } from "../stores/use-request-store";

export interface CardEnv {
  id: string;
  name: string;
}

export interface CardAuth {
  type: AuthType;
  summary: string;
}

export interface CardBody {
  type: BodyType;
  size: number;
  summary: string;
}

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

export interface Card {
  id: string;
  workspaceId: string;
  createdAt: number;
  method: HttpMethod;
  url: string;
  urlRaw: string;
  host: string;
  env: CardEnv | null;
  auth: CardAuth;
  body: CardBody | null;
  request: CardRequestSnapshot;
  response: HttpResponse | null;
  pending: boolean;
  error: string | null;
  archived: boolean;
  /** Whether this card is currently rendered in the visible Sonner-style
   *  stack. Dismissed sheets set this to false but remain in `cards` so the
   *  palette (history) can still surface them. */
  inStack: boolean;
}

export type DriftKind = "none" | "identical" | "size" | "shape" | "status";

export interface DriftField {
  path: string;
  kind: "added" | "removed" | "changed";
  before?: unknown;
  after?: unknown;
}

export interface Drift {
  kind: DriftKind;
  statusBefore?: number;
  statusAfter?: number;
  sizeDelta?: number;
  fields?: DriftField[];
}
