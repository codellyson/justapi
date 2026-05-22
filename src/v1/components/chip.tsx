"use client";

import { cn } from "../../utils/cn";

interface ChipProps {
  label: string;
  value?: string | null;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  tone?: "default" | "muted";
}

export const Chip = ({
  label,
  value,
  active,
  onClick,
  className,
  tone = "default",
}: ChipProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium border transition-colors",
        active
          ? "border-accent bg-accent/10 text-accent"
          : tone === "muted"
          ? "border-border/60 bg-bg-secondary text-muted hover:text-primary hover:border-border"
          : "border-border bg-bg-secondary text-secondary hover:text-primary hover:border-muted",
        className
      )}
    >
      <span className="uppercase tracking-wide text-[10px] opacity-70">
        {label}
      </span>
      {value !== undefined && value !== null && (
        <span className="font-mono">{value}</span>
      )}
    </button>
  );
};
