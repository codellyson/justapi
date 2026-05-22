"use client";

import type { HttpMethod } from "../../utils/http";
import { methodPillColor } from "../../components/request/method-selector";
import { cn } from "../../utils/cn";

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
        "inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] tracking-wide",
        methodPillColor[method],
        onClick && "cursor-pointer hover:brightness-110",
        className
      )}
    >
      {method}
    </Comp>
  );
};
