import type { Drift, DriftField } from "./types";
import type { HttpResponse } from "../utils/http";

const MAX_FIELDS = 5;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const diffShape = (
  before: unknown,
  after: unknown,
  path: string,
  out: DriftField[]
): void => {
  if (out.length >= MAX_FIELDS) return;
  if (before === after) return;

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const k of keys) {
      if (out.length >= MAX_FIELDS) return;
      const next = path ? `${path}.${k}` : k;
      const a = before[k];
      const b = after[k];
      if (!(k in before)) {
        out.push({ path: next, kind: "added", after: b });
      } else if (!(k in after)) {
        out.push({ path: next, kind: "removed", before: a });
      } else {
        diffShape(a, b, next, out);
      }
    }
    return;
  }

  const sameType = typeof before === typeof after;
  if (!sameType || before !== after) {
    out.push({ path, kind: "changed", before, after });
  }
};

export const computeDrift = (
  prev: HttpResponse,
  next: HttpResponse
): Drift => {
  const sizeDelta = next.size - prev.size;

  if (prev.status !== next.status) {
    return {
      kind: "status",
      statusBefore: prev.status,
      statusAfter: next.status,
      sizeDelta,
    };
  }

  const fields: DriftField[] = [];
  diffShape(prev.data, next.data, "", fields);

  if (fields.length > 0) {
    return { kind: "shape", sizeDelta, fields };
  }

  if (sizeDelta !== 0) {
    return { kind: "size", sizeDelta };
  }

  return { kind: "identical" };
};

export const formatSize = (bytes: number): string => {
  const abs = Math.abs(bytes);
  if (abs < 1024) return `${bytes}B`;
  if (abs < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};
