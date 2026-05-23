"use client";

import { useState } from "react";
import type { HttpResponse } from "../../utils/http";
import { Copy, Check } from "lucide-react";

interface ResultHeadersProps {
  response: HttpResponse;
}

interface RowProps {
  name: string;
  value: string;
}

const Row = ({ name, value }: RowProps) => {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${name}: ${value}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="group grid grid-cols-[auto_1fr_auto] gap-3 items-start px-4 py-1.5 hover:bg-bg/40 transition-colors">
      <span className="font-mono text-[12px] text-secondary min-w-[140px] max-w-[260px] truncate">
        {name}
      </span>
      <span className="font-mono text-[12px] text-primary break-all">
        {value}
      </span>
      <button
        type="button"
        onClick={onCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-primary self-center"
        title={`Copy ${name}`}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

export const ResultHeaders = ({ response }: ResultHeadersProps) => {
  const entries = Object.entries(response.headers);
  const cookies = response.cookies ?? [];

  if (entries.length === 0 && cookies.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm font-mono">
        No response headers.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto py-2 divide-y divide-border/30">
      {entries.length > 0 && (
        <section>
          <h3 className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wide text-muted font-mono">
            Headers · {entries.length}
          </h3>
          <div>
            {entries.map(([k, v]) => (
              <Row key={k} name={k} value={v} />
            ))}
          </div>
        </section>
      )}
      {cookies.length > 0 && (
        <section>
          <h3 className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wide text-muted font-mono">
            Set-Cookie · {cookies.length}
          </h3>
          <div>
            {cookies.map((cookie, i) => (
              <Row key={i} name={`cookie ${i + 1}`} value={cookie} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
