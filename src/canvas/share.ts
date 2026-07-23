"use client";

import type { HttpMethod } from "../utils/http";
import type { AuthType, BodyType, CardRequestSnapshot } from "./types";

/** Compact wire format stored by /api/share (kept from the v1 sharer so
 *  old share links keep resolving). */
interface CompactKV {
  k: string;
  v?: string;
}
interface CompactWire {
  m?: string;
  u: string;
  p?: CompactKV[];
  h?: CompactKV[];
  bt?: string;
  b?: string;
  at?: string;
  ac?: Record<string, string | undefined>;
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

const wireToSnapshot = (wire: CompactWire): CardRequestSnapshot | null => {
  const url = (wire.u ?? "").trim();
  if (!url) return null;

  // Legacy shares carried query params separately — fold them into the URL.
  let fullUrl = url;
  const params = (wire.p ?? []).filter((kv) => kv.k);
  if (params.length > 0) {
    const qs = params
      .map((kv) => `${encodeURIComponent(kv.k)}=${encodeURIComponent(kv.v ?? "")}`)
      .join("&");
    fullUrl += (fullUrl.includes("?") ? "&" : "?") + qs;
  }

  const headers: Record<string, string> = {};
  (wire.h ?? []).forEach((kv) => {
    if (kv.k) headers[kv.k] = kv.v ?? "";
  });

  const method = METHODS.includes((wire.m ?? "GET") as HttpMethod)
    ? ((wire.m ?? "GET") as HttpMethod)
    : "GET";

  return {
    method,
    url: fullUrl,
    urlRaw: fullUrl,
    headers,
    body: wire.b || null,
    bodyType: (wire.bt as BodyType) || "none",
    authType: (wire.at as AuthType) || "none",
    authConfig: wire.ac ?? {},
  };
};

/**
 * If the current URL carries a `?s=ID` share link, resolve it to a request
 * snapshot and strip the param from the address bar. Returns null when
 * there's nothing to load.
 */
export const loadSharedSnapshot =
  async (): Promise<CardRequestSnapshot | null> => {
    if (typeof window === "undefined") return null;
    const url = new URL(window.location.href);
    const shareId = url.searchParams.get("s");
    if (!shareId) return null;

    url.searchParams.delete("s");
    window.history.replaceState({}, "", url.pathname + url.search);

    try {
      const res = await fetch(`/api/share/${encodeURIComponent(shareId)}`);
      if (!res.ok) return null;
      const wire = (await res.json()) as CompactWire;
      return wireToSnapshot(wire);
    } catch {
      return null;
    }
  };
