"use client";

import dynamic from "next/dynamic";

/**
 * The canvas renders client-only: React Flow measures the DOM and the
 * persisted zustand graph lives in localStorage, so SSR would only produce
 * a mismatched shell.
 */
const CanvasApp = dynamic(() => import("./canvas-app"), {
  ssr: false,
  loading: () => (
    <div className="h-[100dvh] w-full bg-bg flex items-center justify-center">
      <span className="font-mono text-[11px] text-muted animate-pulse">
        loading canvas…
      </span>
    </div>
  ),
});

export const CanvasClient = () => <CanvasApp />;
