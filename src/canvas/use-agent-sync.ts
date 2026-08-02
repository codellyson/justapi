"use client";

import { useEffect } from "react";
import { materializeFlow, findFlowOrigin } from "./materialize";
import { useCanvasStore } from "./use-canvas-store";
import { runFlow } from "./engine";
import { flowSlug } from "./flow-spec";
import type { FlowSpec } from "./flow-spec";

/**
 * Live link to the agent bridge: flows pushed over HTTP materialize on
 * the board as they arrive, run requests execute here in the browser,
 * and reports post back so the agent's long-poll resolves.
 *
 * The bridge is account-scoped, so it only connects when signed in —
 * anonymous users work locally and never open the (gated) SSE stream.
 */
/**
 * @param enabled   connect to the agent bridge (signed-in, non-embedded).
 * @param rehydrate re-materialize hub flows the board hasn't seen on connect.
 *   Off when canvas persistence is active — that restores every board from D1,
 *   and letting both run spawns duplicate canvases (each materialize mints a new
 *   canvas id, which the id-keyed sync can't dedupe).
 */
export const useAgentSync = (enabled: boolean, rehydrate = true): void => {
  useEffect(() => {
    if (!enabled) return;

    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      source = new EventSource("/api/agent/events");

      source.addEventListener("flow.upserted", (e) => {
        try {
          const { spec } = JSON.parse((e as MessageEvent).data) as {
            spec: FlowSpec;
          };
          materializeFlow(spec);
        } catch (err) {
          console.error("[agent-sync] failed to materialize flow", err);
        }
      });

      source.addEventListener("flow.run-requested", (e) => {
        void (async () => {
          try {
            const { slug } = JSON.parse((e as MessageEvent).data) as {
              slug: string;
            };
            let origin = findFlowOrigin(slug);
            if (!origin) {
              // Flow exists server-side but not on this board yet.
              const res = await fetch(`/api/flows/${slug}`);
              if (res.ok) {
                const { spec } = (await res.json()) as { spec: FlowSpec };
                const m = materializeFlow(spec);
                origin = { graphId: m.graphId, originId: m.originId };
              }
            }
            if (!origin) return;
            // The engine runs against the active graph — front the
            // flow's board (also puts the run where the human watches).
            useCanvasStore.getState().setActiveGraph(origin.graphId);
            const report = await runFlow(origin.originId);
            await fetch("/api/agent/results", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug, report }),
            });
          } catch (err) {
            console.error("[agent-sync] run failed", err);
          }
        })();
      });

      source.addEventListener("connected", (e) => {
        // Canvas persistence restores boards from D1 — skip hub rehydration so
        // the two don't each re-create the same flow as separate canvases.
        if (!rehydrate) return;
        // Rehydrate flows persisted server-side that this board hasn't
        // seen (fresh profile, cleared storage, …).
        try {
          const { flows } = JSON.parse((e as MessageEvent).data) as {
            flows: { slug: string; name: string }[];
          };
          for (const f of flows) {
            if (!findFlowOrigin(f.slug ?? flowSlug(f.name))) {
              void fetch(`/api/flows/${f.slug}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => {
                  const spec = (data as { spec?: FlowSpec } | null)?.spec;
                  if (spec) materializeFlow(spec);
                });
            }
          }
        } catch {
          /* non-fatal */
        }
      });

      source.onerror = () => {
        source?.close();
        source = null;
        if (!disposed) retry = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      disposed = true;
      if (retry) clearTimeout(retry);
      source?.close();
    };
  }, [enabled, rehydrate]);
};
