import type { HttpMethod } from './http';

const METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

const URL_PATTERN = /^(https?:\/\/|\/)\S+/i;

export interface QuickRequest {
  method: HttpMethod;
  url: string;
}

/**
 * Parses palette input as a one-shot HTTP request.
 * Accepts:
 *   - `https://api.example.com/path`
 *   - `GET https://api.example.com/path`
 *   - `/relative/path` (resolves against window.location.origin)
 * Returns null if the input doesn't look like a request line.
 */
export function parseQuickRequest(raw: string): QuickRequest | null {
  const input = raw.trim();
  if (!input) return null;

  const tokens = input.split(/\s+/);
  let method: HttpMethod = 'GET';
  let rest = input;

  const firstUpper = tokens[0].toUpperCase();
  if (METHODS.includes(firstUpper as HttpMethod)) {
    method = firstUpper as HttpMethod;
    rest = tokens.slice(1).join(' ');
  }

  if (!URL_PATTERN.test(rest)) return null;

  let url = rest;
  if (url.startsWith('/') && typeof window !== 'undefined') {
    url = window.location.origin + url;
  }

  return { method, url };
}
