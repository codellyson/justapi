"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Bookmark,
  Trash2,
  Plus,
  Play,
  Globe,
  ChevronDown,
  ChevronRight,
  X,
  KeyRound,
  List,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useCollectionsStore } from "../use-collections-store";
import { useEnvironmentStore } from "../../stores/use-environment-store";
import type {
  CollectionNode as CollectionNodeType,
  CollectionNodeData,
  AuthType,
} from "../types";
import { useCanvasStore, useActiveGraph } from "../use-canvas-store";
import { useRunStore, idleRun } from "../use-run-store";
import { runFlow } from "../engine";

const BRANCH_X_GAP = 420;
const BRANCH_Y_GAP = 150;

/**
 * The origin of a flow: the root every request in the tree traces back
 * to. Requests are added from here (and branch from each other); run
 * executes the whole tree in order.
 */
export const CollectionNodeCard = memo(
  ({ id, data }: NodeProps<CollectionNodeType>) => {
    const {
      collectionId,
      environmentId,
      headers: defaultHeaders,
      authType: defaultAuthType,
      authConfig: defaultAuthConfig,
    } = data as CollectionNodeData;
    const collections = useCollectionsStore((s) => s.collections);
    const environments = useEnvironmentStore((s) => s.environments);
    const activeEnvironmentId = useEnvironmentStore(
      (s) => s.activeEnvironmentId
    );
    const updateEnvironment = useEnvironmentStore((s) => s.updateEnvironment);
    const updateNodeData = useCanvasStore((s) => s.updateNodeData);
    const removeNode = useCanvasStore((s) => s.removeNode);
    const addLinkedRequest = useCanvasStore((s) => s.addLinkedRequest);
    const graph = useActiveGraph();
    const run = useRunStore((s) => s.runs[id]) ?? idleRun;

    const [envOpen, setEnvOpen] = useState(false);
    const [newVar, setNewVar] = useState("");
    const [authOpen, setAuthOpen] = useState(false);
    const [headersOpen, setHeadersOpen] = useState(false);
    const [newHeader, setNewHeader] = useState("");

    const auth = defaultAuthType ?? "none";
    const authCfg = defaultAuthConfig ?? {};
    const headerCount = Object.keys(defaultHeaders ?? {}).length;

    const setAuthField = (key: string, value: string) =>
      updateNodeData(id, { authConfig: { ...authCfg, [key]: value } });
    const setHeader = (key: string, value: string) =>
      updateNodeData(id, {
        headers: { ...(defaultHeaders ?? {}), [key]: value },
      });
    const removeHeader = (key: string) => {
      const next = { ...(defaultHeaders ?? {}) };
      delete next[key];
      updateNodeData(id, { headers: next });
    };
    const addHeader = () => {
      const k = newHeader.trim();
      if (!k) return;
      setHeader(k, "");
      setNewHeader("");
    };

    const collection = collections.find((c) => c.id === collectionId);
    const running = run.status === "pending";
    const outgoing = graph.edges.filter((e) => e.source === id).length;

    // The environment this tree runs under: the origin's own pick, or
    // the app's active environment as the fallback.
    const effectiveEnvId = environmentId ?? activeEnvironmentId;
    const env = environments.find((e) => e.id === effectiveEnvId) ?? null;

    const setVar = (key: string, value: string) => {
      if (!env) return;
      updateEnvironment(env.id, {
        variables: { ...env.variables, [key]: value },
      });
    };
    const removeVar = (key: string) => {
      if (!env) return;
      const vars = { ...env.variables };
      delete vars[key];
      updateEnvironment(env.id, { variables: vars });
    };
    const addVar = () => {
      const k = newVar.trim();
      if (!k || !env) return;
      setVar(k, "");
      setNewVar("");
    };

    const addRequest = () => {
      const s = useCanvasStore.getState();
      const self = s.graphs[s.activeGraphId]?.nodes.find((n) => n.id === id);
      if (!self) return;
      addLinkedRequest(id, {
        x: self.position.x + BRANCH_X_GAP,
        y: self.position.y + outgoing * BRANCH_Y_GAP,
      });
    };

    return (
      <div className="group w-[230px] rounded-2xl border border-border/40 bg-bg-secondary/95 font-sans text-[11px] text-primary shadow-[0_20px_48px_-28px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-[border-color] hover:border-border/70">
        <Handle
          type="source"
          position={Position.Right}
          className="justapi-handle"
          style={{ borderColor: "rgb(var(--accent))" }}
        />

        {/* eyebrow */}
        <div className="flex items-center gap-1.5 rounded-t-[15px] bg-accent/[0.06] px-3 py-1.5">
          <Bookmark className="h-3 w-3 shrink-0 text-accent" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">
            origin
          </span>
          <select
            className="nodrag min-w-0 flex-1 cursor-pointer bg-transparent text-right text-[10px] uppercase tracking-[0.12em] text-secondary outline-none"
            value={collectionId}
            onChange={(e) =>
              updateNodeData(id, { collectionId: e.target.value })
            }
          >
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            {!collection && <option value={collectionId}>(deleted)</option>}
          </select>
          <button
            type="button"
            onClick={() => void runFlow(id)}
            disabled={running}
            className={cn(
              "nodrag flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
              running
                ? "animate-pulse border-accent/60 text-accent"
                : "border-accent/50 text-accent hover:bg-accent hover:text-accent-text"
            )}
            title="Run flow — executes every request in this tree, in order"
          >
            <Play className="ml-px h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => removeNode(id)}
            className="nodrag rounded p-0.5 text-muted/60 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            title="Remove from canvas (collection is kept)"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* environment: scopes the whole tree */}
        <div className="border-b border-border/40">
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <button
              type="button"
              onClick={() => setEnvOpen((o) => !o)}
              className="nodrag flex items-center gap-1 text-muted hover:text-primary"
              title="Environment for this flow's variables"
            >
              {envOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Globe className="h-3 w-3 text-success" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em]">
                env
              </span>
            </button>
            <select
              className="nodrag min-w-0 flex-1 cursor-pointer bg-transparent text-right text-[10px] text-secondary outline-none"
              value={environmentId ?? ""}
              onChange={(e) =>
                updateNodeData(id, { environmentId: e.target.value || null })
              }
            >
              <option value="">
                active
                {env && !environmentId ? ` (${env.name.toLowerCase()})` : ""}
              </option>
              {environments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          {envOpen && env && (
            <div className="space-y-1 px-3 pb-2">
              {Object.entries(env.variables).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1">
                  <span
                    className="max-w-[70px] shrink-0 truncate font-mono text-[10px] text-secondary"
                    title={k}
                  >
                    {k}
                  </span>
                  <input
                    className="nodrag min-w-0 flex-1 rounded border border-border/40 bg-bg px-1.5 py-0.5 font-mono text-[10px] outline-none focus:border-accent/60"
                    defaultValue={v}
                    onBlur={(e) => setVar(k, e.target.value)}
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => removeVar(k)}
                    className="nodrag p-0.5 text-muted/50 hover:text-danger"
                    title={`Remove ${k}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <input
                  className="nodrag min-w-0 flex-1 rounded border border-dashed border-border/40 bg-transparent px-1.5 py-0.5 font-mono text-[10px] outline-none focus:border-accent/60 placeholder:text-muted/50"
                  placeholder="new variable"
                  value={newVar}
                  onChange={(e) => setNewVar(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addVar();
                  }}
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={addVar}
                  className={cn(
                    "nodrag rounded p-0.5",
                    newVar.trim() ? "text-accent hover:bg-accent/10" : "text-muted/40"
                  )}
                  title="Add variable"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* default auth: inherited by requests that set none */}
        <div className="border-b border-border/40">
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <button
              type="button"
              onClick={() => setAuthOpen((o) => !o)}
              className="nodrag flex items-center gap-1 text-muted hover:text-primary"
              title="Default auth — requests without their own auth inherit this"
            >
              {authOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <KeyRound className="h-3 w-3 text-warning" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em]">
                auth
              </span>
            </button>
            <select
              className="nodrag min-w-0 flex-1 cursor-pointer bg-transparent text-right text-[10px] text-secondary outline-none"
              value={auth}
              onChange={(e) =>
                updateNodeData(id, { authType: e.target.value as AuthType })
              }
            >
              <option value="none">none</option>
              <option value="bearer">bearer</option>
              <option value="basic">basic</option>
              <option value="api-key">api key</option>
            </select>
          </div>
          {authOpen && auth !== "none" && (
            <div className="space-y-1 px-3 pb-2">
              {auth === "bearer" && (
                <input
                  className="nodrag w-full rounded border border-border/40 bg-bg px-1.5 py-0.5 font-mono text-[10px] outline-none focus:border-accent/60 placeholder:text-muted/50"
                  placeholder="token or {{token}}"
                  defaultValue={authCfg.bearerToken ?? ""}
                  onBlur={(e) => setAuthField("bearerToken", e.target.value)}
                  spellCheck={false}
                />
              )}
              {auth === "basic" && (
                <>
                  <input
                    className="nodrag w-full rounded border border-border/40 bg-bg px-1.5 py-0.5 font-mono text-[10px] outline-none focus:border-accent/60 placeholder:text-muted/50"
                    placeholder="username"
                    defaultValue={authCfg.username ?? ""}
                    onBlur={(e) => setAuthField("username", e.target.value)}
                    spellCheck={false}
                  />
                  <input
                    className="nodrag w-full rounded border border-border/40 bg-bg px-1.5 py-0.5 font-mono text-[10px] outline-none focus:border-accent/60 placeholder:text-muted/50"
                    placeholder="password or {{password}}"
                    defaultValue={authCfg.password ?? ""}
                    onBlur={(e) => setAuthField("password", e.target.value)}
                    spellCheck={false}
                  />
                </>
              )}
              {auth === "api-key" && (
                <>
                  <input
                    className="nodrag w-full rounded border border-border/40 bg-bg px-1.5 py-0.5 font-mono text-[10px] outline-none focus:border-accent/60 placeholder:text-muted/50"
                    placeholder="header (X-Api-Key)"
                    defaultValue={authCfg.apiKeyHeader ?? ""}
                    onBlur={(e) => setAuthField("apiKeyHeader", e.target.value)}
                    spellCheck={false}
                  />
                  <input
                    className="nodrag w-full rounded border border-border/40 bg-bg px-1.5 py-0.5 font-mono text-[10px] outline-none focus:border-accent/60 placeholder:text-muted/50"
                    placeholder="key or {{apiKey}}"
                    defaultValue={authCfg.apiKey ?? ""}
                    onBlur={(e) => setAuthField("apiKey", e.target.value)}
                    spellCheck={false}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* default headers: merged under every request's own */}
        <div className="border-b border-border/40">
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <button
              type="button"
              onClick={() => setHeadersOpen((o) => !o)}
              className="nodrag flex w-full items-center gap-1 text-muted hover:text-primary"
              title="Default headers — every request in this tree sends them (its own headers win)"
            >
              {headersOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <List className="h-3 w-3 text-accent" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em]">
                headers
              </span>
              <div className="flex-1" />
              {headerCount > 0 && (
                <span className="text-[10px] text-secondary">
                  {headerCount}
                </span>
              )}
            </button>
          </div>
          {headersOpen && (
            <div className="space-y-1 px-3 pb-2">
              {Object.entries(defaultHeaders ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1">
                  <span
                    className="max-w-[70px] shrink-0 truncate font-mono text-[10px] text-secondary"
                    title={k}
                  >
                    {k}
                  </span>
                  <input
                    className="nodrag min-w-0 flex-1 rounded border border-border/40 bg-bg px-1.5 py-0.5 font-mono text-[10px] outline-none focus:border-accent/60"
                    defaultValue={v}
                    onBlur={(e) => setHeader(k, e.target.value)}
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => removeHeader(k)}
                    className="nodrag p-0.5 text-muted/50 hover:text-danger"
                    title={`Remove ${k}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <input
                  className="nodrag min-w-0 flex-1 rounded border border-dashed border-border/40 bg-transparent px-1.5 py-0.5 font-mono text-[10px] outline-none focus:border-accent/60 placeholder:text-muted/50"
                  placeholder="new header"
                  value={newHeader}
                  onChange={(e) => setNewHeader(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addHeader();
                  }}
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={addHeader}
                  className={cn(
                    "nodrag rounded p-0.5",
                    newHeader.trim()
                      ? "text-accent hover:bg-accent/10"
                      : "text-muted/40"
                  )}
                  title="Add header"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* grow the tree */}
        <button
          type="button"
          onClick={addRequest}
          className={cn(
            "nodrag flex w-full items-center justify-center gap-1.5 px-3 py-2",
            "text-[10px] font-medium text-accent transition-colors hover:bg-accent/10",
            run.status === "idle" && "rounded-b-[15px]"
          )}
          title="Add a request to this flow — it branches from the origin"
        >
          <Plus className="h-3 w-3" />
          add request
        </button>

        {/* flow verdict */}
        {running && (
          <div className="rounded-b-[15px] border-t border-border/40 px-3 py-1.5 text-[10px] text-accent">
            <span className="animate-pulse">running flow…</span>
          </div>
        )}
        {!running && run.error && (
          <div
            className={cn(
              "rounded-b-[15px] border-t border-border/40 px-3 py-1.5 text-[10px] font-medium",
              run.status === "error"
                ? "bg-danger/[0.07] text-danger"
                : "bg-success/[0.07] text-success"
            )}
          >
            {run.error}
          </div>
        )}
      </div>
    );
  }
);

CollectionNodeCard.displayName = "CollectionNodeCard";
