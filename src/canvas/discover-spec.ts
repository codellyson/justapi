import {
  parseOpenApi,
  discoverSpecUrl,
  commonSpecPaths,
  type OpenApiEndpoint,
} from "./parse-openapi";

export interface DiscoverResult {
  endpoints: OpenApiEndpoint[];
  servers: string[];
}
export interface DiscoverError {
  error: string;
}

interface Fetched {
  status: number;
  text: string;
}

const proxyGetText = async (
  url: string,
  authHeader?: string
): Promise<Fetched | null> => {
  const headers: Record<string, string> = { Accept: "*/*" };
  if (authHeader) headers.Authorization = authHeader;
  let res: Response;
  try {
    res = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, method: "GET", headers }),
    });
  } catch {
    return null;
  }
  const json = (await res.json().catch(() => null)) as
    | { status?: number; data?: unknown }
    | null;
  if (!json) return null;
  const text =
    typeof json.data === "string" ? json.data : JSON.stringify(json.data ?? "");
  return { status: json.status ?? 0, text };
};

/** Extract the first balanced `{…}`/`[…]` that follows a matched key — used to
 *  pull an inlined `swaggerDoc` object out of Swagger UI's init script. */
const extractBalanced = (text: string, keyRe: RegExp): string | null => {
  const m = keyRe.exec(text);
  if (!m) return null;
  let i = m.index + m[0].length;
  while (i < text.length && text[i] !== "{" && text[i] !== "[") i++;
  if (i >= text.length) return null;
  const open = text[i];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  const start = i;
  for (; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
};

const SWAGGER_DOC = /["']?swaggerDoc["']?\s*:/;

/** Spec URLs / init scripts referenced from a Swagger-UI-style HTML page. */
const findRefs = (html: string): string[] => {
  const refs: string[] = [];
  const init = html.match(/["']([^"']*swagger-ui-init\.js)["']/i);
  if (init) refs.push(init[1]);
  const fileRe = /["']([^"'\s]+\.(?:json|ya?ml))(?:\?[^"']*)?["']/gi;
  let m: RegExpExecArray | null;
  while ((m = fileRe.exec(html))) refs.push(m[1]);
  const cfgRe = /(?:configUrl|spec-url|data-url|url)\s*[:=]\s*["']([^"']+)["']/gi;
  while ((m = cfgRe.exec(html))) {
    if (/\.(?:json|ya?ml)(?:\?|$)/i.test(m[1])) refs.push(m[1]);
  }
  return [...new Set(refs)];
};

/** Base URL that relative refs resolve against — treat a slashless, extension-
 *  less path (e.g. /api-docs) as the directory /api-docs/. */
const dirOf = (startUrl: string): string => {
  try {
    const u = new URL(startUrl);
    if (!u.pathname.endsWith("/") && !/\.[a-z0-9]+$/i.test(u.pathname)) {
      u.pathname += "/";
    }
    return u.href;
  } catch {
    return startUrl;
  }
};

const resolveServers = (servers: string[], sourceUrl: string): string[] =>
  servers.map((s) => {
    if (/^https?:\/\//i.test(s)) return s;
    try {
      return new URL(s || "/", sourceUrl).href.replace(/\/$/, "");
    } catch {
      return s;
    }
  });

const specFrom = (text: string, sourceUrl: string): DiscoverResult | null => {
  const direct = parseOpenApi(text);
  if (direct && direct.endpoints.length) {
    return {
      endpoints: direct.endpoints,
      servers: resolveServers(direct.servers, sourceUrl),
    };
  }
  const inline = extractBalanced(text, SWAGGER_DOC);
  if (inline) {
    const eps = parseOpenApi(inline);
    if (eps && eps.endpoints.length) {
      return {
        endpoints: eps.endpoints,
        servers: resolveServers(eps.servers, sourceUrl),
      };
    }
  }
  return null;
};

/**
 * Resolve a URL to OpenAPI endpoints. Handles a raw spec (JSON/YAML), a spec
 * inlined into Swagger UI's `swagger-ui-init.js`, or an HTML docs page that
 * references either. `authHeader` is forwarded to every hop (protected specs).
 */
export const discoverSpec = async (
  startUrl: string,
  authHeader?: string
): Promise<DiscoverResult | DiscoverError> => {
  const first = await proxyGetText(startUrl, authHeader);
  if (!first) return { error: "couldn't reach that URL" };
  if (first.status >= 400) {
    const auth = first.status === 401 || first.status === 403;
    return {
      error: `the URL returned ${first.status}${
        auth ? " — add the Authorization for a protected spec" : ""
      }`,
    };
  }

  // The entry response may already be the spec, or a Swagger-UI init script /
  // HTML page that inlines it as `swaggerDoc`.
  const direct = specFrom(first.text, startUrl);
  if (direct) return direct;

  // Otherwise chase candidate spec URLs: the one the page advertises, then any
  // referenced init script / .json / .yaml, then conventional locations.
  const dir = dirOf(startUrl);
  const urls: string[] = [];
  const advertised = discoverSpecUrl(first.text, startUrl);
  if (advertised) urls.push(advertised);
  for (const ref of findRefs(first.text)) {
    try {
      urls.push(new URL(ref, dir).href);
    } catch {
      /* skip malformed ref */
    }
  }
  urls.push(...commonSpecPaths(startUrl));

  const tried = new Set<string>([startUrl]);
  for (const url of urls.slice(0, 14)) {
    if (tried.has(url)) continue;
    tried.add(url);
    const body = await proxyGetText(url, authHeader);
    if (!body || body.status >= 400) continue;
    const eps = specFrom(body.text, url);
    if (eps) return eps;
  }

  return { error: "found the page but couldn't locate an OpenAPI spec in it" };
};
