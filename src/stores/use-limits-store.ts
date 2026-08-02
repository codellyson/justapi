import { create } from "zustand";

export interface Usage {
  canvases: number;
  requests: number;
  collections: number;
  assertions: number;
  environments: number;
}
export interface Limits {
  canvases: number;
}

interface LimitsState {
  plan: string | null;
  limits: Limits | null;
  usage: Usage | null;
  /** True once a server sync has populated plan/limits/usage. */
  synced: boolean;
  /** Transient message when the plan cap blocks an action (create over cap). */
  notice: string | null;
  set: (v: { plan: string; limits: Limits; usage: Usage }) => void;
  setUsage: (usage: Usage) => void;
  setNotice: (notice: string | null) => void;
  reset: () => void;
}

/** Server-authoritative usage/limits, populated by the canvas sync. The create
 *  gate and the account page read from here when signed in. */
export const useLimitsStore = create<LimitsState>((set) => ({
  plan: null,
  limits: null,
  usage: null,
  synced: false,
  notice: null,
  set: ({ plan, limits, usage }) => set({ plan, limits, usage, synced: true }),
  setUsage: (usage) => set({ usage }),
  setNotice: (notice) => set({ notice }),
  reset: () =>
    set({ plan: null, limits: null, usage: null, synced: false, notice: null }),
}));
