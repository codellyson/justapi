"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { X, Copy, Check } from "lucide-react";
import { cn } from "../../utils/cn";
import { useActiveGraph } from "../use-canvas-store";
import { useEnvironmentStore } from "../../stores/use-environment-store";
import { graphToFlowSpec, flowSpecToYaml } from "../graph-to-spec";
import { flowSlug } from "../flow-spec";
import type { CollectionNode } from "../types";

type Tab = "spec" | "http" | "files" | "mcp";

const TABS: { id: Tab; label: string }[] = [
  { id: "spec", label: "Spec" },
  { id: "http", label: "HTTP" },
  { id: "files", label: "Files" },
  { id: "mcp", label: "MCP" },
];

/** Highlight one line of the generated flow YAML: keys in accent, quoted
 *  strings in success, trailing comments muted. Tailored to our emitter. */
const hlLine = (line: string): ReactNode => {
  const cm = line.match(/(\s+#.*)$/);
  const comment = cm ? cm[1] : null;
  const main = cm ? line.slice(0, line.length - cm[1].length) : line;

  const prefix: ReactNode[] = [];
  let rest = main;
  const key = main.match(/^(\s*-?\s*)([a-z0-9_]+|"[^"]*")(:)/i);
  if (key) {
    prefix.push(<span key="i">{key[1]}</span>);
    prefix.push(
      <span key="k" className="text-accent">
        {key[2]}
      </span>
    );
    prefix.push(<span key="c">{key[3]}</span>);
    rest = main.slice(key[0].length);
  }

  const parts = rest.split(/("(?:[^"\\]|\\.)*")/g);
  const restNodes = parts.map((p, i) =>
    /^".*"$/.test(p) ? (
      <span key={i} className="text-success">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );

  return (
    <>
      {prefix}
      {restNodes}
      {comment && <span className="text-muted">{comment}</span>}
    </>
  );
};

const MCP_TOOLS: { name: string; blurb: string; highlight?: boolean }[] = [
  { name: "push_flow", blurb: "upsert a spec" },
  { name: "run_flow", blurb: "execute + report" },
  { name: "push_and_run_flow", blurb: "one call", highlight: true },
  { name: "get_flow", blurb: "read one spec" },
  { name: "list_flows", blurb: "list all" },
];

interface SpecDrawerProps {
  onClose: () => void;
}

export const SpecDrawer = ({ onClose }: SpecDrawerProps) => {
  const [tab, setTab] = useState<Tab>("spec");
  const [copied, setCopied] = useState(false);
  const [files, setFiles] = useState<string[] | null>(null);

  const graph = useActiveGraph();
  const environments = useEnvironmentStore((s) => s.environments);
  const activeEnvironmentId = useEnvironmentStore((s) => s.activeEnvironmentId);

  const { spec, yaml, slug } = useMemo(() => {
    const origin = graph.nodes.find(
      (n): n is CollectionNode => n.type === "collection"
    );
    const name = origin?.data.name || graph.name;
    const envId = origin?.data.environmentId ?? activeEnvironmentId;
    const env = environments.find((e) => e.id === envId);
    const built = graphToFlowSpec(graph, {
      name,
      environment: env ? { name: env.name, variables: env.variables } : undefined,
    });
    return {
      spec: built,
      yaml: built ? flowSpecToYaml(built) : "",
      slug: flowSlug(name),
    };
  }, [graph, environments, activeEnvironmentId]);

  // Real files on disk, from the flows API. The active flow's file is
  // highlighted; others are dimmed.
  useEffect(() => {
    let alive = true;
    fetch("/api/flows")
      .then((r) => (r.ok ? r.json() : { flows: [] }))
      .then((d: { flows?: { slug: string }[] }) => {
        if (alive) setFiles((d.flows ?? []).map((f) => f.slug));
      })
      .catch(() => alive && setFiles([]));
    return () => {
      alive = false;
    };
  }, []);

  const copyYaml = () => {
    void navigator.clipboard.writeText(yaml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  const codeBox =
    "rounded-lg border border-border/50 bg-bg px-3 py-2.5 font-mono text-[11px] leading-relaxed text-secondary";

  return (
    <div className="justapi-spec-drawer flex w-[380px] flex-none flex-col border-l border-border/60 bg-bg-secondary">
      {/* header */}
      <div className="border-b border-border/50 px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold text-primary">
            Flow spec
          </span>
          <span className="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] text-accent">
            justapiFlow: 1
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded p-0.5 text-muted transition-colors hover:text-primary"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
          This board is a document. Agents read &amp; write the same spec over
          HTTP, files, and MCP — a human watches it run.
        </p>
      </div>

      {/* tabs */}
      <div className="flex gap-1 border-b border-border/50 px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-2.5 pb-2 pt-2 text-[12px] font-semibold transition-colors",
              tab === t.id
                ? "border-accent text-primary"
                : "border-transparent text-muted hover:text-secondary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* content */}
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        {tab === "spec" &&
          (spec ? (
            <div className="relative">
              <button
                type="button"
                onClick={copyYaml}
                className="absolute right-0 top-0 flex items-center gap-1 rounded-md border border-border/50 bg-bg-secondary/80 px-1.5 py-0.5 text-[10.5px] text-muted transition-colors hover:text-primary"
                title="Copy YAML"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? "copied" : "copy"}
              </button>
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-[1.65] text-secondary">
                {yaml.split("\n").map((line, i) => (
                  <div key={i}>{hlLine(line)}</div>
                ))}
              </pre>
            </div>
          ) : (
            <p className="text-[12px] text-muted">
              Add a request to the board and its spec appears here.
            </p>
          ))}

        {tab === "http" && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                1 · push the spec
              </div>
              <div className={codeBox}>
                <span className="text-warning">POST</span> /api/flows
                <br />
                <span className="text-muted">← {"{ slug: "}</span>
                <span className="text-success">&quot;{slug}&quot;</span>
                <span className="text-muted">{" }"}</span>
              </div>
            </div>
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                2 · run it
              </div>
              <div className={codeBox}>
                <span className="text-warning">POST</span> /api/flows/{slug}/run
                <br />
                <span className="text-muted">← report {"{ "}passed, checks{" }"}</span>
              </div>
            </div>
            <p className="text-[11.5px] leading-relaxed text-muted">
              Two curls in CI. Same report shape whether a human watched the
              canvas or not — headless server-side otherwise.
            </p>
          </div>
        )}

        {tab === "files" && (
          <div className="flex flex-col gap-3">
            <div className={codeBox}>
              <div className="text-muted">.justapi/flows/</div>
              {files === null ? (
                <div className="pl-3.5 pt-1 text-muted">loading…</div>
              ) : files.length === 0 ? (
                <div className="pl-3.5 pt-1 text-muted">
                  {slug}.json{" "}
                  <span className="text-[9px] text-muted/70">· not pushed yet</span>
                </div>
              ) : (
                files.map((f) => (
                  <div
                    key={f}
                    className={cn(
                      "flex items-center gap-2 pl-3.5 pt-1",
                      f === slug ? "text-accent" : "text-muted/70"
                    )}
                  >
                    {f}.json
                    {f === slug && (
                      <span className="text-[9px] text-muted">· this board</span>
                    )}
                  </div>
                ))
              )}
            </div>
            <p className="text-[11.5px] leading-relaxed text-muted">
              Every flow persists as a plain file. Edit it, re-POST it, or commit
              it — the canvas picks up the change.
            </p>
          </div>
        )}

        {tab === "mcp" && (
          <div className="flex flex-col gap-2.5">
            <div className="font-mono text-[10.5px] text-muted">mcp/server.mjs</div>
            <div className="flex flex-col gap-2">
              {MCP_TOOLS.map((t) => (
                <div
                  key={t.name}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2",
                    t.highlight
                      ? "border-accent/30 bg-accent/10"
                      : "border-border/50 bg-bg"
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-[11px]",
                      t.highlight ? "font-semibold text-accent" : "text-accent"
                    )}
                  >
                    {t.name}
                  </span>
                  <span className="ml-auto text-[10.5px] text-muted">
                    {t.blurb}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
              The spec reference lives in the tool descriptions — the agent
              already knows the contract.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
