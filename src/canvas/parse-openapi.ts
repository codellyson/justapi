import { parse as parseYaml } from "yaml";
import type { HttpMethod } from "../utils/http";
import type { AuthType } from "./types";

export interface OpenApiEndpoint {
  method: HttpMethod;
  url: string;
  name: string;
  headers: Record<string, string>;
  body: string | null;
  bodyType: "json" | "none";
  authType: AuthType;
  authConfig: Record<string, string | undefined>;
  tag: string | null;
}

export interface OpenApiParse {
  /** Endpoints with `{{base}}`-templated URLs (the host lives in `servers`). */
  endpoints: OpenApiEndpoint[];
  /** Declared server base URLs, most specific first. */
  servers: string[];
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

type Json = Record<string, unknown>;

// --- $ref resolution -------------------------------------------------------

const resolveRef = (doc: Json, ref: string): Json | null => {
  if (!ref.startsWith("#/")) return null;
  let cur: unknown = doc;
  for (const raw of ref.slice(2).split("/")) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (cur && typeof cur === "object" && key in (cur as Json)) {
      cur = (cur as Json)[key];
    } else return null;
  }
  return cur && typeof cur === "object" ? (cur as Json) : null;
};

/** Follow a `$ref` (once) to the concrete schema, guarding against cycles. */
const deref = (doc: Json, schema: unknown, seen: Set<string>): Json | null => {
  if (!schema || typeof schema !== "object") return null;
  const s = schema as Json;
  if (typeof s.$ref === "string") {
    if (seen.has(s.$ref)) return null;
    seen.add(s.$ref);
    return deref(doc, resolveRef(doc, s.$ref), seen);
  }
  return s;
};

// --- schema → example value ------------------------------------------------

const stringExample = (format?: string): string => {
  switch (format) {
    case "date-time":
      return "2024-01-01T00:00:00Z";
    case "date":
      return "2024-01-01";
    case "email":
      return "user@example.com";
    case "uuid":
      return "00000000-0000-0000-0000-000000000000";
    case "uri":
    case "url":
      return "https://example.com";
    default:
      return "string";
  }
};

const exampleFromSchema = (
  doc: Json,
  schemaIn: unknown,
  depth: number,
  seen: Set<string>
): unknown => {
  if (depth > 6) return null;
  const schema = deref(doc, schemaIn, seen);
  if (!schema) return null;

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];

  if (Array.isArray(schema.allOf)) {
    const merged: Json = {};
    for (const sub of schema.allOf) {
      const ex = exampleFromSchema(doc, sub, depth + 1, new Set(seen));
      if (ex && typeof ex === "object") Object.assign(merged, ex);
    }
    return merged;
  }
  const variant = schema.oneOf ?? schema.anyOf;
  if (Array.isArray(variant) && variant.length) {
    return exampleFromSchema(doc, variant[0], depth + 1, new Set(seen));
  }

  const type = schema.type as string | undefined;
  if (type === "object" || schema.properties) {
    const props = (schema.properties ?? {}) as Json;
    const out: Json = {};
    for (const [k, v] of Object.entries(props)) {
      out[k] = exampleFromSchema(doc, v, depth + 1, new Set(seen));
    }
    return out;
  }
  if (type === "array") {
    const item = exampleFromSchema(doc, schema.items, depth + 1, new Set(seen));
    return item === null ? [] : [item];
  }
  if (type === "string") return stringExample(schema.format as string | undefined);
  if (type === "integer" || type === "number") return 0;
  if (type === "boolean") return true;
  return null;
};

const paramExample = (doc: Json, param: Json): string => {
  if (param.example !== undefined) return String(param.example);
  const schema = deref(doc, param.schema, new Set());
  if (schema) {
    if (schema.example !== undefined) return String(schema.example);
    if (schema.default !== undefined) return String(schema.default);
    if (Array.isArray(schema.enum) && schema.enum.length) {
      return String(schema.enum[0]);
    }
  }
  // No hint — leave a {{variable}} so it flows through the env/binding machinery.
  return `{{${param.name}}}`;
};

