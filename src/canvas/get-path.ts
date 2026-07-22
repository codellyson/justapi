import type { HttpResponse } from "../utils/http";

/**
 * Tokenize a dot/bracket path: `a.b[0].c` → ["a", "b", "0", "c"].
 * Returns null on malformed input.
 */
const tokenizePath = (path: string): string[] | null => {
  const tokens: string[] = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  while ((match = re.exec(path)) !== null) {
    // Reject stretches the regex skipped (e.g. `a..b`, `a[b]`).
    const between = path.slice(lastIndex, match.index).replace(/\./g, "");
    if (between) return null;
    lastIndex = re.lastIndex;
    tokens.push(match[1] ?? match[2]);
  }
  const tail = path.slice(lastIndex).replace(/\./g, "");
  if (tail) return null;
  return tokens;
};

/** Walk `data` along a dot/bracket path. Undefined when the path misses. */
export const getPath = (data: unknown, path: string): unknown => {
  const tokens = tokenizePath(path.trim());
  if (!tokens || tokens.length === 0) return undefined;
  let cur: unknown = data;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(t);
      if (!Number.isInteger(idx)) return undefined;
      cur = cur[idx];
    } else if (typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[t];
    } else {
      return undefined;
    }
  }
  return cur;
};

/**
 * Extract a value from a response envelope. Root keywords `status`,
 * `statusText`, and `headers.*` address the envelope itself; an optional
 * `data.` or `body.` prefix (or no prefix at all) addresses the payload.
 */
export const extractFromResponse = (
  response: HttpResponse,
  path: string
): unknown => {
  const p = path.trim();
  if (!p) return undefined;
  if (p === "status") return response.status;
  if (p === "statusText") return response.statusText;
  if (p === "headers") return response.headers;
  if (p.startsWith("headers.")) {
    // Header names are case-insensitive; try exact then lowercased.
    const name = p.slice("headers.".length);
    return (
      response.headers[name] ?? response.headers[name.toLowerCase()]
    );
  }
  if (p === "data" || p === "body") return response.data;
  if (p.startsWith("data.") || p.startsWith("data[")) {
    return getPath(response.data, p.slice("data".length).replace(/^\./, ""));
  }
  if (p.startsWith("body.") || p.startsWith("body[")) {
    return getPath(response.data, p.slice("body".length).replace(/^\./, ""));
  }
  return getPath(response.data, p);
};

/** Stringify an extracted value for use as a variable/header value. */
export const extractedToString = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};
