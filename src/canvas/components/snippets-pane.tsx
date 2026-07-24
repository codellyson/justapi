"use client";

import { useReactFlow } from "@xyflow/react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { MethodPill } from "./method-pill";
import { useSnippetsStore } from "../use-snippets-store";
import { useCanvasStore } from "../use-canvas-store";
import type { CardRequestSnapshot } from "../types";

/**
 * Snippets: reusable request templates, global across canvases. Bookmark a
 * node to save one here; click a snippet to drop it onto the board.
 */
export const SnippetsPane = () => {
  const { screenToFlowPosition } = useReactFlow();
  const snippets = useSnippetsStore((s) => s.snippets);
  const removeSnippet = useSnippetsStore((s) => s.removeSnippet);
  const renameSnippet = useSnippetsStore((s) => s.renameSnippet);
  const addRequestNode = useCanvasStore((s) => s.addRequestNode);

  const list = [...snippets].sort((a, b) => b.createdAt - a.createdAt);

  const drop = (name: string, snapshot: CardRequestSnapshot) => {
    const p = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addRequestNode(
      { x: p.x + (Math.random() - 0.5) * 60, y: p.y + (Math.random() - 0.5) * 60 },
      snapshot,
      name
    );
  };

  return (
    <div className="flex w-60 flex-none flex-col border-r border-border/50 bg-bg-secondary font-sans">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <span className="text-[11px] text-muted">snippets</span>
        <span className="text-[11px] text-muted">{snippets.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {list.length === 0 && (
          <div className="px-3 py-4 text-[12px] leading-relaxed text-muted">
            No snippets yet.
            <br />
            Save a reusable request with the{" "}
            <span className="text-secondary">bookmark</span> button on any node.
          </div>
        )}
        {list.map((s) => (
          <div
            key={s.id}
            className="group flex items-center gap-1.5 py-1 pl-2.5 pr-2 hover:bg-bg/60"
          >
            <button
              type="button"
              onClick={() => drop(s.name, s.snapshot)}
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              title={`${s.snapshot.method} ${s.snapshot.urlRaw}\nClick to add to canvas`}
            >
              <MethodPill
                method={s.snapshot.method}
                className="px-1 py-0 text-[10px]"
              />
              <span className="flex-1 truncate text-[12px] text-secondary group-hover:text-primary">
                {s.name || s.snapshot.urlRaw || "untitled request"}
              </span>
              <Plus className="hidden h-3 w-3 shrink-0 text-accent group-hover:block" />
            </button>
            <button
              type="button"
              onClick={() => {
                const name = window.prompt("Rename snippet", s.name);
                if (name?.trim()) renameSnippet(s.id, name.trim());
              }}
              className="hidden rounded p-0.5 text-muted hover:text-primary group-hover:block"
              title="Rename"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => removeSnippet(s.id)}
              className="hidden rounded p-0.5 text-muted hover:text-danger group-hover:block"
              title="Delete snippet"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
