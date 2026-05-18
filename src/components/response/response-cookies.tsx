'use client';

import { useMemo } from 'react';
import { HttpResponse } from '../../utils/http';
import { parseCookie, type ParsedCookie } from '../../utils/cookies';

interface ResponseCookiesProps {
  response: HttpResponse;
}

export const ResponseCookies = ({ response }: ResponseCookiesProps) => {
  const cookies = useMemo<ParsedCookie[]>(() => {
    const raws = response.cookies || [];
    return raws.map(parseCookie).filter((c): c is ParsedCookie => c !== null);
  }, [response]);

  if (response.cookies === undefined) {
    return (
      <div className="p-4 text-xs text-muted">
        Cookies aren&apos;t visible for direct browser requests. The proxy path surfaces them automatically.
      </div>
    );
  }

  if (cookies.length === 0) {
    return <div className="p-4 text-xs text-muted">No cookies set by this response.</div>;
  }

  return (
    <div className="p-4 space-y-2">
      {cookies.map((c, i) => (
        <div
          key={`${c.name}-${i}`}
          className="border border-border rounded-md p-3 bg-bg-secondary text-xs font-mono"
        >
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-primary font-semibold">{c.name}</span>
            <span className="text-muted">=</span>
            <span className="text-secondary break-all">{c.value}</span>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
            {c.domain && <Attr label="Domain" value={c.domain} />}
            {c.path && <Attr label="Path" value={c.path} />}
            {c.expires && <Attr label="Expires" value={c.expires} />}
            {c.maxAge && <Attr label="Max-Age" value={c.maxAge} />}
            {c.sameSite && <Attr label="SameSite" value={c.sameSite} />}
            {(c.httpOnly || c.secure) && (
              <>
                <span className="text-muted">Flags</span>
                <span className="text-primary">
                  {[c.httpOnly && 'HttpOnly', c.secure && 'Secure']
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const Attr = ({ label, value }: { label: string; value: string }) => (
  <>
    <span className="text-muted">{label}</span>
    <span className="text-primary break-all">{value}</span>
  </>
);
