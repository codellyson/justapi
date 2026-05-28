"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { Share2, Check } from "lucide-react";
import type { Card } from "../types";
import { useDraftStore } from "../use-draft-store";
import { useToastStore } from "../../stores/use-toast-store";
import { formatSize } from "../drift";
import { hostAccent } from "../host";
import { shareCard } from "../share";
import { MethodPill } from "./method-pill";
import { ResultTabs } from "./result-tabs";
import { StatusBadge } from "../../components/ui/status-badge";

interface SheetProps {
  card: Card;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const Sheet = ({ card, open, onOpenChange }: SheetProps) => {
  const fillFrom = useDraftStore((s) => s.fillFrom);
  const accent = hostAccent(card.host);
  const r = card.response;

  const onEditUrl = () => {
    fillFrom({
      method: card.request.method,
      url: card.request.urlRaw || card.request.url,
      body: card.request.body ?? "",
      bodyType: card.request.bodyType,
      authType: card.request.authType,
      authConfig: card.request.authConfig,
      headers: card.request.headers,
    });
    onOpenChange(false);
  };

  const [shareCopied, setShareCopied] = useState(false);
  const onShare = async () => {
    const link = await shareCard(card);
    if (link) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
      useToastStore.getState().showToast("info", "Share link copied");
    } else {
      useToastStore.getState().showToast("error", "Couldn't share");
    }
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground
      closeThreshold={0.2}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-[88dvh] flex-col rounded-t-2xl border border-b-0 border-border bg-bg-secondary shadow-[0_-12px_48px_-12px_rgba(0,0,0,0.45)] outline-none">
          <Drawer.Title className="sr-only">
            {card.method} {card.url}
          </Drawer.Title>

          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-border" />

          <header className="flex items-center gap-3 px-5 pt-3 pb-3 shrink-0 border-b border-border/40">
            <MethodPill method={card.method} />
            <button
              type="button"
              onClick={onEditUrl}
              className="font-mono text-[13px] text-primary truncate text-left hover:text-accent transition-colors flex-1"
              title="Click to edit & close"
            >
              {card.url}
            </button>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-1.5 text-[11px] text-secondary hover:text-primary font-mono shrink-0"
              title="Copy share link"
              aria-label="Share this request"
            >
              {shareCopied ? (
                <>
                  <Check className="w-3 h-3" />
                  copied
                </>
              ) : (
                <>
                  <Share2 className="w-3 h-3" />
                  share
                </>
              )}
            </button>
            <span className="text-[10px] text-muted font-mono shrink-0">
              esc · drag to close
            </span>
          </header>

          <div className="flex items-center gap-3 px-5 py-2.5 text-[11px] font-mono text-muted border-b border-border/40 shrink-0">
            <span style={{ color: accent.text }}>{card.host}</span>
            {card.env && (
              <span>
                <span className="opacity-60">ENV </span>
                {card.env.name}
              </span>
            )}
            <span>
              <span className="opacity-60">AUTH </span>
              {card.auth.summary}
            </span>
            {card.body && (
              <span>
                <span className="opacity-60">BODY </span>
                {card.body.summary}
              </span>
            )}
            <div className="flex-1" />
            {card.pending && (
              <span className="inline-block animate-pulse">● in flight…</span>
            )}
            {!card.pending && r && (
              <>
                <StatusBadge
                  status={r.status}
                  text={`${r.status} ${r.statusText}`}
                />
                <span>{r.time}ms</span>
                <span>{formatSize(r.size)}</span>
              </>
            )}
            {!card.pending && !r && card.error && (
              <span className="text-danger">{card.error}</span>
            )}
          </div>

          <div className="flex-1 min-h-0">
            <ResultTabs key={card.id} card={card} />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
