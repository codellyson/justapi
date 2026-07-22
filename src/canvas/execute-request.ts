import { sendRequest } from "../utils/http";
import type { RequestConfig, HttpResponse } from "../utils/http";
import { replaceVariables } from "../utils/variables";
import type { CardRequestSnapshot } from "./types";

export interface ResolvedConfig {
  config: RequestConfig | null;
  error: string | null;
}

/**
 * Resolve a frozen request snapshot into a sendable config: substitute
 * `{{var}}` placeholders, build the Authorization header from the auth
 * config, validate JSON bodies, and default Content-Type. Pure — no store
 * access. Shared by the v1 send pipeline and the canvas run engine.
 */
export const buildResolvedConfig = (
  snapshot: CardRequestSnapshot,
  variables: Record<string, string>
): ResolvedConfig => {
  const url = snapshot.urlRaw.trim() || snapshot.url.trim();
  if (!url) return { config: null, error: "empty url" };

  const resolvedUrl = replaceVariables(url, variables);

  const headers: Record<string, string> = {};
  Object.entries(snapshot.headers).forEach(([k, v]) => {
    headers[k] = replaceVariables(v, variables);
  });

  const auth = snapshot.authConfig;
  if (snapshot.authType === "bearer" && auth.bearerToken) {
    headers["Authorization"] = `Bearer ${replaceVariables(
      auth.bearerToken,
      variables
    )}`;
  } else if (snapshot.authType === "basic" && auth.username) {
    const u = replaceVariables(auth.username, variables);
    const p = replaceVariables(auth.password ?? "", variables);
    headers["Authorization"] = `Basic ${btoa(`${u}:${p}`)}`;
  } else if (
    snapshot.authType === "api-key" &&
    auth.apiKey &&
    auth.apiKeyHeader
  ) {
    headers[auth.apiKeyHeader] = replaceVariables(auth.apiKey, variables);
  }

  let body: string | undefined;
  if (snapshot.bodyType === "json" && snapshot.body) {
    const resolved = replaceVariables(snapshot.body, variables);
    try {
      JSON.parse(resolved);
    } catch {
      return { config: null, error: "invalid JSON body" };
    }
    body = resolved;
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  } else if (snapshot.bodyType === "raw" && snapshot.body) {
    body = replaceVariables(snapshot.body, variables);
  }

  return {
    config: {
      method: snapshot.method,
      url: resolvedUrl,
      headers,
      body,
    },
    error: null,
  };
};

/**
 * Resolve and send a snapshot. Throws on abort (like `sendRequest`);
 * network-level failures come back as `status: 0` responses.
 */
export const executeRequest = async (
  snapshot: CardRequestSnapshot,
  variables: Record<string, string>,
  signal?: AbortSignal
): Promise<HttpResponse> => {
  const { config, error } = buildResolvedConfig(snapshot, variables);
  if (!config) {
    return {
      status: 0,
      statusText: error ?? "invalid request",
      headers: {},
      data: { error: error ?? "invalid request" },
      time: 0,
      size: 0,
    };
  }
  return sendRequest(config, signal);
};
