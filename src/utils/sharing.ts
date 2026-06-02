import { AuthType, BodyType, useRequestStore } from '../stores/use-request-store';
import { KeyValuePair } from '../components/ui/key-value-editor';
import { HttpMethod } from './http';

export interface ShareableRequestConfig {
  method: string;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  bodyType: string;
  body: string;
  authType: string;
  authConfig: {
    bearerToken?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
}

type CompactKV = { k: string; v?: string };
type CompactWire = {
  m?: string;            // method (omitted when GET)
  u: string;             // url
  p?: CompactKV[];       // params
  h?: CompactKV[];       // headers
  bt?: string;           // bodyType (omitted when none)
  b?: string;            // body
  at?: string;           // authType (omitted when none)
  ac?: ShareableRequestConfig['authConfig'];
};

const compactKVs = (items: KeyValuePair[]): CompactKV[] =>
  items
    .filter((it) => it.enabled && it.key)
    .map((it) => (it.value ? { k: it.key, v: it.value } : { k: it.key }));

const expandKVs = (items: CompactKV[] | undefined): KeyValuePair[] =>
  (items || []).map((it, i) => ({
    id: String(i + 1),
    key: it.k,
    value: it.v || '',
    enabled: true,
  }));

const compact = (cfg: ShareableRequestConfig): CompactWire => {
  const wire: CompactWire = { u: cfg.url };
  if (cfg.method && cfg.method !== 'GET') wire.m = cfg.method;
  const params = compactKVs(cfg.params);
  if (params.length) wire.p = params;
  const headers = compactKVs(cfg.headers);
  if (headers.length) wire.h = headers;
  if (cfg.bodyType && cfg.bodyType !== 'none') wire.bt = cfg.bodyType;
  if (cfg.body) wire.b = cfg.body;
  if (cfg.authType && cfg.authType !== 'none') wire.at = cfg.authType;
  if (cfg.authConfig && Object.keys(cfg.authConfig).length > 0) {
    wire.ac = cfg.authConfig;
  }
  return wire;
};

const expand = (wire: CompactWire): ShareableRequestConfig => ({
  method: wire.m || 'GET',
  url: wire.u || '',
  params: expandKVs(wire.p),
  headers: expandKVs(wire.h),
  bodyType: wire.bt || 'none',
  body: wire.b || '',
  authType: wire.at || 'none',
  authConfig: wire.ac || {},
});

function currentWire(): CompactWire {
  const state = useRequestStore.getState();
  const config: ShareableRequestConfig = {
    method: state.method,
    url: state.url,
    params: state.params,
    headers: state.headers,
    bodyType: state.bodyType,
    body: state.body,
    authType: state.authType,
    authConfig: state.authType === 'none' ? state.authConfig : {},
  };
  return compact(config);
}

/**
 * POST the request to /api/share and return a short `/playground?s=ID`
 * link. Throws if the storage backend is unavailable — callers should
 * catch and surface the failure to the user.
 *
 * Accepts an optional `config` so any caller — not just the legacy
 * draft store — can produce a share link. With no argument it reads
 * the current legacy draft.
 */
export const generateShareableLink = async (
  config?: ShareableRequestConfig
): Promise<string> => {
  const wire = config ? compact(config) : currentWire();
  const res = await fetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wire),
  });
  if (!res.ok) {
    throw new Error(`Share API returned ${res.status}`);
  }
  const { id } = (await res.json()) as { id?: string };
  if (!id) throw new Error('Share API returned no id');
  return `${window.location.origin}/playground?s=${id}`;
};

export const loadConfigFromUrl = async (): Promise<ShareableRequestConfig | null> => {
  if (typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  const shareId = url.searchParams.get('s');
  if (!shareId) return null;

  try {
    const res = await fetch(`/api/share/${encodeURIComponent(shareId)}`);
    if (res.ok) {
      const wire = (await res.json()) as CompactWire;
      return expand(wire);
    }
  } catch (error) {
    console.error('Failed to fetch shared request:', error);
  }
  return null;
};

export const applySharedConfig = (config: ShareableRequestConfig): void => {
  const {
    setMethod,
    setUrl,
    setParams,
    setHeaders,
    setBodyType,
    setBody,
    setAuthType,
    setAuthConfig,
  } = useRequestStore.getState();

  setMethod(config.method as unknown as HttpMethod);
  setBodyType(config.bodyType as BodyType);
  setAuthType(config.authType as AuthType);
  setUrl(config.url);
  setBody(config.body || '');
  setParams(config.params || []);
  setHeaders(config.headers || []);
  setAuthConfig(config.authConfig || {});
};
