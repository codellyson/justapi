"use client";

import { useState } from "react";
import { useDraftStore } from "../use-draft-store";
import { PopoverSection } from "./popover-section";

const inputCls =
  "px-2 py-1 rounded-md border border-border bg-bg text-[12px] font-mono focus:outline-none focus:border-accent";

export const PopoverHeaders = () => {
  const headers = useDraftStore((s) => s.headers);
  const setHeaders = useDraftStore((s) => s.setHeaders);
  const entries = Object.entries(headers);
  const [draftKey, setDraftKey] = useState("");
  const [draftVal, setDraftVal] = useState("");

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

  return (
    <PopoverSection popoverKey="headers" label="Headers">
      <div className="space-y-2">
        {entries.length > 0 && (
          <div className="space-y-1">
            {entries.map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="font-mono text-[12px] text-primary flex-1 truncate">
                  {k}
                </span>
                <input
                  value={v}
                  onChange={(e) =>
                    setHeaders({ ...headers, [k]: e.target.value })
                  }
                  className={`${inputCls} flex-1`}
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => removeKey(k)}
                  className="text-[11px] text-muted hover:text-danger"
                  aria-label={`Remove header ${k}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder="Header"
            className={`${inputCls} flex-1`}
            spellCheck={false}
          />
          <input
            value={draftVal}
            onChange={(e) => setDraftVal(e.target.value)}
            placeholder="Value"
            className={`${inputCls} flex-1`}
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
            className="text-[11px] text-accent hover:underline font-mono"
          >
            + add
          </button>
        </div>
      </div>
    </PopoverSection>
  );
};
