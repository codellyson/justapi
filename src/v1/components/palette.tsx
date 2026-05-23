"use client";

import { useEffect, useMemo, useState } from "react";
import { useStackStore } from "../use-stack-store";
import { useTemplatesStore } from "../use-templates-store";
import { Trash2 } from "lucide-react";
import { useDraftStore } from "../use-draft-store";
import { SLASH_COMMANDS } from "../slash-commands";
import { MethodPill } from "./method-pill";
import type { Card } from "../types";
import type { Template } from "../use-templates-store";
import type { SlashCommand } from "../slash-commands";

interface PaletteProps {
  open: boolean;
  onClose: () => void;
}

interface RecentRow {
  kind: "recent";
  card: Card;
}
interface TemplateRow {
  kind: "template";
  template: Template;
}
interface CommandRow {
  kind: "command";
  command: SlashCommand;
}
type Row = RecentRow | TemplateRow | CommandRow;

const dedupeCards = (cards: Card[]): Card[] => {
  const seen = new Set<string>();
  const out: Card[] = [];
  for (const c of cards) {
    if (c.archived) continue;
    const key = `${c.method} ${c.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= 8) break;
  }
  return out;
};

const matches = (q: string, ...fields: string[]): boolean => {
  if (!q) return true;
  const lc = q.toLowerCase();
  return fields.some((f) => f.toLowerCase().includes(lc));
};

export const Palette = ({ open, onClose }: PaletteProps) => {
  const [query, setQuery] = useState("");
  const [focusedIdx, setFocusedIdx] = useState(0);
  const cards = useStackStore((s) => s.cards);
  const removeCard = useStackStore((s) => s.remove);
  const templates = useTemplatesStore((s) => s.templates);
  const removeTemplate = useTemplatesStore((s) => s.remove);
  const fillFrom = useDraftStore((s) => s.fillFrom);

  useEffect(() => {
    if (open) {
      setQuery("");
      setFocusedIdx(0);
    }
  }, [open]);

  const rows: Row[] = useMemo(() => {
    const recents = dedupeCards(cards)
      .filter((c) => matches(query, c.method, c.url))
      .map<RecentRow>((card) => ({ kind: "recent", card }));
    const temps = templates
      .filter((t) => matches(query, t.name, t.method, t.url))
      .map<TemplateRow>((template) => ({ kind: "template", template }));
    const commands = query.startsWith("/") || !query
      ? SLASH_COMMANDS.filter((c) =>
          matches(query.replace(/^\/+/, "/"), c.name, c.hint)
        ).map<CommandRow>((command) => ({ kind: "command", command }))
      : [];
    return [...recents, ...temps, ...commands];
  }, [cards, templates, query]);

  useEffect(() => {
    if (focusedIdx >= rows.length) setFocusedIdx(0);
  }, [rows.length, focusedIdx]);

  const pick = (row: Row) => {
    if (row.kind === "recent") {
      fillFrom({
        method: row.card.request.method,
        url: row.card.request.urlRaw || row.card.request.url,
      });
    } else if (row.kind === "template") {
      const t = row.template;
      fillFrom({
        method: t.method,
        url: t.url,
        body: t.body,
        bodyType: t.bodyType,
        authType: t.authType,
        authConfig: t.authConfig,
        headers: t.headers,
      });
    } else {
      row.command.run("");
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/30 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Palette"
    >
      <div
        className="w-full max-w-xl mx-4 rounded-lg border border-border bg-bg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setFocusedIdx((i) => Math.min(rows.length - 1, i + 1));
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setFocusedIdx((i) => Math.max(0, i - 1));
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              const row = rows[focusedIdx];
              if (row) pick(row);
            }
          }}
          placeholder="Filter recents · templates · /commands"
          className="w-full px-4 py-3 bg-bg-secondary text-[13px] font-mono outline-none border-b border-border placeholder:text-muted"
        />
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {rows.length === 0 && (
            <p className="px-4 py-4 text-[12px] text-muted">No matches.</p>
          )}
          {rows.map((row, i) => {
            const active = i === focusedIdx;
            const key =
              row.kind === "recent"
                ? row.card.id
                : row.kind === "template"
                ? row.template.id
                : row.command.name;
            const deletable = row.kind !== "command";
            return (
              <div
                key={key}
                onMouseEnter={() => setFocusedIdx(i)}
                className={`group flex items-center w-full ${
                  active ? "bg-bg-secondary" : "hover:bg-bg-secondary/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => pick(row)}
                  className="flex items-center gap-2 px-4 py-1.5 text-left flex-1 min-w-0"
                >
                  {row.kind === "recent" && (
                    <>
                      <span className="text-[10px] uppercase text-muted w-16 font-mono">
                        recent
                      </span>
                      <MethodPill method={row.card.method} />
                      <span className="font-mono text-[12px] text-primary truncate flex-1">
                        {row.card.url}
                      </span>
                    </>
                  )}
                  {row.kind === "template" && (
                    <>
                      <span className="text-[10px] uppercase text-muted w-16 font-mono">
                        saved
                      </span>
                      <MethodPill method={row.template.method} />
                      <span className="text-[12px] text-primary truncate flex-1">
                        {row.template.name}
                      </span>
                      <span className="font-mono text-[11px] text-muted truncate max-w-[50%]">
                        {row.template.url}
                      </span>
                    </>
                  )}
                  {row.kind === "command" && (
                    <>
                      <span className="text-[10px] uppercase text-muted w-16 font-mono">
                        command
                      </span>
                      <span className="font-mono text-[12px] text-accent">
                        {row.command.name}
                      </span>
                      <span className="text-[11px] text-secondary truncate flex-1">
                        {row.command.hint}
                      </span>
                    </>
                  )}
                </button>
                {deletable && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const label =
                        row.kind === "recent"
                          ? "this request"
                          : `template "${row.template.name}"`;
                      if (!confirm(`Delete ${label}?`)) return;
                      if (row.kind === "recent") removeCard(row.card.id);
                      else removeTemplate(row.template.id);
                    }}
                    className="px-3 py-1.5 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
