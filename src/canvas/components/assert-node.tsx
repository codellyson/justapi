"use client";

import { memo, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ShieldCheck, Trash2, Plus, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { ASSERT_OPS, evaluateChecks } from "../asserts";
import type {
  AssertNode as AssertNodeType,
  AssertNodeData,
  AssertCheck,
  AssertOp,
} from "../types";
import { useCanvasStore } from "../use-canvas-store";
import { useRunStore } from "../use-run-store";

const uid = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Grades the upstream request's response. Checks evaluate live — run the
 * request and every row shows pass/fail immediately; the flow runner
 * folds these into the origin's verdict.
 */
export const AssertNodeCard = memo(
  ({ id, data }: NodeProps<AssertNodeType>) => {
    const { checks } = data as AssertNodeData;
    const updateNodeData = useCanvasStore((s) => s.updateNodeData);
    const removeNode = useCanvasStore((s) => s.removeNode);

    // The request this assert grades: source of the first incoming edge.
    const sourceId = useCanvasStore((s) => {
      const g = s.graphs[s.activeGraphId];
      return g?.edges.find((e) => e.target === id)?.source ?? null;
    });
    const sourceRun = useRunStore((s) =>
      sourceId ? s.runs[sourceId] : undefined
    );

    const evaluation = useMemo(
      () =>
        sourceRun?.response
          ? evaluateChecks(checks, sourceRun.response)
          : null,
      [checks, sourceRun]
    );

    const setChecks = (next: AssertCheck[]) =>
      updateNodeData(id, { checks: next });

    const patchCheck = (checkId: string, patch: Partial<AssertCheck>) =>
      setChecks(
        checks.map((c) => (c.id === checkId ? { ...c, ...patch } : c))
      );

    const allPass = evaluation !== null && evaluation.failed === 0;
    const anyFail = evaluation !== null && evaluation.failed > 0;

    return (
      <div
        data-tour="assert"
        className={cn(
          "group w-[320px] rounded-2xl border bg-gradient-to-b from-bg-secondary/95 to-bg/85 font-sans text-[13px] text-primary shadow-[0_20px_48px_-28px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-[border-color]",
          anyFail
            ? "border-danger/50"
            : allPass
            ? "border-success/40"
            : "border-border/40 hover:border-border/70"
        )}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="justapi-handle"
          style={{ borderColor: "rgb(var(--warning))" }}
        />

        {/* eyebrow */}
        <div className="flex items-center gap-1.5 rounded-t-[15px] bg-warning/[0.06] px-3 py-1.5">
          <ShieldCheck className="h-3 w-3 shrink-0 text-warning" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-warning">
            assert
          </span>
          <div className="flex-1" />
          {evaluation && (
            <span
              className={cn(
                "text-[11px] font-medium",
                anyFail ? "text-danger" : "text-success"
              )}
            >
              {anyFail
                ? `${evaluation.failed} of ${checks.length} failing`
                : `${checks.length} passing`}
            </span>
          )}
          {!evaluation && (
            <span className="text-[11px] text-muted">
              awaiting run
            </span>
          )}
          <button
            type="button"
            onClick={() => removeNode(id)}
            className="nodrag rounded p-0.5 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            title="Delete assert node"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* checks */}
        <div className="space-y-1 px-2.5 py-2">
          {checks.map((check, i) => {
            const result = evaluation?.results[i];
            return (
              <div key={check.id} className="space-y-0.5">
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      result
                        ? result.pass
                          ? "bg-success"
                          : "bg-danger"
                        : "bg-border"
                    )}
                    title={
                      result ? (result.pass ? "passing" : "failing") : "not run"
                    }
                  />
                  <input
                    className="nodrag min-w-0 flex-1 rounded border border-border/40 bg-bg px-1.5 py-0.5 font-mono text-[12px] outline-none focus:border-accent/60 placeholder:text-muted/70"
                    placeholder="status · data.id"
                    value={check.path}
                    onChange={(e) =>
                      patchCheck(check.id, { path: e.target.value })
                    }
                    spellCheck={false}
                  />
                  <select
                    className="nodrag shrink-0 cursor-pointer rounded border border-border/40 bg-bg px-1 py-0.5 text-[12px] text-secondary outline-none"
                    value={check.op}
                    onChange={(e) =>
                      patchCheck(check.id, { op: e.target.value as AssertOp })
                    }
                  >
                    {ASSERT_OPS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  {check.op !== "exists" && (
                    <input
                      className="nodrag w-16 shrink-0 rounded border border-border/40 bg-bg px-1.5 py-0.5 font-mono text-[12px] outline-none focus:border-accent/60 placeholder:text-muted/70"
                      placeholder="expected"
                      value={check.value}
                      onChange={(e) =>
                        patchCheck(check.id, { value: e.target.value })
                      }
                      spellCheck={false}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setChecks(checks.filter((c) => c.id !== check.id))
                    }
                    className="nodrag shrink-0 rounded p-0.5 text-muted hover:text-danger"
                    title="Remove check"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
                {result && !result.pass && (
                  <div
                    className="truncate pl-2.5 font-mono text-[10px] text-danger/80"
                    title={result.actual}
                  >
                    got {result.actual}
                  </div>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() =>
              setChecks([
                ...checks,
                { id: uid(), path: "", op: "exists", value: "" },
              ])
            }
            className="nodrag flex items-center gap-1 rounded px-1 py-0.5 text-[12px] text-muted transition-colors hover:text-accent"
          >
            <Plus className="h-2.5 w-2.5" />
            add check
          </button>
        </div>
      </div>
    );
  }
);

AssertNodeCard.displayName = "AssertNodeCard";
