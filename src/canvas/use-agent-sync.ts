"use client";

import { useEffect } from "react";
import { materializeFlow, findFlowOrigin } from "./materialize";
import { runFlow } from "./engine";
import { flowSlug } from "./flow-spec";
import type { FlowSpec } from "./flow-spec";

/**
 * Live link to the agent bridge: flows pushed over HTTP materialize on
 * the board as they arrive, run requests execute here in the browser,
 * and reports post back so the agent's long-poll resolves.
 */
export const useAgentSync = (): void => {
  useEffect(() => {
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
                  if (data?.spec) materializeFlow(data.spec as FlowSpec);
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
  }, []);
};
