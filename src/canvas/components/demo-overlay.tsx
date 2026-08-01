"use client";

import { Play } from "lucide-react";
import { useActiveGraph } from "../use-canvas-store";
import { useRunStore } from "../use-run-store";
import { runFlow } from "../engine";
import type { CollectionNode } from "../types";

/**
 * The play overlay shown only in the marketing iframe embed: a big button that
 * runs the demo flow for real (against the public sample API) so a visitor
 * watches it execute — the camera follows each request and the checks light up.
 * Hidden while running; becomes a subtle "replay" pill once it has run.
 */
export const DemoOverlay = () => {
  const graph = useActiveGraph();
  const runs = useRunStore((s) => s.runs);

  const origin = graph.nodes.find(
    (n): n is CollectionNode => n.type === "collection"
  );
  const running = Object.values(runs).some((r) => r.status === "pending");
  const ranBefore = Object.keys(runs).length > 0;

  if (!origin || running) return null;

  const play = () => void runFlow(origin.id);

  if (ranBefore) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center">
        <button
          type="button"
          onClick={play}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/60 bg-bg-secondary/90 px-4 py-2 text-[13px] font-medium text-secondary shadow-lg backdrop-blur-sm transition-colors hover:text-primary"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          Replay
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <button
        type="button"
        onClick={play}
        className="pointer-events-auto group flex flex-col items-center gap-3.5"
      >
        <span className="flex h-[70px] w-[70px] items-center justify-center rounded-full bg-accent text-accent-text shadow-[0_12px_44px_-8px_rgba(0,0,0,0.55)] ring-8 ring-accent/15 transition-transform group-hover:scale-105">
          <Play className="h-8 w-8 translate-x-[2px] fill-current" />
        </span>
        <span className="rounded-full bg-bg-secondary/80 px-3 py-1 text-[13px] font-semibold text-primary backdrop-blur-sm">
          Run the demo
        </span>
      </button>
    </div>
  );
};
