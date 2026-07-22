"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Globe, Plus, Trash2, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { useEnvironmentStore } from "../../stores/use-environment-store";
import type { EnvNode as EnvNodeType, EnvNodeData } from "../types";
import { useCanvasStore } from "../use-canvas-store";

export const EnvNodeCard = memo(({ id, data }: NodeProps<EnvNodeType>) => {
  const { environmentId } = data as EnvNodeData;
  const environments = useEnvironmentStore((s) => s.environments);
  const updateEnvironment = useEnvironmentStore((s) => s.updateEnvironment);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const removeNode = useCanvasStore((s) => s.removeNode);

  const env = environments.find((e) => e.id === environmentId);
  const [newKey, setNewKey] = useState("");

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
    const k = newKey.trim();
    if (!k || !env) return;
    setVar(k, "");
    setNewKey("");
  };

  return (
    <div className="group w-[240px] rounded-xl border border-border/60 bg-bg-secondary/95 backdrop-blur-sm shadow-[0_10px_28px_-14px_rgba(0,0,0,0.5)] font-sans text-[11px] text-primary hover:border-border transition-[border-color]">
      <Handle
        type="source"
        position={Position.Right}
        className="justapi-handle"
        style={{ borderColor: "rgb(var(--success))" }}
      />

      <div className="flex items-center gap-1.5 rounded-t-[11px] bg-success/[0.08] px-3 py-1.5">
        <Globe className="h-3 w-3 shrink-0 text-success" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-success">
          env
        </span>
        <select
          className="nodrag min-w-0 flex-1 cursor-pointer bg-transparent text-right text-[10px] uppercase tracking-[0.12em] text-secondary outline-none"
          value={environmentId}
          onChange={(e) => updateNodeData(id, { environmentId: e.target.value })}
        >
          {environments.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => removeNode(id)}
          className="nodrag rounded p-0.5 text-muted/60 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
          title="Delete node"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="px-3 py-2 space-y-1">
        {env &&
          Object.entries(env.variables).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1">
              <span
                className="shrink-0 max-w-[80px] truncate text-secondary"
                title={k}
              >
                {k}
              </span>
              <input
                className="nodrag flex-1 min-w-0 font-mono rounded border border-border/40 bg-bg px-1.5 py-0.5 text-[10px] outline-none focus:border-accent/60"
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
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        <div className="flex items-center gap-1">
          <input
            className="nodrag flex-1 min-w-0 font-mono rounded border border-dashed border-border/40 bg-transparent px-1.5 py-0.5 text-[10px] outline-none focus:border-accent/60 placeholder:text-muted/50"
            placeholder="new variable"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addVar();
            }}
            spellCheck={false}
          />
          <button
            type="button"
            onClick={addVar}
            className={cn(
              "nodrag p-0.5 rounded",
              newKey.trim()
                ? "text-accent hover:bg-accent/10"
                : "text-muted/40"
            )}
            title="Add variable"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
});

EnvNodeCard.displayName = "EnvNodeCard";
