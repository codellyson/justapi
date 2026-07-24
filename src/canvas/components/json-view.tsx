"use client";

import { useMemo, type ReactNode } from "react";

interface JsonViewProps {
  value: string;
  className?: string;
}

type TokenKind =
  | "raw"
  | "ws"
  | "string"
  | "number"
  | "keyword"
  | "punct"
  | "key";

interface Token {
  kind: TokenKind;
  value: string;
}

const TOKEN_RE =
  /("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\]:,])|(\s+)/g;

const tokenize = (text: string): Token[] => {
  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ kind: "raw", value: text.slice(last, m.index) });
    }
    if (m[1]) out.push({ kind: "string", value: m[1] });
    else if (m[2]) out.push({ kind: "number", value: m[2] });
    else if (m[3]) out.push({ kind: "keyword", value: m[3] });
    else if (m[4]) out.push({ kind: "punct", value: m[4] });
    else if (m[5]) out.push({ kind: "ws", value: m[5] });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push({ kind: "raw", value: text.slice(last) });
  }
  // Mark strings as "key" if the next non-whitespace token is `:`
  for (let i = 0; i < out.length; i++) {
    if (out[i].kind !== "string") continue;
    let j = i + 1;
    while (j < out.length && out[j].kind === "ws") j++;
    if (j < out.length && out[j].kind === "punct" && out[j].value === ":") {
      out[i].kind = "key";
    }
  }
  return out;
};

const classFor = (kind: TokenKind): string => {
  switch (kind) {
    case "key":
      return "text-accent";
    case "string":
      return "text-success";
    case "number":
      return "text-warning";
    case "keyword":
      return "text-warning";
    case "punct":
      return "text-secondary";
    default:
      return "";
  }
};

const HARD_LIMIT = 200_000; // chars; bail to plain pre for monster payloads

export const JsonView = ({ value, className }: JsonViewProps) => {
  const tokens = useMemo<Token[] | null>(() => {
    if (value.length > HARD_LIMIT) return null;
    try {
      return tokenize(value);
    } catch {
      return null;
    }
  }, [value]);

  const baseCls =
    "font-mono text-[13px] leading-[1.65] text-primary whitespace-pre overflow-auto h-full px-4 py-3";

  if (!tokens) {
    return (
      <pre className={`${baseCls} ${className ?? ""}`}>{value}</pre>
    );
  }

  const children: ReactNode[] = tokens.map((t, i) => {
    if (t.kind === "raw" || t.kind === "ws") return t.value;
    const cls = classFor(t.kind);
    return (
      <span key={i} className={cls}>
        {t.value}
      </span>
    );
  });

  return <pre className={`${baseCls} ${className ?? ""}`}>{children}</pre>;
};
