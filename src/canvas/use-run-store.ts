"use client";

import { create } from "zustand";
import type { HttpResponse } from "../utils/http";
import type { RunStatus } from "./types";

export interface RunRecord {
  status: RunStatus;
  response: HttpResponse | null;
  error: string | null;
  finishedAt: number | null;
}

export const idleRun: RunRecord = {
  status: "idle",
  response: null,
  error: null,
  finishedAt: null,
};

/**
 * Per-node run state. Deliberately NOT persisted: responses can blow the
 * localStorage quota, and a stale persisted response would silently feed
 * outdated values into chained runs after a reload.
 */
interface RunState {
  runs: Record<string, RunRecord>;
  setPending: (nodeId: string) => void;
  setSuccess: (nodeId: string, response: HttpResponse) => void;
  setError: (nodeId: string, error: string, response?: HttpResponse) => void;
  /** Flow-source summary: no response, just a verdict line. */
  setSummary: (nodeId: string, message: string, failed: boolean) => void;
  reset: (nodeId: string) => void;
}

export const useRunStore = create<RunState>()((set) => ({
  runs: {},
  setPending: (nodeId) =>
    set((s) => ({
      runs: {
        ...s.runs,
        [nodeId]: { status: "pending", response: null, error: null, finishedAt: null },
      },
    })),
  setSuccess: (nodeId, response) =>
    set((s) => ({
      runs: {
        ...s.runs,
        [nodeId]: {
          status: "success",
          response,
          error: null,
          finishedAt: Date.now(),
        },
      },
    })),
  setError: (nodeId, error, response) =>
    set((s) => ({
      runs: {
        ...s.runs,
        [nodeId]: {
          status: "error",
          response: response ?? null,
          error,
          finishedAt: Date.now(),
        },
      },
    })),
  setSummary: (nodeId, message, failed) =>
    set((s) => ({
      runs: {
        ...s.runs,
        [nodeId]: {
          status: failed ? "error" : "success",
          response: null,
          error: message,
          finishedAt: Date.now(),
        },
      },
    })),
  reset: (nodeId) =>
    set((s) => {
      const runs = { ...s.runs };
      delete runs[nodeId];
      return { runs };
    }),
}));

/** AbortControllers live outside React state — they're not renderable. */
export const abortControllers = new Map<string, AbortController>();

export const abortNode = (nodeId: string): void => {
  abortControllers.get(nodeId)?.abort();
  abortControllers.delete(nodeId);
};
