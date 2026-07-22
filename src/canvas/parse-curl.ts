import type { HttpMethod } from "../utils/http";
import type { AuthType, BodyType, AuthConfig } from "./types";

export interface ParsedRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: string;
  bodyType: BodyType;
  authType: AuthType;
  authConfig: AuthConfig;
}

const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

/**
 * Shell-style tokenizer. Handles:
 *   - single quotes (literal, no escapes)
 *   - double quotes (backslash-escaped chars)
 *   - backslash escapes outside quotes
 *   - backslash-newline line continuations
 * Not a full bash parser; covers >95% of cURL pastes seen in the wild.
 */
const tokenize = (input: string): string[] => {
  const tokens: string[] = [];
  let current = "";
  let hasCurrent = false;
  let i = 0;
  const len = input.length;

  const push = () => {
    if (hasCurrent) {
      tokens.push(current);
      current = "";
      hasCurrent = false;
    }
  };

  while (i < len) {
    const ch = input[i];

    if (ch === "\\" && i + 1 < len) {
      const next = input[i + 1];
      if (next === "\n" || next === "\r") {
        // Line continuation — skip the backslash and the newline.
        i += 2;
        if (next === "\r" && input[i] === "\n") i++;
        continue;
      }
      current += next;
      hasCurrent = true;
      i += 2;
      continue;
    }

    if (ch === '"') {
      hasCurrent = true;
      i++;
      while (i < len && input[i] !== '"') {
        if (input[i] === "\\" && i + 1 < len) {
          current += input[i + 1];
          i += 2;
        } else {
          current += input[i];
          i++;
        }
      }
      i++;
      continue;
    }

    if (ch === "'") {
      hasCurrent = true;
      i++;
      while (i < len && input[i] !== "'") {
        current += input[i];
        i++;
      }
      i++;
      continue;
    }

    if (/\s/.test(ch)) {
      push();
      i++;
      continue;
    }

    current += ch;
    hasCurrent = true;
    i++;
  }

  push();
  return tokens;
};

const tryParseJson = (text: string): boolean => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

const stripDollarPrefix = (input: string): string => {
  // Tolerate "$ curl ..." that people often paste from docs.
  const t = input.trim();
  if (t.startsWith("$ ")) return t.slice(2);
  if (t.startsWith("$\t")) return t.slice(2);
  return t;
};

/**
 * Parse a cURL command string into a structured request. Returns null if the
 * input isn't a recognizable cURL command (so the caller can fall through to
 * other parsers).
 */
export const parseCurl = (raw: string): ParsedRequest | null => {
  const cleaned = stripDollarPrefix(raw).trim();
  if (!cleaned.toLowerCase().startsWith("curl")) return null;

  // Strip the leading "curl" word so the tokenizer only sees flags + args.
  const body = cleaned.slice(4).trimStart();
  const tokens = tokenize(body);
  if (tokens.length === 0) return null;

  let method: HttpMethod = "GET";
  let url = "";
  const headers: Record<string, string> = {};
  const dataBuffer: string[] = [];
  let isUrlEncoded = false;
  let authType: AuthType = "none";
  const authConfig: AuthConfig = {};

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = tokens[i + 1];

    if (t === "-X" || t === "--request") {
      if (next) {
        const m = next.toUpperCase();
        if (HTTP_METHODS.includes(m as HttpMethod)) {
          method = m as HttpMethod;
        }
        i++;
      }
      continue;
    }

    if (t === "-H" || t === "--header") {
      if (next) {
        const colon = next.indexOf(":");
        if (colon > 0) {
          const k = next.slice(0, colon).trim();
          const v = next.slice(colon + 1).trim();
          const lk = k.toLowerCase();
          if (lk === "authorization") {
            const lv = v.toLowerCase();
            if (lv.startsWith("bearer ")) {
              authType = "bearer";
              authConfig.bearerToken = v.slice(7).trim();
            } else if (lv.startsWith("basic ")) {
              authType = "basic";
              try {
                const decoded = atob(v.slice(6).trim());
                const split = decoded.indexOf(":");
                if (split >= 0) {
                  authConfig.username = decoded.slice(0, split);
                  authConfig.password = decoded.slice(split + 1);
                }
              } catch {
                headers[k] = v;
              }
            } else {
              headers[k] = v;
            }
          } else {
            headers[k] = v;
          }
        }
        i++;
      }
      continue;
    }

    if (
      t === "-d" ||
      t === "--data" ||
      t === "--data-raw" ||
      t === "--data-binary" ||
      t === "--data-ascii"
    ) {
      if (next !== undefined) {
        dataBuffer.push(next);
        if (method === "GET") method = "POST";
        i++;
      }
      continue;
    }

    if (t === "--data-urlencode") {
      if (next !== undefined) {
        dataBuffer.push(next);
        isUrlEncoded = true;
        if (method === "GET") method = "POST";
        i++;
      }
      continue;
    }

    if (t === "-u" || t === "--user") {
      if (next) {
        const colon = next.indexOf(":");
        if (colon >= 0) {
          authConfig.username = next.slice(0, colon);
          authConfig.password = next.slice(colon + 1);
        } else {
          authConfig.username = next;
        }
        authType = "basic";
        i++;
      }
      continue;
    }

    if (t === "--url") {
      if (next) {
        url = next;
        i++;
      }
      continue;
    }

    if (t === "-G" || t === "--get") {
      method = "GET";
      continue;
    }

    // Flags we silently ignore (no-arg).
    if (
      t === "-L" ||
      t === "--location" ||
      t === "-k" ||
      t === "--insecure" ||
      t === "--compressed" ||
      t === "-s" ||
      t === "--silent" ||
      t === "-v" ||
      t === "--verbose" ||
      t === "-i" ||
      t === "--include" ||
      t === "-I" ||
      t === "--head" ||
      t === "-f" ||
      t === "--fail" ||
      t === "-O" ||
      t === "--remote-name"
    ) {
      continue;
    }

    // Flags with an argument we silently consume.
    if (
      t === "-A" ||
      t === "--user-agent" ||
      t === "-e" ||
      t === "--referer" ||
      t === "-o" ||
      t === "--output" ||
      t === "--max-time" ||
      t === "--connect-timeout" ||
      t === "--cacert" ||
      t === "--cert" ||
      t === "--key" ||
      t === "-b" ||
      t === "--cookie" ||
      t === "--cookie-jar"
    ) {
      if (next !== undefined) i++;
      continue;
    }

    // Only treat tokens that actually look like URLs as the URL — don't
    // greedily claim arbitrary non-flag tokens. If nothing URL-shaped is
    // present, return null so other parsers (DevTools labels, raw fetch)
    // can have a crack at it.
    if (!t.startsWith("-")) {
      if (
        !url &&
        (t.startsWith("http://") ||
          t.startsWith("https://") ||
          t.startsWith("/"))
      ) {
        url = t;
      }
    }
  }

  if (!url) return null;

  const bodyText = dataBuffer.join("&");
  let bodyType: BodyType = "none";
  if (bodyText) {
    if (isUrlEncoded) {
      bodyType = "raw";
    } else if (tryParseJson(bodyText)) {
      bodyType = "json";
    } else {
      bodyType = "raw";
    }
  }

  // If a Content-Type header was provided, respect it for bodyType detection.
  const ctEntry = Object.entries(headers).find(
    ([k]) => k.toLowerCase() === "content-type"
  );
  if (ctEntry && bodyText) {
    const ct = ctEntry[1].toLowerCase();
    if (ct.includes("json")) bodyType = "json";
    else bodyType = "raw";
  }

  return {
    method,
    url,
    headers,
    body: bodyText,
    bodyType,
    authType,
    authConfig,
  };
};

