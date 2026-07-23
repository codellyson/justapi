"use client";

import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Pencil,
  Trash2,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { MethodPill } from "./method-pill";
import { useCollectionsStore } from "../use-collections-store";
import { useCanvasStore } from "../use-canvas-store";

/**
 * Collections panel: saved requests grouped into collections. Click a
 * request to drop it onto the canvas as a new node.
 */
export const Library = () => {
  const { screenToFlowPosition } = useReactFlow();
  const collections = useCollectionsStore((s) => s.collections);
  const createCollection = useCollectionsStore((s) => s.createCollection);
  const renameCollection = useCollectionsStore((s) => s.renameCollection);
  const deleteCollection = useCollectionsStore((s) => s.deleteCollection);
  const toggleCollection = useCollectionsStore((s) => s.toggleCollection);
  const removeRequest = useCollectionsStore((s) => s.removeRequest);
  const addRequestNode = useCanvasStore((s) => s.addRequestNode);
  const addCollectionNode = useCanvasStore((s) => s.addCollectionNode);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const insert = (snapshotName: string, snapshot: Parameters<typeof addRequestNode>[1]) => {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addRequestNode(
      { x: position.x + (Math.random() - 0.5) * 60, y: position.y + (Math.random() - 0.5) * 60 },
      snapshot,
      snapshotName
    );
  };

  const submitNew = () => {
    const name = newName.trim();
    if (name) createCollection(name);
    setNewName("");
    setAdding(false);
  };

  return (
    <div className="absolute bottom-7 left-12 top-0 z-20 flex w-60 flex-col border-r border-border/50 bg-bg-secondary/85 backdrop-blur-sm font-sans">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <span className="text-[9px] uppercase tracking-[0.14em] text-muted">
          collections
        </span>
        <button
          type="button"
          onClick={() => setAdding((a) => !a)}
          className={cn(
            "rounded p-1 text-secondary hover:text-primary hover:bg-bg/60",
            adding && "text-accent"
          )}
          title="New collection"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
      </div>

      {adding && (
        <div className="border-b border-border/40 px-3 py-2">
          <input
            className="w-full rounded-md border border-border/50 bg-bg px-2 py-1 text-[11px] outline-none focus:border-accent/60 placeholder:text-muted/60"
            placeholder="collection name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNew();
              if (e.key === "Escape") setAdding(false);
            }}
            autoFocus
            spellCheck={false}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {collections.length === 0 && !adding && (
          <div className="px-3 py-4 text-[10px] leading-relaxed text-muted">
            No collections yet.
            <br />
            Save a request from any node with the{" "}
            <span className="text-secondary">bookmark</span> button, or create
            a collection above.
          </div>
        )}
        {collections.map((c) => (
          <div key={c.id}>
            <div className="group flex items-center gap-1 px-2 py-1 text-[11px] text-secondary hover:bg-bg/50">
              <button
                type="button"
                onClick={() => toggleCollection(c.id)}
                className="flex flex-1 items-center gap-1 text-left hover:text-primary min-w-0"
              >
                {c.open ? (
                  <ChevronDown className="h-3 w-3 shrink-0 text-muted" />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted" />
                )}
                <span className="truncate">{c.name}</span>
                <span className="text-[10px] text-muted/60">
                  {c.requests.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  addCollectionNode(
                    screenToFlowPosition({
                      x: window.innerWidth / 2,
                      y: window.innerHeight / 2,
                    }),
                    c.id
                  );
                }}
                className="hidden rounded p-0.5 text-accent/80 hover:text-accent group-hover:block"
                title="Place on canvas as a spawn source"
              >
                <ArrowUpRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = window.prompt("Rename collection", c.name);
                  if (name?.trim()) renameCollection(c.id, name.trim());
                }}
                className="hidden rounded p-0.5 text-muted/60 hover:text-primary group-hover:block"
                title="Rename collection"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    c.requests.length === 0 ||
                    window.confirm(
                      `Delete "${c.name}" and its ${c.requests.length} request${
                        c.requests.length === 1 ? "" : "s"
                      }?`
                    )
                  ) {
                    deleteCollection(c.id);
                  }
                }}
                className="hidden rounded p-0.5 text-muted/60 hover:text-danger group-hover:block"
                title="Delete collection"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            {c.open &&
              c.requests.map((r) => (
                <div
                  key={r.id}
                  className="group flex cursor-pointer items-center gap-1.5 py-1 pl-6 pr-2 hover:bg-bg/60"
                  onClick={() => insert(r.name, r.snapshot)}
                  title={`${r.snapshot.method} ${r.snapshot.urlRaw}\nClick to add to canvas`}
                >
                  <MethodPill
                    method={r.snapshot.method}
                    className="px-1 py-0 text-[9px]"
                  />
                  <span className="flex-1 truncate text-[10px] text-secondary group-hover:text-primary">
                    {r.name || r.snapshot.urlRaw}
                  </span>
                  <Plus className="hidden h-3 w-3 text-accent group-hover:block" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRequest(c.id, r.id);
                    }}
                    className="hidden rounded p-0.5 text-muted/60 hover:text-danger group-hover:block"
                    title="Remove from collection"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            {c.open && c.requests.length === 0 && (
              <div className="py-1 pl-6 pr-2 text-[10px] text-muted/60">
                empty
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
