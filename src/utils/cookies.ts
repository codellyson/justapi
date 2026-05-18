export interface ParsedCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  maxAge?: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
}

const ATTR_MAP: Record<string, keyof ParsedCookie> = {
  domain: 'domain',
  path: 'path',
  expires: 'expires',
  'max-age': 'maxAge',
  samesite: 'sameSite',
};

export function parseCookie(raw: string): ParsedCookie | null {
  const parts = raw.split(';').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const [first, ...rest] = parts;
  const eq = first.indexOf('=');
  if (eq === -1) return null;
  const cookie: ParsedCookie = {
    name: first.slice(0, eq).trim(),
    value: first.slice(eq + 1).trim(),
    httpOnly: false,
    secure: false,
  };
  for (const part of rest) {
    const [k, ...vRest] = part.split('=');
    const key = k.trim().toLowerCase();
    const value = vRest.join('=').trim();
    if (key === 'httponly') cookie.httpOnly = true;
    else if (key === 'secure') cookie.secure = true;
    else if (ATTR_MAP[key]) {
      (cookie as unknown as Record<string, string>)[ATTR_MAP[key]] = value;
    }
  }
  return cookie;
}