/**
 * Match "METHOD https://..." or "METHOD /path" — quick paste from API docs
 * or request lines copied out of HTTP logs.
 */
export const parseMethodUrl = (raw: string): ParsedRequest | null => {
  const t = raw.trim();
  const m = t.match(
    /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(https?:\/\/\S+|\/\S+)\s*$/i
  );
  if (!m) return null;
  return {
    method: m[1].toUpperCase() as HttpMethod,
    url: m[2],
    headers: {},
    body: "",
    bodyType: "none",
    authType: "none",
    authConfig: {},
  };
};

/**
 * Chrome DevTools labeled-line format. Recognizes lines like
 * `Request URL: https://...` and `Request Method: GET`. Also extracts
 * the optional `Request Headers` block when present. Tolerant of the
 * "no colon" variant some users get when copy-pastes flatten newlines.
 */
export const parseDevtools = (raw: string): ParsedRequest | null => {
  const text = raw.trim();
  const urlMatch = text.match(/request\s+url\s*:?\s*(https?:\/\/\S+)/i);
  if (!urlMatch) return null;

  const methodMatch = text.match(
    /request\s+method\s*:?\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/i
  );

  const headers: Record<string, string> = {};
  let authType: AuthType = "none";
  const authConfig: AuthConfig = {};

  // Optional: scan a "Request Headers" section.
  const headersBlockMatch = text.match(/request\s+headers([\s\S]*)$/i);
  if (headersBlockMatch) {
    const lines = headersBlockMatch[1].split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      // Stop if we hit another labeled section.
      if (
        /^(response\s+headers|status\s+code|remote\s+address|referrer\s+policy|form\s+data|query\s+string|payload)/i.test(
          line
        )
      ) {
        break;
      }
      // Skip HTTP/2 pseudo-headers (:authority, :method, :path, :scheme).
      if (line.startsWith(":")) continue;
      const colon = line.indexOf(":");
      if (colon <= 0) continue;
      const k = line.slice(0, colon).trim();
      const v = line.slice(colon + 1).trim();
      if (!k || !v) continue;
      const lk = k.toLowerCase();
      if (lk === "authorization") {
        const lv = v.toLowerCase();
        if (lv.startsWith("bearer ")) {
          authType = "bearer";
          authConfig.bearerToken = v.slice(7).trim();
          continue;
        }
        if (lv.startsWith("basic ")) {
          authType = "basic";
          try {
            const decoded = atob(v.slice(6).trim());
            const split = decoded.indexOf(":");
            if (split >= 0) {
              authConfig.username = decoded.slice(0, split);
              authConfig.password = decoded.slice(split + 1);
            }
            continue;
          } catch {
            /* fall through and keep as header */
          }
        }
      }
      headers[k] = v;
    }
  }

  return {
    method: (methodMatch?.[1].toUpperCase() ?? "GET") as HttpMethod,
    url: urlMatch[1],
    headers,
    body: "",
    bodyType: "none",
    authType,
    authConfig,
  };
};

/**
 * Smart paste entry point: returns a structured request if the input matches
 * any supported shape, otherwise null (caller should let the paste flow
 * through as plain text).
 */
export const smartParse = (raw: string): ParsedRequest | null => {
  return parseCurl(raw) ?? parseDevtools(raw) ?? parseMethodUrl(raw);
};
