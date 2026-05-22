"use client";

import type { Drift } from "../types";
import { formatSize } from "../drift";

interface DriftLineProps {
  drift: Drift;
}

const fieldLabel = (path: string) => path || "(root)";

export const DriftLine = ({ drift }: DriftLineProps) => {
  if (drift.kind === "none") return null;

  if (drift.kind === "identical") {
    return (
      <div className="py-1 px-3 text-[10px] font-mono text-muted opacity-60">
        Identical to previous
      </div>
    );
  }

  if (drift.kind === "status") {
    return (
      <div className="py-1 px-3 text-[10px] font-mono text-danger">
        status {drift.statusBefore} → {drift.statusAfter}
        {drift.sizeDelta != null && drift.sizeDelta !== 0 && (
          <span className="text-muted ml-2">
            size {drift.sizeDelta > 0 ? "+" : ""}
            {formatSize(drift.sizeDelta)}
          </span>
        )}
      </div>
    );
  }

  if (drift.kind === "size") {
    return (
      <div className="py-1 px-3 text-[10px] font-mono text-muted">
        size {drift.sizeDelta && drift.sizeDelta > 0 ? "+" : ""}
        {formatSize(drift.sizeDelta ?? 0)}
      </div>
    );
  }

  return (
    <div className="py-1 px-3 text-[10px] font-mono text-warning flex flex-wrap gap-x-3">
      {drift.fields?.map((f, i) => (
        <span key={i}>
          {f.kind === "added" && <>+ field &quot;{fieldLabel(f.path)}&quot;</>}
          {f.kind === "removed" && <>− field &quot;{fieldLabel(f.path)}&quot;</>}
          {f.kind === "changed" && (
            <>
              ~ field &quot;{fieldLabel(f.path)}&quot;{" "}
              <span className="opacity-70">
                {JSON.stringify(f.before)} → {JSON.stringify(f.after)}
              </span>
            </>
          )}
        </span>
      ))}
    </div>
  );
};