// --- security scheme → auth ------------------------------------------------

interface AuthResult {
  authType: AuthType;
  authConfig: Record<string, string | undefined>;
}
const NO_AUTH: AuthResult = { authType: "none", authConfig: {} };

const schemeToAuth = (scheme: Json | null): AuthResult => {
  if (!scheme) return NO_AUTH;
  const type = scheme.type as string | undefined;
  if (type === "http") {
    const s = (scheme.scheme as string | undefined)?.toLowerCase();
    if (s === "basic") {
      return {
        authType: "basic",
        authConfig: { username: "{{username}}", password: "{{password}}" },
      };
    }
    return { authType: "bearer", authConfig: { bearerToken: "{{token}}" } };
  }
  if (type === "oauth2" || type === "openIdConnect") {
    return { authType: "bearer", authConfig: { bearerToken: "{{token}}" } };
  }
  if (type === "basic") {
    // Swagger 2.0 basic auth
    return {
      authType: "basic",
      authConfig: { username: "{{username}}", password: "{{password}}" },
    };
  }
  if (type === "apiKey" && scheme.in === "header") {
    return {
      authType: "api-key",
      authConfig: {
        apiKey: "{{apiKey}}",
        apiKeyHeader: (scheme.name as string) || "X-Api-Key",
      },
    };
  }
  return NO_AUTH;
};

// --- main ------------------------------------------------------------------

export const parseOpenApiDoc = (docIn: unknown): OpenApiParse | null => {
  if (!docIn || typeof docIn !== "object") return null;
  const doc = docIn as Json;
  const isV3 = typeof doc.openapi === "string";
  const isV2 = typeof doc.swagger === "string";
  if (!isV3 && !isV2) return null;

  const servers: string[] = [];
  if (isV3) {
    for (const s of (doc.servers as { url?: string }[] | undefined) ?? []) {
      if (s?.url) servers.push(s.url.replace(/\/$/, ""));
    }
  } else {
    const schemes = doc.schemes as string[] | undefined;
    const host = doc.host as string | undefined;
    const basePath = (doc.basePath as string | undefined) ?? "";
    if (host) {
      servers.push(
        `${schemes?.[0] ?? "https"}://${host}${basePath}`.replace(/\/$/, "")
      );
    }
  }

  const secSchemes =
    (isV3
      ? ((doc.components as Json | undefined)?.securitySchemes as Json | undefined)
      : (doc.securityDefinitions as Json | undefined)) ?? {};
  const globalSecurity = doc.security as Json[] | undefined;

  const authFor = (opSecurity: unknown): AuthResult => {
    const sec = (opSecurity as Json[] | undefined) ?? globalSecurity;
    if (!Array.isArray(sec) || !sec.length) return NO_AUTH;
    const name =
      sec[0] && typeof sec[0] === "object" ? Object.keys(sec[0])[0] : undefined;
    if (!name) return NO_AUTH;
    return schemeToAuth((secSchemes[name] as Json) ?? null);
  };

  const paths = doc.paths as Record<string, Json> | undefined;
  if (!paths || typeof paths !== "object") return { endpoints: [], servers };

  const endpoints: OpenApiEndpoint[] = [];
  for (const [path, item] of Object.entries(paths)) {
    if (!item || typeof item !== "object") continue;
    const pathParams = (item.parameters as Json[] | undefined) ?? [];

    for (const method of METHODS) {
      const op = item[method.toLowerCase()] as Json | undefined;
      if (!op || typeof op !== "object") continue;

      const params = [
        ...pathParams,
        ...((op.parameters as Json[] | undefined) ?? []),
      ]
        .map((p) => deref(doc, p, new Set()))
        .filter((p): p is Json => !!p);

      const headers: Record<string, string> = {};
      const query: string[] = [];
      for (const p of params) {
        if (p.in === "query" && (p.required || p.example !== undefined)) {
          query.push(`${p.name}=${paramExample(doc, p)}`);
        } else if (p.in === "header") {
          headers[p.name as string] = paramExample(doc, p);
        }
      }

      let body: string | null = null;
      let bodyType: "json" | "none" = "none";
      if (isV3) {
        const rb = deref(doc, op.requestBody, new Set());
        const json = (rb?.content as Json | undefined)?.["application/json"] as
          | Json
          | undefined;
        if (json) {
          const ex =
            json.example !== undefined
              ? json.example
              : exampleFromSchema(doc, json.schema, 0, new Set());
          if (ex !== null && ex !== undefined) {
            body = JSON.stringify(ex, null, 2);
            bodyType = "json";
          }
        }
      } else {
        const bodyParam = params.find((p) => p.in === "body");
        if (bodyParam) {
          const ex = exampleFromSchema(doc, bodyParam.schema, 0, new Set());
          if (ex !== null && ex !== undefined) {
            body = JSON.stringify(ex, null, 2);
            bodyType = "json";
          }
        }
      }

      const templated = path.replace(/\{([^}]+)\}/g, "{{$1}}");
      const qs = query.length ? `?${query.join("&")}` : "";
      const auth = authFor(op.security);

      endpoints.push({
        method,
        url: `{{base}}${templated}${qs}`,
        name:
          (op.summary as string) ||
          (op.operationId as string) ||
          `${method} ${path}`,
        headers,
        body,
        bodyType,
        authType: auth.authType,
        authConfig: auth.authConfig,
        tag: (op.tags as string[] | undefined)?.[0] ?? null,
      });
    }
  }
  return { endpoints, servers };
};

