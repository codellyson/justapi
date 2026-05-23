"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { useDraftStore } from "../use-draft-store";
import { Copy, Check, Plus } from "lucide-react";

const inputCls =
  "px-2 py-1.5 rounded-md border border-border bg-bg text-[12px] font-mono focus:outline-none focus:border-accent";

export const HeadersDrawer = () => {
  const headers = useDraftStore((s) => s.headers);
  const setHeaders = useDraftStore((s) => s.setHeaders);
  const openPopovers = useDraftStore((s) => s.openPopovers);
  const closePopover = useDraftStore((s) => s.closePopover);
  const open = openPopovers.includes("headers");

  const entries = Object.entries(headers);
  const [draftKey, setDraftKey] = useState("");
  const [draftVal, setDraftVal] = useState("");
  const [copied, setCopied] = useState(false);

  const removeKey = (k: string) => {
    const next = { ...headers };
    delete next[k];
    setHeaders(next);
  };

  const addEntry = () => {
    const k = draftKey.trim();
    if (!k) return;
    setHeaders({ ...headers, [k]: draftVal });
    setDraftKey("");
    setDraftVal("");
  };

  const copyAll = async () => {
    const text = entries.map(([k, v]) => `${k}: ${v}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) closePopover("headers");
      }}
      shouldScaleBackground
      closeThreshold={0.2}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-[78dvh] flex-col rounded-t-2xl border border-b-0 border-border bg-bg-secondary shadow-[0_-12px_48px_-12px_rgba(0,0,0,0.45)] outline-none">
          <Drawer.Title className="sr-only">Configure headers</Drawer.Title>

          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-border" />

          <header className="flex items-center gap-3 px-5 pt-3 pb-3 shrink-0 border-b border-border/40">
            <span className="text-[10px] uppercase tracking-wide text-muted font-mono">
              Headers
            </span>
            <span className="text-[12px] text-secondary">{entries.length}</span>
            <div className="flex-1" />
            {entries.length > 0 && (
              <button
                type="button"
                onClick={copyAll}
                className="inline-flex items-center gap-1.5 text-[11px] text-secondary hover:text-primary font-mono"
                title="Copy all headers"
              >
                {copied ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                copy all
              </button>
            )}
            <span className="text-[10px] text-muted font-mono">
              esc · drag to close
            </span>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            {entries.length === 0 ? (
              <p className="text-[12px] text-muted font-mono text-center py-8">
                No headers yet. Add one below or paste a cURL/DevTools snippet
                into the URL bar.
              </p>
            ) : (
              <div className="space-y-1.5">
                {entries.map(([k, v]) => (
                  <div
                    key={k}
                    className="group grid grid-cols-[200px_1fr_auto] gap-2 items-center"
                  >
                    <span
                      className="font-mono text-[12px] text-primary truncate"
                      title={k}
                    >
                      {k}
                    </span>
                    <input
                      value={v}
                      onChange={(e) =>
                        setHeaders({ ...headers, [k]: e.target.value })
                      }
                      className={`${inputCls} min-w-0`}
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => removeKey(k)}
                      className="text-[11px] text-muted hover:text-danger w-6 h-6 inline-flex items-center justify-center rounded-md hover:bg-bg/60 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove header ${k}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border/40 px-5 py-3">
            <div className="grid grid-cols-[200px_1fr_auto] gap-2 items-center">
              <input
                value={draftKey}
                onChange={(e) => setDraftKey(e.target.value)}
                placeholder="Header"
                className={inputCls}
                spellCheck={false}
              />
              <input
                value={draftVal}
                onChange={(e) => setDraftVal(e.target.value)}
                placeholder="Value"
                className={`${inputCls} min-w-0`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEntry();
                  }
                }}
                spellCheck={false}
              />
              <button
                type="button"
                onClick={addEntry}
                className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline font-mono px-2"
              >
                <Plus className="w-3 h-3" />
                add
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
