"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Card } from "../types";
import { MethodPill } from "./method-pill";
import { Copy, Check } from "lucide-react";

const CodeEditor = dynamic(
  () =>
    import("../../components/ui/code-editor").then((m) => m.CodeEditor),
  { ssr: false, loading: () => <div className="h-[220px] bg-bg/40" /> }
);

interface ResultRequestProps {
  card: Card;
}

const headerLines = (h: Record<string, string>) =>
  Object.entries(h)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

export const ResultRequest = ({ card }: ResultRequestProps) => {
  const { request } = card;
  const headerEntries = Object.entries(request.headers);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="h-full overflow-y-auto py-3 space-y-4">
      <section className="px-4">
        <h3 className="text-[10px] uppercase tracking-wide text-muted font-mono pb-2">
          URL
        </h3>
        <div className="flex items-center gap-2">
          <MethodPill method={request.method} />
          <span className="font-mono text-[12px] text-primary break-all flex-1">
            {request.url}
          </span>
          <button
            type="button"
            onClick={() => copy("url", `${request.method} ${request.url}`)}
            className="text-muted hover:text-primary"
            title="Copy URL"
          >
            {copied === "url" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        {request.urlRaw && request.urlRaw !== request.url && (
          <p className="mt-1 text-[10px] font-mono text-muted">
            template: {request.urlRaw}
          </p>
        )}
      </section>

      <section className="border-t border-border/30 px-4 pt-3">
        <h3 className="text-[10px] uppercase tracking-wide text-muted font-mono pb-2 flex items-center gap-3">
          <span>Headers · {headerEntries.length}</span>
          {headerEntries.length > 0 && (
            <button
              type="button"
              onClick={() => copy("headers", headerLines(request.headers))}
              className="ml-auto inline-flex items-center gap-1 text-secondary hover:text-primary normal-case tracking-normal"
              title="Copy all headers"
            >
              {copied === "headers" ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              copy all
            </button>
          )}
        </h3>
        {headerEntries.length === 0 ? (
          <p className="text-[12px] text-muted font-mono">No headers sent.</p>
        ) : (
          <div className="space-y-1">
            {headerEntries.map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-[160px_1fr] gap-3 text-[12px] font-mono"
              >
                <span className="text-secondary truncate">{k}</span>
                <span className="text-primary break-all">{v}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {request.body && (
        <section className="border-t border-border/30 pt-3">
          <h3 className="px-4 text-[10px] uppercase tracking-wide text-muted font-mono pb-2 flex items-center gap-2">
            <span>Body · {request.bodyType}</span>
            <button
              type="button"
              onClick={() => copy("body", request.body ?? "")}
              className="ml-auto inline-flex items-center gap-1 text-secondary hover:text-primary normal-case tracking-normal"
              title="Copy body"
            >
              {copied === "body" ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              copy
            </button>
          </h3>
          {request.bodyType === "json" ? (
            <CodeEditor
              value={request.body}
              language="json"
              readOnly
              height="220px"
              className="border-0 rounded-none"
            />
          ) : (
            <pre className="font-mono text-[12px] text-primary whitespace-pre-wrap break-words leading-[1.5] px-4">
              {request.body}
            </pre>
          )}
        </section>
      )}
    </div>
  );
};
