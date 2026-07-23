import fs from "node:fs";
import path from "node:path";
import { flowSlug } from "../canvas/flow-spec";
import type { FlowSpec, FlowRunReport } from "../canvas/flow-spec";

/**
 * The bridge between agents (HTTP/files) and the open canvas (SSE).
 * Flows persist under .justapi/flows/; runs execute in the connected
 * browser, which posts results back here.
 */

interface SseClient {
  send: (event: string, data: unknown) => void;
  close: () => void;
}

interface PendingRun {
  resolve: (report: FlowRunReport | null) => void;
  timer: ReturnType<typeof setTimeout>;
}

class AgentHub {
  private flows = new Map<string, FlowSpec>();
  private results = new Map<string, FlowRunReport>();
  private clients = new Set<SseClient>();
  private pendingRuns = new Map<string, PendingRun[]>();
  private loaded = false;

  private get dir(): string {
    return path.join(process.cwd(), ".justapi", "flows");
  }

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (!fs.existsSync(this.dir)) return;
      for (const file of fs.readdirSync(this.dir)) {
        if (!file.endsWith(".json")) continue;
        try {
          const spec = JSON.parse(
            fs.readFileSync(path.join(this.dir, file), "utf8")
          ) as FlowSpec;
          if (spec?.name) this.flows.set(flowSlug(spec.name), spec);
        } catch {
          /* skip corrupt file */
        }
      }
    } catch {
      /* no persistence available — memory only */
    }
  }

  list(): { slug: string; name: string; requests: number }[] {
    this.ensureLoaded();
    return [...this.flows.entries()].map(([slug, spec]) => ({
      slug,
      name: spec.name,
      requests: spec.requests.length,
    }));
  }

  get(slug: string): FlowSpec | null {
    this.ensureLoaded();
    return this.flows.get(slug) ?? null;
  }

  upsert(spec: FlowSpec): string {
    this.ensureLoaded();
    const slug = flowSlug(spec.name);
    this.flows.set(slug, spec);
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      fs.writeFileSync(
        path.join(this.dir, `${slug}.json`),
        JSON.stringify(spec, null, 2)
      );
    } catch {
      /* memory only */
    }
    this.broadcast("flow.upserted", { slug, spec });
    return slug;
  }

  connectedClients(): number {
    return this.clients.size;
  }

  addClient(client: SseClient): void {
    this.clients.add(client);
  }

  removeClient(client: SseClient): void {
    this.clients.delete(client);
  }

  private broadcast(event: string, data: unknown): void {
    for (const c of [...this.clients]) {
      try {
        c.send(event, data);
      } catch {
        this.clients.delete(c);
      }
    }
  }

  /** Ask the connected canvas to run a flow; resolves with the report
   *  the browser posts back, or null on timeout. */
  requestRun(slug: string, timeoutMs: number): Promise<FlowRunReport | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const list = this.pendingRuns.get(slug) ?? [];
        this.pendingRuns.set(
          slug,
          list.filter((p) => p.resolve !== resolve)
        );
        resolve(null);
      }, timeoutMs);
      const list = this.pendingRuns.get(slug) ?? [];
      list.push({ resolve, timer });
      this.pendingRuns.set(slug, list);
      this.broadcast("flow.run-requested", { slug });
    });
  }

  postResult(slug: string, report: FlowRunReport): void {
    this.results.set(slug, report);
    const pending = this.pendingRuns.get(slug) ?? [];
    this.pendingRuns.set(slug, []);
    for (const p of pending) {
      clearTimeout(p.timer);
      p.resolve(report);
    }
  }

  lastResult(slug: string): FlowRunReport | null {
    return this.results.get(slug) ?? null;
  }
}

// Survive dev-server HMR module duplication.
const g = globalThis as { __justapiAgentHub?: AgentHub };
export const agentHub: AgentHub = (g.__justapiAgentHub ??= new AgentHub());
