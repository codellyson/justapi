"use client";

import { useReactFlow } from "@xyflow/react";
import { CornerDownRight, TerminalSquare, Sparkles } from "lucide-react";
import { useCanvasStore } from "../use-canvas-store";
import { runFlow } from "../engine";
import { DEMO_SPEC, ensureDemoFlow } from "../demo";

interface EmptyStateProps {
  onOpenImport: () => void;
}

/** Empty canvas onboarding: a flow is a tree you watch run. Three ways in
 *  — draw one, paste one, or let an agent build it — plus the demo template.
 */
export const EmptyState = ({ onOpenImport }: EmptyStateProps) => {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const addRequestNode = useCanvasStore((s) => s.addRequestNode);

  const newRequest = () =>
    addRequestNode(
      screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })
    );

  const runDemo = () => {
    const { originId } = ensureDemoFlow();
    // A beat so the tree renders (and fits) before it lights up.
    setTimeout(() => {
      void fitView({ padding: 0.2, minZoom: 0.65, maxZoom: 1, duration: 300 });
      setTimeout(() => void runFlow(originId), 500);
    }, 150);
  };

  const cards = [
    {
      key: "draw",
      icon: <CornerDownRight className="h-4 w-4 text-accent" />,
      tint: "bg-accent/10 border-accent/25",
      title: "Draw a request",
      body: "Pull a wire off the origin. Method, path, done — the host colours itself.",
      onClick: newRequest,
    },
    {
      key: "paste",
      icon: <TerminalSquare className="h-4 w-4 text-accent" />,
      tint: "bg-accent/10 border-accent/25",
      title: "Paste a cURL or URL",
      body: "We parse it into a node — headers, body and auth land where they belong.",
      onClick: onOpenImport,
    },
    {
      key: "agent",
      icon: <Sparkles className="h-4 w-4 text-accent" />,
      tint: "bg-accent/10 border-accent/25",
      title: "Let an agent build it",
      body: "push_and_run_flow over MCP. You watch it materialise and run.",
      onClick: runDemo,
    },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-auto">
      <div className="pointer-events-auto w-[840px] max-w-[92%] py-10 font-sans">
        {/* header */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            new canvas
          </div>
          <h1 className="mb-2.5 text-[26px] font-semibold tracking-tight text-primary">
            A flow is a tree of requests you can watch run.
          </h1>
          <p className="mx-auto max-w-[520px] text-[14px] leading-relaxed text-secondary">
            Branch a request off the origin, bind a value into the next, hang an
            assertion — or hand the whole board to an agent.
          </p>
        </div>

        {/* origin → ghost visual */}
        <div className="mb-9 flex items-center justify-center">
          <div className="justapi-pulse-ring flex h-28 w-[150px] flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-accent/50 bg-accent/[0.06]">
            <span className="text-[15px] text-accent">⬡</span>
            <span className="text-[13px] font-semibold text-primary">origin</span>
            <span className="font-mono text-[10.5px] text-muted">demo: todos</span>
          </div>
          <svg width="90" height="112" className="overflow-visible">
            <path
              d="M0 56 C40 56, 50 56, 90 56"
              fill="none"
              stroke="rgb(var(--accent) / 0.4)"
              strokeWidth="1.5"
              strokeDasharray="5 6"
              className="justapi-dash"
            />
          </svg>
          <div className="justapi-ghost-float flex h-28 w-[190px] flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-border/60 text-muted">
            <span className="text-[22px] font-light leading-none">＋</span>
            <span className="text-[12px] font-medium">your first request</span>
          </div>
        </div>

        {/* three ways in */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {cards.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.onClick}
              className="rounded-2xl border border-border/50 bg-bg-secondary/70 p-4 text-left backdrop-blur-sm transition-colors hover:border-accent/50 hover:bg-bg-secondary"
            >
              <div
                className={`mb-3.5 flex h-8 w-8 items-center justify-center rounded-lg border ${c.tint}`}
              >
                {c.icon}
              </div>
              <div className="mb-1.5 text-[14px] font-semibold text-primary">
                {c.title}
              </div>
              <div className="text-[12px] leading-relaxed text-muted">
                {c.body}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center text-[12px] text-muted">
          or start from a template —{" "}
          <button
            type="button"
            onClick={runDemo}
            className="text-accent transition-colors hover:underline"
          >
            {DEMO_SPEC.name}
          </button>
        </div>
      </div>
    </div>
  );
};
