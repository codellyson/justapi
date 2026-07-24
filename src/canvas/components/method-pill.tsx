"use client";

import type { HttpMethod } from "../../utils/http";
import { cn } from "../../utils/cn";

export const methodPillColor: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  POST: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  PUT: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  PATCH: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  DELETE: "bg-red-500/10 text-red-700 dark:text-red-400",
  HEAD: "bg-bg-secondary text-muted",
  OPTIONS: "bg-bg-secondary text-muted",
};

interface MethodPillProps {
  method: HttpMethod;
  onClick?: () => void;
  className?: string;
}

export const MethodPill = ({ method, onClick, className }: MethodPillProps) => {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md font-mono font-semibold text-[13px] tracking-wide",
        methodPillColor[method],
        onClick && "cursor-pointer hover:brightness-110",
        className
      )}
    >
      {method}
    </Comp>
  );
};
