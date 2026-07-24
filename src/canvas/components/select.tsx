"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../utils/cn";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Classes for the trigger button (typography, borders, alignment). */
  className?: string;
  /** Classes for the wrapper (layout: flex-1, shrink-0, …). */
  wrapperClassName?: string;
  /** Which edge the popover aligns to. */
  align?: "left" | "right";
  title?: string;
}

/**
 * Themed dropdown replacing native <select> — whose popup the browser draws
 * with OS styling that ignores the app's dark theme. Renders a styled
 * trigger + a token-based popover list with an accent-highlighted choice.
 */
export const Select = ({
  value,
  options,
  onChange,
  className,
  wrapperClassName,
  align = "right",
  title,
}: SelectProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className={cn("nodrag relative", wrapperClassName)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={title}
        className={cn(
          "flex items-center gap-1 outline-none",
          className
        )}
      >
        <span className="truncate">{current?.label ?? value}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-muted" />
      </button>
      {open && (
        <div
          className={cn(
            "absolute top-full z-30 mt-1 max-h-56 min-w-[130px] overflow-auto rounded-lg border border-border/60 bg-bg-secondary/95 py-1 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.5)] backdrop-blur-sm",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-2.5 py-1 text-left text-[12px] transition-colors",
                o.value === value
                  ? "text-accent"
                  : "text-secondary hover:bg-bg/60 hover:text-primary"
              )}
            >
              <span className="flex-1 truncate">{o.label}</span>
              {o.value === value && <Check className="h-3 w-3 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
