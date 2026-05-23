"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { HttpResponse } from "../../utils/http";
import { Copy, Check } from "lucide-react";

const CodeEditor = dynamic(
  () =>
    import("../../components/ui/code-editor").then((m) => m.CodeEditor),
  { ssr: false, loading: () => <div className="h-full bg-bg/40" /> }
);

interface ResultBodyProps {
  response: HttpResponse;
}

const isJsonContentType = (ct: string) => /json|\+json/i.test(ct);

const stringify = (data: unknown, ct: string): string => {
  if (data instanceof ArrayBuffer) return "(binary)";
  if (typeof data === "string") return data;
  if (isJsonContentType(ct) || typeof data === "object") {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
  return String(data);
};

export const ResultBody = ({ response }: ResultBodyProps) => {
  const contentType = response.headers["content-type"] ?? "";
  const text = useMemo(
    () => stringify(response.data, contentType),
    [response.data, contentType]
  );
  const language = isJsonContentType(contentType) ? "json" : "text";

  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  if (response.data instanceof ArrayBuffer) {
    return (
      <div className="h-full flex items-center justify-center text-secondary text-sm font-mono">
        (binary · {response.size}B)
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <button
        type="button"
        onClick={onCopy}
        className="absolute top-2 right-3 z-10 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono text-secondary hover:text-primary bg-bg/80 backdrop-blur-sm border border-border/60 hover:border-border transition-colors"
        title="Copy body"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3" />
            copied
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            copy
          </>
        )}
      </button>
      {language === "json" ? (
        <CodeEditor
          value={text}
          language="json"
          readOnly
          height="100%"
          className="h-full border-0 rounded-none"
        />
      ) : (
        <pre className="font-mono text-[12px] text-primary whitespace-pre-wrap break-words leading-[1.5] px-4 py-3 h-full overflow-y-auto">
          {text}
        </pre>
      )}
    </div>
  );
};
