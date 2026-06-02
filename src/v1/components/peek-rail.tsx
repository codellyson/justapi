"use client";

import { useMemo, useState } from "react";
import {
  useStackStore,
  useActiveDisplayedCardId,
} from "../use-stack-store";
import { useWorkspaceStore } from "../use-workspace-store";
import { MethodPill } from "./method-pill";
import { StatusBadge } from "../../components/ui/status-badge";
import { Layers, Trash2, Share2, Loader2 } from "lucide-react";
import { shareCard } from "../share";
import { useToastStore } from "../../stores/use-toast-store";

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
  const [sharingId, setSharingId] = useState<string | null>(null);

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
        // Opacity-only depth cue keeps card sizes uniform — depth scaling
        // made hover feel jittery because every card responded at a
        // different rate.
        const opacity = 1 - (depthFromFront - 1) * 0.14;
        return (
          <div
            key={card.id}
            style={{
              opacity,
              marginTop: idx === 0 ? 0 : -OVERLAP,
              zIndex: 100 - depthFromFront,
            }}
            className="pointer-events-auto"
          >
            <div
              role="group"
              className="group relative w-[min(720px,86vw)] h-9 flex items-center rounded-xl border border-border bg-bg-secondary/95 backdrop-blur-sm shadow-[0_8px_18px_-12px_rgba(0,0,0,0.4)] hover:border-accent transition-[border-color] duration-150 ease-out overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setDisplayed(workspaceId, card.id)}
                className="flex items-center gap-3 pl-4 pr-3 h-full w-full min-w-0"
                title="Click to open"
              >
                <MethodPill method={card.method} />
                <span className="font-mono text-[12px] text-primary truncate flex-1 text-left">
                  {card.url}
                </span>
                {/* Right-edge slot — status by default, actions on hover.
                    Both share the same position and transition in/out so
                    nothing reserves layout space when idle. */}
                <span className="relative flex items-center justify-end h-full shrink-0 w-[60px] group-hover:w-[68px] transition-[width] duration-150 ease-out">
                  {card.response && (
                    <span className="absolute inset-y-0 right-0 flex items-center transition-all duration-150 ease-out group-hover:opacity-0 group-hover:translate-x-2 group-hover:scale-95">
                      <StatusBadge status={card.response.status} />
                    </span>
                  )}
                </span>
              </button>

              <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center gap-0.5 opacity-0 translate-x-2 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto">
                <button
                  type="button"
                  disabled={sharingId === card.id}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (sharingId) return;
                    setSharingId(card.id);
                    const link = await shareCard(card);
                    setSharingId(null);
                    useToastStore
                      .getState()
                      .showToast(
                        link ? "info" : "error",
                        link ? "Share link copied" : "Couldn't share"
                      );
                  }}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted hover:text-primary hover:bg-bg/60 disabled:opacity-60"
                  title="Copy share link"
                  aria-label="Share request"
                >
                  {sharingId === card.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
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
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted hover:text-danger hover:bg-danger/10"
                  title="Delete request"
                  aria-label="Delete request"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {overflowCount > 0 && (
        <button
          type="button"
          onClick={onShowMore}
          className="pointer-events-auto mt-1 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-bg-secondary/90 backdrop-blur-sm px-3 h-6 text-[11px] font-mono text-muted hover:text-primary hover:border-border transition-[color,border-color] duration-150 ease-out shadow-[0_4px_12px_-8px_rgba(0,0,0,0.35)]"
          title="Open palette to see all in-stack requests"
        >
          <Layers className="w-3 h-3" />
          +{overflowCount} more
        </button>
      )}
    </div>
  );
};
