"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Drawer } from "vaul";
import { useDraftStore } from "../use-draft-store";
import { Copy, Check, Wand2 } from "lucide-react";

const CodeEditor = dynamic(
  () =>
    import("../../components/ui/code-editor").then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => <div className="h-full bg-bg/40 rounded-md" />,
  }
);

export const BodyDrawer = () => {
  const body = useDraftStore((s) => s.body);
  const setBody = useDraftStore((s) => s.setBody);
  const bodyType = useDraftStore((s) => s.bodyType);
  const setBodyType = useDraftStore((s) => s.setBodyType);
  const openPopovers = useDraftStore((s) => s.openPopovers);
  const closePopover = useDraftStore((s) => s.closePopover);
  const open = openPopovers.includes("body");

  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const onFormat = () => {
    try {
      const parsed = JSON.parse(body || "{}");
      setBody(JSON.stringify(parsed, null, 2));
      setStatus(null);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "invalid JSON");
      setTimeout(() => setStatus(null), 2200);
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  const size = body ? new Blob([body]).size : 0;
  const sizeStr =
    size === 0 ? "" : size < 1024 ? `${size}B` : `${(size / 1024).toFixed(1)}KB`;

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) closePopover("body");
      }}
      shouldScaleBackground
      closeThreshold={0.2}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-[85dvh] flex-col rounded-t-2xl border border-b-0 border-border bg-bg-secondary shadow-[0_-12px_48px_-12px_rgba(0,0,0,0.45)] outline-none">
          <Drawer.Title className="sr-only">Configure request body</Drawer.Title>

          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-border" />

          <header className="flex items-center gap-3 px-5 pt-3 pb-3 shrink-0 border-b border-border/40">
            <span className="text-[10px] uppercase tracking-wide text-muted font-mono">
              Body
            </span>
            <span className="text-[12px] text-secondary">
              {bodyType === "none" ? "none" : bodyType}
              {sizeStr && <span className="ml-2 text-muted">{sizeStr}</span>}
            </span>
            <div className="flex-1" />
            {bodyType === "json" && (
              <>
                <button
                  type="button"
                  onClick={onFormat}
                  className="inline-flex items-center gap-1.5 text-[11px] text-secondary hover:text-primary font-mono"
                  title="Pretty-print JSON"
                >
                  <Wand2 className="w-3 h-3" />
                  format
                </button>
                <button
                  type="button"
                  onClick={onCopy}
                  className="inline-flex items-center gap-1.5 text-[11px] text-secondary hover:text-primary font-mono"
                  title="Copy body"
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  copy
                </button>
              </>
            )}
            {status && (
              <span className="text-[10px] text-danger font-mono">
                {status}
              </span>
            )}
            <span className="text-[10px] text-muted font-mono">
              esc · drag to close
            </span>
          </header>

          {bodyType !== "json" ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5">
              <p className="text-[12px] text-muted font-mono">
                No body set. Enable JSON to start editing.
              </p>
              <button
                type="button"
                onClick={() => setBodyType("json")}
                className="rounded-md bg-accent text-accent-text px-3 py-1.5 text-[12px] font-medium hover:bg-accent-hover transition-colors"
              >
                Enable JSON body
              </button>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-hidden">
              <CodeEditor
                value={body}
                onChange={(v) => setBody(v ?? "")}
                language="json"
                height="100%"
                className="h-full border-0 rounded-none"
              />
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
