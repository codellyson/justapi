import 'server-only';
import { put as blobPut, head, BlobNotFoundError } from '@vercel/blob';

const blobPath = (id: string) => `shares/${id}.json`;

export async function put(id: string, data: string): Promise<void> {
  await blobPut(blobPath(id), data, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    cacheControlMaxAge: 31536000,
  });
}

export async function get(id: string): Promise<string | null> {
  try {
    const blob = await head(blobPath(id));
    const res = await fetch(blob.url);
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
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
