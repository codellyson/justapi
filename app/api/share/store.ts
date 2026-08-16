import 'server-only';

const objectKey = (id: string) => `shares/${id}.json`;

export async function put(
  bucket: R2Bucket,
  id: string,
  data: string
): Promise<void> {
  await bucket.put(objectKey(id), data, {
    httpMetadata: {
      contentType: 'application/json',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
}

export async function get(
  bucket: R2Bucket,
  id: string
): Promise<string | null> {
  const obj = await bucket.get(objectKey(id));
  if (!obj) return null;
  return await obj.text();
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
