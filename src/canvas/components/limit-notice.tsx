"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useLimitsStore } from "../../stores/use-limits-store";

/** Toast for plan-cap events (create blocked, or a 402 rollback from sync). */
export const LimitNotice = () => {
  const notice = useLimitsStore((s) => s.notice);
  const setNotice = useLimitsStore((s) => s.setNotice);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(t);
  }, [notice, setNotice]);

  if (!notice) return null;
  return (
    <div className="absolute left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-warning/40 bg-bg-secondary/95 px-3 py-2 font-sans text-[12px] text-primary shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-sm">
      <span>{notice}</span>
      <Link
        href="/account"
        className="rounded border border-border/50 px-1.5 py-0.5 text-secondary hover:text-primary"
      >
        Account
      </Link>
      <button
        type="button"
        onClick={() => setNotice(null)}
        className="rounded p-0.5 text-muted hover:text-primary"
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
