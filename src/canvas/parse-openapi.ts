import type { HttpMethod } from "../utils/http";

export interface OpenApiEndpoint {
  method: HttpMethod;
  url: string;
  name: string;
}

const METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

/**
 * Minimal JSON-only OpenAPI/Swagger parser: extracts method × path pairs
 * with a base URL. Path params `{id}` are rewritten to `{{id}}` so they
 * flow through the existing `replaceVariables` machinery. Returns null if
 * the input isn't an OpenAPI document.
 */
export const parseOpenApi = (raw: string): OpenApiEndpoint[] | null => {
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof doc !== "object" || doc === null) return null;
  const isV3 = typeof doc.openapi === "string";
  const isV2 = typeof doc.swagger === "string";
  if (!isV3 && !isV2) return null;

  let base = "";
  if (isV3) {
    const servers = doc.servers as { url?: string }[] | undefined;
    base = servers?.[0]?.url ?? "";
  } else {
    const schemes = doc.schemes as string[] | undefined;
    const host = doc.host as string | undefined;
    const basePath = (doc.basePath as string | undefined) ?? "";
    if (host) base = `${schemes?.[0] ?? "https"}://${host}${basePath}`;
  }
  base = base.replace(/\/$/, "");

  const paths = doc.paths as
    | Record<string, Record<string, { summary?: string; operationId?: string }>>
    | undefined;
  if (!paths || typeof paths !== "object") return [];

  const endpoints: OpenApiEndpoint[] = [];
  for (const [path, ops] of Object.entries(paths)) {
    if (typeof ops !== "object" || ops === null) continue;
    for (const method of METHODS) {
      const op = ops[method.toLowerCase()];
      if (!op || typeof op !== "object") continue;
      const templated = path.replace(/\{([^}]+)\}/g, "{{$1}}");
      endpoints.push({
        method,
        url: `${base}${templated}`,
        name: op.summary || op.operationId || `${method} ${path}`,
      });
    }
  }
  return endpoints;
};
