// Pluggable storage for share links.
// Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set, falls back to an
// in-memory Map for local dev. The memory map is per-instance, so on Vercel
// without Blob configured shares break across cold starts.

import 'server-only';

const memory = new Map<string, string>();

function hasBlobToken(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

const blobPath = (id: string) => `shares/${id}.json`;

export async function put(id: string, data: string): Promise<void> {
  if (!hasBlobToken()) {
    memory.set(id, data);
    return;
  }
  const { put: blobPut } = await import('@vercel/blob');
  await blobPut(blobPath(id), data, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    cacheControlMaxAge: 31536000,
  });
}

export async function get(id: string): Promise<string | null> {
  if (!hasBlobToken()) return memory.get(id) ?? null;
  try {
    const { head } = await import('@vercel/blob');
    const blob = await head(blobPath(id));
    const res = await fetch(blob.url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const ALPHABET =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateId(length = 7): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

const ID_PATTERN = /^[a-zA-Z0-9]{4,16}$/;

export function isValidId(id: string): boolean {
  return ID_PATTERN.test(id);
}
