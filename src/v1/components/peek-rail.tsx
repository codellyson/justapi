"use client";

import { useMemo } from "react";
import { useStackStore } from "../use-stack-store";
import { MethodPill } from "./method-pill";
import { StatusBadge } from "../../components/ui/status-badge";

const MAX_PEEKS = 4;
const OVERLAP = 12;

export const PeekRail = () => {
  const cards = useStackStore((s) => s.cards);
  const displayedCardId = useStackStore((s) => s.displayedCardId);
  const setDisplayed = useStackStore((s) => s.setDisplayed);

  const peeks = useMemo(() => {
    const inStack = cards.filter((c) => c.inStack && !c.archived);
    // Hide whatever is currently in the drawer; the drawer is its own surface.
    const filtered = inStack.filter((c) => c.id !== displayedCardId);
    return filtered.slice(0, MAX_PEEKS);
  }, [cards, displayedCardId]);

  if (peeks.length === 0) return null;

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
            <button
              type="button"
              onClick={() => setDisplayed(card.id)}
              className="w-[min(720px,86vw)] h-9 flex items-center gap-3 px-4 rounded-xl border border-border bg-bg-secondary/95 backdrop-blur-sm shadow-[0_8px_18px_-12px_rgba(0,0,0,0.4)] hover:border-accent hover:scale-[1.04] transition-[transform,border-color,box-shadow] duration-150 ease-out"
              title="Click to open"
            >
              <MethodPill method={card.method} />
              <span className="font-mono text-[12px] text-primary truncate flex-1 text-left">
                {card.url}
              </span>
              {card.response && (
                <StatusBadge status={card.response.status} className="shrink-0" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};
