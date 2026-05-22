"use client";

import { useEffect, useRef, useState } from "react";
import { useDraftStore } from "../use-draft-store";
import { useStackStore } from "../use-stack-store";

const DEMO_FLAG = "justapi-demo-seen";
const DEMO_URL = "https://api.github.com/users/torvalds";
const START_DELAY = 600;
const CHAR_INTERVAL = 35;

export const CursorDemo = () => {
  const setMethod = useDraftStore((s) => s.setMethod);
  const url = useDraftStore((s) => s.url);
  const cards = useStackStore((s) => s.cards);

  const [phase, setPhase] = useState<"idle" | "typing" | "done">("idle");
  const indexRef = useRef(0);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DEMO_FLAG)) return;
    if (cards.length > 0) return;
    if (url) return;

    setMethod("GET");
    const startTimer = setTimeout(() => {
      setPhase("typing");
      const tick = () => {
        if (cancelledRef.current) return;
        indexRef.current += 1;
        const next = DEMO_URL.slice(0, indexRef.current);
        useDraftStore.getState().setUrl(next);
        if (indexRef.current < DEMO_URL.length) {
          timerRef.current = setTimeout(tick, CHAR_INTERVAL);
        } else {
          setPhase("done");
        }
      };
      timerRef.current = setTimeout(tick, CHAR_INTERVAL);
    }, START_DELAY);

    const onKey = (e: KeyboardEvent) => {
      if (cancelledRef.current) return;
      if (e.key === "Enter" && phase === "done") return;
      if (e.key === "Enter") {
        cancelledRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        useDraftStore.getState().setUrl(DEMO_URL);
        localStorage.setItem(DEMO_FLAG, "1");
        setPhase("done");
        return;
      }
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      localStorage.setItem(DEMO_FLAG, "1");
      setPhase("done");
    };
    window.addEventListener("keydown", onKey, true);

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      clearTimeout(startTimer);
      window.removeEventListener("keydown", onKey, true);
    };
    // mount-only: re-running on dependency changes would replay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "done" && url === DEMO_URL && cards.length === 0) {
      localStorage.setItem(DEMO_FLAG, "1");
    }
  }, [phase, url, cards.length]);

  if (phase === "idle" || phase === "typing") return null;
  if (cards.length > 0) return null;
  return (
    <div className="w-full max-w-3xl mx-auto px-4 -mt-2">
      <div className="px-3 text-[11px] text-muted font-mono animate-pulse">
        press Enter to try it
      </div>
    </div>
  );
};

// Exposed so the input-bar's Enter handler can run send() after the demo.
export const DEMO_URL_VALUE = DEMO_URL;