/**
 * Parse an OpenAPI/Swagger document (v2 or v3), JSON or YAML, into runnable
 * endpoints: path/query params, example request bodies (schemas resolved), and
 * auth mapped from securitySchemes. Returns null if the text isn't a spec.
 */
export const parseOpenApi = (raw: string): OpenApiParse | null => {
  const text = raw.trim();
  if (!text) return null;
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    try {
      doc = parseYaml(text);
    } catch {
      return null;
    }
  }
  return parseOpenApiDoc(doc);
};

/**
 * Given a Swagger UI / Redoc HTML page, find the spec URL it renders from
 * (`SwaggerUIBundle({ url })`, `urls: [{ url }]`, Redoc `spec-url` / init).
 * Relative URLs resolve against the page. Returns null if none is advertised.
 */
export const discoverSpecUrl = (html: string, pageUrl: string): string | null => {
  const abs = (u: string): string => {
    try {
      return new URL(u, pageUrl).href;
    } catch {
      return u;
    }
  };
  const asset = /swagger-ui|redoc(\.min)?\.js|\.js(\?|$)|\.css(\?|$)|favicon/i;
  const patterns: RegExp[] = [
    /spec-url\s*=\s*["']([^"']+)["']/i,
    /Redoc\.init\(\s*["']([^"']+)["']/i,
    /urls\s*:\s*\[\s*\{[^}]*?url\s*:\s*["']([^"']+)["']/i,
    /["']?url["']?\s*:\s*["']([^"']+\.(?:json|ya?ml)(?:\?[^"']*)?)["']/i,
    /["']?url["']?\s*:\s*["']([^"']*(?:api-docs|openapi|swagger)[^"']*)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1] && !asset.test(m[1])) return abs(m[1]);
  }
  return null;
};

/** Conventional spec locations to probe when a page advertises none. */
export const commonSpecPaths = (pageUrl: string): string[] => {
  let u: URL;
  try {
    u = new URL(pageUrl);
  } catch {
    return [];
  }
  const dir = u.pathname.replace(/\/[^/]*$/, "");
  const names = [
    "openapi.json",
    "swagger.json",
    "openapi.yaml",
    "openapi.yml",
    "swagger.yaml",
    "v3/api-docs",
    "api-docs",
    "v2/api-docs",
    "api/v3/openapi.json",
  ];
  const out = new Set<string>();
  for (const base of [u.origin, `${u.origin}${dir}`]) {
    for (const n of names) out.add(`${base.replace(/\/$/, "")}/${n}`);
  }
  return [...out];
};
