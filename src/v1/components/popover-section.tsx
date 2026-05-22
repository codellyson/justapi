"use client";

import { ReactNode } from "react";
import { useDraftStore, PopoverKey } from "../use-draft-store";

interface PopoverSectionProps {
  popoverKey: PopoverKey;
  label: string;
  actions?: ReactNode;
  children: ReactNode;
}

export const PopoverSection = ({
  popoverKey,
  label,
  actions,
  children,
}: PopoverSectionProps) => {
  const closePopover = useDraftStore((s) => s.closePopover);

  return (
    <section className="rounded-lg border border-border bg-bg-secondary overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/60 bg-bg/30">
        <span className="text-[10px] uppercase tracking-wide text-muted font-mono">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={() => closePopover(popoverKey)}
            className="text-[11px] text-muted hover:text-primary"
            aria-label={`Close ${label} popover`}
          >
            ✕
          </button>
        </div>
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
};
