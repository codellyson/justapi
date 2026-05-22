"use client";

import { useState, useMemo } from "react";
import type { HttpResponse } from "../../utils/http";

const PREVIEW_LINES = 10;

interface CardBodyProps {
  response: HttpResponse;
}

const stringify = (data: unknown, contentType: string): string => {
  if (data instanceof ArrayBuffer) return "(binary)";
  if (typeof data === "string") return data;
  if (contentType.includes("json") || typeof data === "object") {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
  return String(data);
};

export const CardBody = ({ response }: CardBodyProps) => {
  const [expanded, setExpanded] = useState(false);
  const contentType = response.headers["content-type"] ?? "";

  const text = useMemo(
    () => stringify(response.data, contentType),
    [response.data, contentType]
  );

  if (response.data instanceof ArrayBuffer) {
    return (
      <div className="px-4 py-3 text-secondary text-xs font-mono">
        (binary · {response.size}B)
      </div>
    );
  }

  const lines = text.split("\n");
  const isLong = lines.length > PREVIEW_LINES;
  const visible = expanded || !isLong ? text : lines.slice(0, PREVIEW_LINES).join("\n");
  const remaining = lines.length - PREVIEW_LINES;

  return (
    <div className="px-4 py-3">
      <pre
        className="font-mono text-[12px] text-primary whitespace-pre-wrap break-words leading-[1.5]"
      >
        {visible}
      </pre>
      {isLong && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-[11px] text-accent hover:underline font-mono"
        >
          ↓ Show full ({remaining} more lines)
        </button>
      )}
      {isLong && expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 text-[11px] text-secondary hover:text-primary font-mono"
        >
          ↑ Collapse
        </button>
      )}
    </div>
  );
};
