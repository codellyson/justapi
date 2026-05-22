import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HttpMethod } from "../utils/http";
import type { AuthType, BodyType } from "../stores/use-request-store";

export type PopoverKey = "body" | "auth" | "env" | "headers";

export interface AuthConfig {
  bearerToken?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiKeyHeader?: string;
}

interface DraftSnapshot {
  method: HttpMethod;
  url: string;
  body: string;
  bodyType: BodyType;
  authType: AuthType;
  authConfig: AuthConfig;
  headers: Record<string, string>;
}

interface DraftState extends DraftSnapshot {
  openPopovers: PopoverKey[];
  undoStack: DraftSnapshot[];

  setMethod: (m: HttpMethod) => void;
  setUrl: (u: string) => void;
  setBody: (b: string) => void;
  setBodyType: (t: BodyType) => void;
  setAuthType: (t: AuthType) => void;
  setAuthConfig: (patch: Partial<AuthConfig>) => void;
  setHeaders: (h: Record<string, string>) => void;

  togglePopover: (key: PopoverKey) => void;
  closePopover: (key: PopoverKey) => void;
  closeAllPopovers: () => void;

  fillFrom: (snap: Partial<DraftSnapshot>) => void;
  undoFill: () => boolean;
  clearAll: () => void;
}

const empty: DraftSnapshot = {
  method: "GET",
  url: "",
  body: "",
  bodyType: "none",
  authType: "none",
  authConfig: {},
  headers: {},
};

const snapshot = (s: DraftState): DraftSnapshot => ({
  method: s.method,
  url: s.url,
  body: s.body,
  bodyType: s.bodyType,
  authType: s.authType,
  authConfig: { ...s.authConfig },
  headers: { ...s.headers },
});

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      ...empty,
      openPopovers: [],
      undoStack: [],

      setMethod: (m) =>
        set((s) => {
          const bodyType =
            m === "GET" || m === "HEAD" || m === "OPTIONS" ? "none" : s.bodyType;
          return { method: m, bodyType };
        }),
      setUrl: (u) => set({ url: u }),
      setBody: (b) => set({ body: b }),
      setBodyType: (t) => set({ bodyType: t }),
      setAuthType: (t) => set({ authType: t }),
      setAuthConfig: (patch) =>
        set((s) => ({ authConfig: { ...s.authConfig, ...patch } })),
      setHeaders: (h) => set({ headers: h }),

      togglePopover: (key) =>
        set((s) => ({
          openPopovers: s.openPopovers.includes(key)
            ? s.openPopovers.filter((k) => k !== key)
            : [...s.openPopovers, key],
        })),
      closePopover: (key) =>
        set((s) => ({
          openPopovers: s.openPopovers.filter((k) => k !== key),
        })),
      closeAllPopovers: () => set({ openPopovers: [] }),

      fillFrom: (snap) => {
        const prev = snapshot(get());
        set((s) => ({
          ...s,
          ...snap,
          authConfig: snap.authConfig
            ? { ...snap.authConfig }
            : s.authConfig,
          headers: snap.headers ? { ...snap.headers } : s.headers,
          undoStack: [...s.undoStack, prev].slice(-10),
        }));
      },
      undoFill: () => {
        const s = get();
        const top = s.undoStack[s.undoStack.length - 1];
        if (!top) return false;
        set({
          ...top,
          openPopovers: s.openPopovers,
          undoStack: s.undoStack.slice(0, -1),
        });
        return true;
      },
      clearAll: () =>
        set({ ...empty, openPopovers: [], undoStack: [] }),
    }),
    {
      name: "justapi-v1-draft",
      version: 1,
      partialize: (s) => ({
        method: s.method,
        url: s.url,
        body: s.body,
        bodyType: s.bodyType,
        authType: s.authType,
        authConfig: s.authConfig,
        headers: s.headers,
        openPopovers: s.openPopovers,
      }),
    }
  )
);
