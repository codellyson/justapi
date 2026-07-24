"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "../../utils/cn";
import { useActiveGraph } from "../use-canvas-store";
import { useRunStore } from "../use-run-store";
import { runFlow, runNode } from "../engine";
import type { CollectionNode, RequestNode } from "../types";

type Driver = "you" | "agent";

/**
 * Control cluster (top-right of the canvas area): who drives the board and
 * one button to run the whole flow. Lives inside the canvas column, so a
 * docked drawer naturally pushes it left — no manual offset needed.
 */
export const ControlCluster = () => {
  const graph = useActiveGraph();
  const [driver, setDriver] = useState<Driver>("you");
  const running = useRunStore((s) =>
    Object.values(s.runs).some((r) => r.status === "pending")
  );

  const origin = graph.nodes.find(
    (n): n is CollectionNode => n.type === "collection"
  );
  const firstRequest = graph.nodes.find(
    (n): n is RequestNode => n.type === "request"
  );

  // Nothing to run yet — the onboarding screen owns the empty board.
  if (!firstRequest) return null;

  const run = () => {
    if (running) return;
    if (origin) void runFlow(origin.id);
    else void runNode(firstRequest.id, { force: true });
  };

  const seg = (active: boolean) =>
    cn(
      "rounded-md px-3 py-1 text-[12.5px] font-semibold transition-colors",
      active ? "bg-bg text-primary shadow-sm" : "text-muted hover:text-secondary"
    );

  return (
    <div className="absolute right-4 top-3 z-[27] flex items-center gap-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        driven by
      </span>

      <div className="flex gap-0.5 rounded-lg border border-border/60 bg-bg-secondary/85 p-0.5 backdrop-blur-sm">
        <button type="button" onClick={() => setDriver("you")} className={seg(driver === "you")}>
          You
        </button>
        <button
          type="button"
          onClick={() => setDriver("agent")}
          className={seg(driver === "agent")}
        >
          Agent
        </button>
      </div>

      <button
        type="button"
        data-tour="run"
        onClick={run}
        disabled={running}
        className={cn(
          "flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-accent-text transition-colors",
          running ? "opacity-90" : "hover:bg-accent-hover"
        )}
        title={origin ? "Run the whole flow" : "Run this request"}
      >
        {running ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent-text/40 border-t-accent-text" />
        ) : (
          <Play className="h-3 w-3 fill-current" />
        )}
        <span>
          {running ? "Running…" : driver === "agent" ? "Re-run" : "Run flow"}
        </span>
      </button>
    </div>
  );
};
