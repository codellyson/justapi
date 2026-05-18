import type { CapturedRequest } from './extension-bridge';

interface HarHeader {
  name: string;
  value: string;
}

interface HarEntry {
  startedDateTime?: string;
  time?: number;
  request?: {
    method?: string;
    url?: string;
    headers?: HarHeader[];
    postData?: { text?: string; mimeType?: string };
  };
  response?: {
    status?: number;
    statusText?: string;
    headers?: HarHeader[];
    content?: { text?: string; mimeType?: string; size?: number };
  };
  _initiator?: { type?: string; stack?: { callFrames?: Array<{ url?: string; lineNumber?: number; functionName?: string }> } };
}

interface HarFile {
  log?: { entries?: HarEntry[] };
}

function headersToObject(headers: HarHeader[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  (headers || []).forEach((h) => {
    if (h?.name) out[h.name] = h.value ?? '';
  });
  return out;
}

function initiatorToString(init: HarEntry['_initiator']): string {
  if (!init) return '';
  const frames = init.stack?.callFrames || [];
  if (frames.length === 0) return init.type || '';
  return frames
    .map((f) => `    at ${f.functionName || '<anonymous>'} (${f.url || '?'}:${f.lineNumber ?? 0})`)
    .join('\n');
}

export function parseHar(raw: string): CapturedRequest[] {
  let parsed: HarFile;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Not valid JSON');
  }
  const entries = parsed?.log?.entries;
  if (!Array.isArray(entries)) {
    throw new Error('No entries found (expected log.entries array)');
  }

  return entries
    .map<CapturedRequest | null>((entry, i) => {
      const req = entry.request;
      const res = entry.response;
      if (!req?.url || !req.method) return null;

      const startTime = entry.startedDateTime
        ? new Date(entry.startedDateTime).getTime()
        : Date.now();
      const timeMs = Math.round(entry.time ?? 0);

      const responseBody = res?.content?.text ?? '';
      const mimeType = res?.content?.mimeType ?? '';
      const size = res?.content?.size ?? new Blob([responseBody]).size;

      return {
        localId: i,
        requestId: `har-${startTime}-${i}`,
        method: req.method,
        url: req.url,
        requestHeaders: headersToObject(req.headers),
        requestBody: req.postData?.text ?? '',
        requestHasBody: !!req.postData?.text,
        status: res?.status ?? 0,
        statusText: res?.statusText ?? '',
        responseHeaders: headersToObject(res?.headers),
        responseBody,
        mimeType,
        resourceType: 'xhr',
        initiator: initiatorToString(entry._initiator),
        startTime,
        endTime: startTime + timeMs,
        timeMs,
        size,
        failed: (res?.status ?? 0) === 0,
        errorText: '',
      };
    })
    .filter((c): c is CapturedRequest => c !== null);
}
