"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useReactFlow } from "@xyflow/react";
import { cn } from "../../utils/cn";
import { ensureDemoFlow } from "../demo";
import { runFlow } from "../engine";

const SEEN_KEY = "justapi-seen-tour";

interface Step {
  sel: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    sel: '[data-tour="origin"]',
    title: "Start at the origin",
    body: "Every flow grows from here. It carries the environment and auth — a Bearer default flows down to each request automatically.",
  },
  {
    sel: '[data-tour="request"]',
    title: "Requests branch off it",
    body: "Each node is one call — method, path, and the live response inline. The eyebrow shows which host it talks to.",
  },
  {
    sel: '[data-tour="bind"]',
    title: "Bind values between calls",
    body: "Pull a value out of one response and feed it into the next as a {{variable}}. Here the first todo's id flows forward.",
  },
  {
    sel: '[data-tour="assert"]',
    title: "Assert what matters",
    body: "Hang checks off a request — status, a field, a value. They grade live and roll up into one verdict.",
  },
  {
    sel: '[data-tour="run"]',
    title: "Run it — or let an agent",
    body: "Watch the whole tree execute end to end. The same board runs from a single MCP call while you watch.",
  },
];

interface Spot {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  top: number;
  bottom: number;
  place: "below" | "above";
}

const TIP_W = 340;

/** First-run coach-mark tour. Shows a welcome, then spotlights each core
 *  concept on the demo board and runs the flow at the end. Replayable via
 *  the rail's help button (startSignal). */
export const Tour = ({ startSignal }: { startSignal: number }) => {
  const { fitView } = useReactFlow();
  const [welcome, setWelcome] = useState(false);
  const [step, setStep] = useState(-1);
  const [spot, setSpot] = useState<Spot | null>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setWelcome(true);
    } catch {
      /* private mode — just skip the auto-welcome */
    }
  }, []);

  // Replay trigger from the rail (ignore the initial 0).
  useEffect(() => {
    if (startSignal > 0) {
      setStep(-1);
      setSpot(null);
      setWelcome(true);
    }
  }, [startSignal]);

  const seen = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const measure = useCallback(() => {
    if (step < 0) return;
    const el = document.querySelector(STEPS[step].sel);
    if (!el) {
      setSpot(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 8;
    const place: Spot["place"] =
      r.bottom + 230 < window.innerHeight ? "below" : "above";
    setSpot({
      x: r.left - pad,
      y: r.top - pad,
      w: r.width + pad * 2,
      h: r.height + pad * 2,
      cx: r.left + r.width / 2,
      top: r.top - pad,
      bottom: r.bottom + pad,
      place,
    });
  }, [step]);

  useEffect(() => {
    measure();
  }, [step, measure]);

  useEffect(() => {
    if (step < 0) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [step, measure]);

  const begin = () => {
    ensureDemoFlow();
    setWelcome(false);
    // Let the demo board mount and fit before the first spotlight lands.
    setTimeout(() => {
      void fitView({ padding: 0.2, minZoom: 0.55, maxZoom: 1, duration: 300 });
      setTimeout(() => setStep(0), 420);
    }, 160);
  };

  const finish = (runIt: boolean) => {
    seen();
    setStep(-1);
    setSpot(null);
    if (runIt) {
      const { originId } = ensureDemoFlow();
      setTimeout(() => void runFlow(originId), 200);
    }
  };

  const next = () => (step + 1 >= STEPS.length ? finish(true) : setStep(step + 1));
  const back = () => setStep(Math.max(0, step - 1));
  const skip = () => {
    seen();
    setWelcome(false);
    setStep(-1);
    setSpot(null);
  };

  // ── First-run welcome ──
  if (welcome) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="justapi-tour-tip w-[468px] max-w-[92%] rounded-2xl border border-border/60 bg-bg-secondary p-7 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.7)]">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-mono text-[13px] font-bold text-accent-text">
              {"{}"}
            </div>
            <span className="font-mono text-[14px] font-semibold text-primary">
              JustAPI
            </span>
            <span className="ml-auto font-mono text-[10.5px] text-muted">
              first run
            </span>
          </div>
          <h2 className="mb-2.5 text-[22px] font-semibold tracking-tight text-primary">
            Draw your API as a flow you can watch run.
          </h2>
          <p className="mb-6 text-[13.5px] leading-relaxed text-secondary">
            Requests branch into a tree, values bind between them, assertions
            grade the result. Built to stay legible to you{" "}
            <span className="text-accent">and</span> the agents driving it.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={begin}
              className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-text transition-[filter] hover:brightness-110"
            >
              Take the 60-second tour
            </button>
            <button
              type="button"
              onClick={skip}
              className="rounded-lg border border-border/60 px-4 py-2.5 text-[13.5px] font-medium text-secondary transition-colors hover:text-primary"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step < 0) return null;

  // ── Coach-mark ──
  const tipX = Math.min(
    Math.max((spot?.cx ?? window.innerWidth / 2) - TIP_W / 2, 12),
    window.innerWidth - TIP_W - 12
  );
  const tipStyle: CSSProperties = spot
    ? spot.place === "below"
      ? { left: tipX, top: spot.bottom + 14 }
      : { left: tipX, top: spot.top - 14, transform: "translateY(-100%)" }
    : {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };

  return (
    <>
      {/* catch layer — blocks canvas interaction during the tour */}
      <div className="fixed inset-0 z-[48]" />

      {/* spotlight cutout (box-shadow darkens everything outside it) */}
      {spot && (
        <div
          className="pointer-events-none fixed z-[49] rounded-xl transition-all duration-200"
          style={{
            left: spot.x,
            top: spot.y,
            width: spot.w,
            height: spot.h,
            boxShadow:
              "0 0 0 9999px rgba(3,5,10,0.55), 0 0 0 1px rgb(var(--accent))",
          }}
        />
      )}

      {/* tooltip */}
      <div
        className="justapi-tour-tip fixed z-[50] w-[340px] rounded-2xl border border-border/60 bg-bg-secondary p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]"
        style={tipStyle}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-wider text-accent">
            {step + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={skip}
            className="ml-auto text-[11px] text-muted transition-colors hover:text-secondary"
          >
            Skip tour
          </button>
        </div>
        <div className="mb-1.5 text-[15px] font-semibold tracking-tight text-primary">
          {STEPS[step].title}
        </div>
        <p className="mb-4 text-[12.5px] leading-relaxed text-secondary">
          {STEPS[step].body}
        </p>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-4 bg-accent" : "w-1.5 bg-border"
                )}
              />
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                step === 0
                  ? "text-muted/40"
                  : "text-secondary hover:text-primary"
              )}
            >
              Back
            </button>
            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-accent-text transition-[filter] hover:brightness-110"
            >
              {step + 1 >= STEPS.length ? "Run it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
