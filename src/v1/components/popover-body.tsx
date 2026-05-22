"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useDraftStore } from "../use-draft-store";
import { PopoverSection } from "./popover-section";

const CodeEditor = dynamic(
  () =>
    import("../../components/ui/code-editor").then((m) => m.CodeEditor),
  { ssr: false, loading: () => <div className="h-[180px] bg-bg/40 rounded-md" /> }
);

export const PopoverBody = () => {
  const body = useDraftStore((s) => s.body);
  const setBody = useDraftStore((s) => s.setBody);
  const bodyType = useDraftStore((s) => s.bodyType);
  const setBodyType = useDraftStore((s) => s.setBodyType);
  const [status, setStatus] = useState<string | null>(null);

  const onFormat = () => {
    try {
      const parsed = JSON.parse(body || "{}");
      setBody(JSON.stringify(parsed, null, 2));
      setStatus(null);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "invalid JSON");
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setStatus("copied");
      setTimeout(() => setStatus(null), 1200);
    } catch {
      setStatus("copy failed");
    }
  };

  return (
    <PopoverSection
      popoverKey="body"
      label="Body · JSON"
      actions={
        <>
          <button
            type="button"
            onClick={onFormat}
            className="text-[11px] text-secondary hover:text-primary font-mono"
          >
            [ format ]
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="text-[11px] text-secondary hover:text-primary font-mono"
          >
            [ copy ]
          </button>
          {status && (
            <span className="text-[10px] text-muted font-mono">{status}</span>
          )}
        </>
      }
    >
      <div className="space-y-2">
        {bodyType !== "json" && (
          <button
            type="button"
            onClick={() => setBodyType("json")}
            className="text-[11px] text-accent hover:underline font-mono"
          >
            Enable JSON body
          </button>
        )}
        {bodyType === "json" && (
          <CodeEditor
            value={body}
            onChange={(v) => setBody(v ?? "")}
            language="json"
            height="200px"
          />
        )}
      </div>
    </PopoverSection>
  );
};
