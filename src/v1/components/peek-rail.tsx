"use client";

import { useMemo } from "react";
import {
  useStackStore,
  useActiveDisplayedCardId,
} from "../use-stack-store";
import { useWorkspaceStore } from "../use-workspace-store";
import { MethodPill } from "./method-pill";
import { StatusBadge } from "../../components/ui/status-badge";
import { Layers, Trash2 } from "lucide-react";

const MAX_PEEKS = 4;
const OVERLAP = 12;

interface PeekRailProps {
  onShowMore?: () => void;
}

export const PeekRail = ({ onShowMore }: PeekRailProps) => {
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const cards = useStackStore((s) => s.cards);
  const displayedCardId = useActiveDisplayedCardId();
  const setDisplayed = useStackStore((s) => s.setDisplayed);
  const removeCard = useStackStore((s) => s.remove);

  const inStackOther = useMemo(
    () =>
      cards.filter(
        (c) =>
          c.workspaceId === workspaceId &&
          c.inStack &&
          !c.archived &&
          c.id !== displayedCardId
      ),
    [cards, displayedCardId, workspaceId]
  );
  const peeks = inStackOther.slice(0, MAX_PEEKS);
  const overflowCount = inStackOther.length - peeks.length;

  if (peeks.length === 0 && overflowCount === 0) return null;

  // Render so newest-prior is closest to the drawer (bottom of the rail);
  // oldest sits at the top, scaled down slightly.
  const ordered = [...peeks].reverse();

  return (
    <div
      aria-label="recent requests"
      className="pointer-events-none fixed inset-x-0 top-0 z-[55] flex flex-col items-center pt-3"
    >
      {ordered.map((card, idx) => {
        const depthFromFront = ordered.length - idx; // 1 = closest, larger = further
        const scale = 1 - (depthFromFront - 1) * 0.035;
        const opacity = 1 - (depthFromFront - 1) * 0.16;
        return (
          // Outer div carries the depth-based scale; inner button adds a
          // hover scale that compounds with it so all layers respond evenly.
          <div
            key={card.id}
            style={{
              transform: `scale(${scale})`,
              opacity,
              marginTop: idx === 0 ? 0 : -OVERLAP,
              zIndex: 100 - depthFromFront,
            }}
            className="pointer-events-auto"
          >
            <div
              role="group"
              className="group w-[min(720px,86vw)] h-9 flex items-center rounded-xl border border-border bg-bg-secondary/95 backdrop-blur-sm shadow-[0_8px_18px_-12px_rgba(0,0,0,0.4)] hover:border-accent hover:scale-[1.04] transition-[transform,border-color,box-shadow] duration-150 ease-out overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setDisplayed(workspaceId, card.id)}
                className="flex items-center gap-3 px-4 h-full flex-1 min-w-0"
                title="Click to open"
              >
                <MethodPill method={card.method} />
                <span className="font-mono text-[12px] text-primary truncate flex-1 text-left">
                  {card.url}
                </span>
                {card.response && (
                  <StatusBadge
                    status={card.response.status}
                    className="shrink-0"
                  />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this request from history?")) {
                    removeCard(card.id);
                  }
                }}
                className="h-full px-3 text-muted hover:text-danger hover:bg-danger/5 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete request"
                aria-label="Delete request"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
      {overflowCount > 0 && (
        <button
          type="button"
          onClick={onShowMore}
          className="pointer-events-auto mt-1 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-bg-secondary/90 backdrop-blur-sm px-3 h-6 text-[11px] font-mono text-muted hover:text-primary hover:border-border hover:scale-[1.04] transition-[transform,color,border-color] duration-150 ease-out shadow-[0_4px_12px_-8px_rgba(0,0,0,0.35)]"
          title="Open palette to see all in-stack requests"
        >
          <Layers className="w-3 h-3" />
          +{overflowCount} more
        </button>
      )}
    </div>
  );
};
