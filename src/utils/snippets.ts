import { HttpMethod } from './http';

export interface SnippetRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

const q = (s: string): string => JSON.stringify(s);

export function toCurl(req: SnippetRequest): string {
  const parts: string[] = [`curl --request ${req.method}`];
  parts.push(`  --url ${q(req.url)}`);
  Object.entries(req.headers).forEach(([k, v]) => {
    parts.push(`  --header ${q(`${k}: ${v}`)}`);
  });
  if (req.body && req.method !== 'GET' && req.method !== 'HEAD') {
    parts.push(`  --data ${q(req.body)}`);
  }
  return parts.join(' \\\n');
}

export function toFetch(req: SnippetRequest): string {
  const init: Record<string, unknown> = { method: req.method };
  if (Object.keys(req.headers).length > 0) init.headers = req.headers;
  if (req.body && req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req.body;
  }
  const initStr = JSON.stringify(init, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : '  ' + line))
    .join('\n');
  return `const response = await fetch(${q(req.url)}, ${initStr});
const data = await response.json();
console.log(data);`;
}

export function toAxios(req: SnippetRequest): string {
  const config: Record<string, unknown> = {
    method: req.method.toLowerCase(),
    url: req.url,
  };
  if (Object.keys(req.headers).length > 0) config.headers = req.headers;
  if (req.body && req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      config.data = JSON.parse(req.body);
    } catch {
      config.data = req.body;
    }
  }
  const configStr = JSON.stringify(config, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : '  ' + line))
    .join('\n');
  return `import axios from 'axios';

const response = await axios(${configStr});
console.log(response.data);`;
}

export const snippetGenerators = {
  curl: toCurl,
  fetch: toFetch,
  axios: toAxios,
} as const;

export type SnippetLang = keyof typeof snippetGenerators;
