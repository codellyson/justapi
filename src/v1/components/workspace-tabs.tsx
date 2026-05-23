"use client";

import { useState, useRef, useEffect } from "react";
import { useStackStore } from "../use-stack-store";
import { useWorkspaceStore, accentForHue } from "../use-workspace-store";
import { Plus, X, Pencil } from "lucide-react";

const resetWorkspaceCards = (id: string) =>
  useStackStore.getState().resetWorkspace(id);

export const WorkspaceTabs = () => {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActive = useWorkspaceStore((s) => s.setActiveWorkspace);
  const create = useWorkspaceStore((s) => s.createWorkspace);
  const rename = useWorkspaceStore((s) => s.renameWorkspace);
  const cycleColor = useWorkspaceStore((s) => s.cycleWorkspaceColor);
  const remove = useWorkspaceStore((s) => s.deleteWorkspace);
  const allCards = useStackStore((s) => s.cards);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingId]);

  const countFor = (workspaceId: string) =>
    allCards.filter(
      (c) => c.workspaceId === workspaceId && c.inStack && !c.archived
    ).length;

  const onRename = (id: string, name: string) => {
    const trimmed = name.trim();
    if (trimmed) rename(id, trimmed);
    setRenamingId(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 mt-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {workspaces.map((ws) => {
          const active = ws.id === activeId;
          const count = countFor(ws.id);
          const isRenaming = renamingId === ws.id;
          const accent = accentForHue(ws.hue);
          return (
            <div
              key={ws.id}
              className="group inline-flex items-center gap-1 rounded-md border text-[11px] transition-colors pl-1.5"
              style={{
                borderColor: active ? accent.border : "rgb(var(--border) / 0.6)",
                background: active ? accent.soft : "rgb(var(--bg-secondary))",
              }}
            >
              <button
                type="button"
                onClick={() => cycleColor(ws.id)}
                className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10 dark:ring-white/10 shrink-0 hover:scale-125 transition-transform"
                style={{ backgroundColor: accent.dot }}
                title="Click to change color"
                aria-label="Change workspace color"
              />
              {isRenaming ? (
                <input
                  ref={renameRef}
                  defaultValue={ws.name}
                  onBlur={(e) => onRename(ws.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onRename(ws.id, e.currentTarget.value);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  className="bg-transparent outline-none px-1.5 py-1 font-medium w-24 !outline-none focus:!outline-none"
                  spellCheck={false}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setActive(ws.id)}
                  onDoubleClick={() => setRenamingId(ws.id)}
                  className="px-1.5 py-1 font-medium"
                  style={{
                    color: active ? accent.text : "rgb(var(--text-secondary))",
                  }}
                  title="Double-click to rename"
                >
                  {ws.name}
                  {count > 0 && (
                    <span
                      className="ml-1.5 text-[10px] font-mono"
                      style={{
                        color: active
                          ? accent.text
                          : "rgb(var(--text-muted))",
                        opacity: 0.7,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )}
              {active && !isRenaming && (
                <button
                  type="button"
                  onClick={() => setRenamingId(ws.id)}
                  className="text-muted hover:text-primary pr-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Rename"
                  aria-label={`Rename ${ws.name}`}
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              {workspaces.length > 1 && active && !isRenaming && (
                <button
                  type="button"
                  onClick={() => {
                    const totalCards = allCards.filter(
                      (c) => c.workspaceId === ws.id
                    ).length;
                    const msg = totalCards
                      ? `Delete workspace "${ws.name}" and all ${totalCards} request${totalCards === 1 ? "" : "s"}?`
                      : `Delete workspace "${ws.name}"?`;
                    if (confirm(msg)) {
                      resetWorkspaceCards(ws.id);
                      remove(ws.id);
                    }
                  }}
                  className="text-muted hover:text-danger pr-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                  aria-label={`Delete ${ws.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => create()}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-border/60 px-2 py-1 text-[11px] text-muted hover:text-primary hover:border-border transition-colors"
          aria-label="New workspace"
        >
          <Plus className="w-3 h-3" />
          new
        </button>
      </div>
    </div>
  );
};
