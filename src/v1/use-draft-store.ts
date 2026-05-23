import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HttpMethod } from "../utils/http";
import type { AuthType, BodyType } from "../stores/use-request-store";
import {
  DEFAULT_WORKSPACE_ID,
  useWorkspaceStore,
} from "./use-workspace-store";

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

interface DraftRecord extends DraftSnapshot {
  openPopovers: PopoverKey[];
  undoStack: DraftSnapshot[];
}

interface DraftStoreState {
  /** Per-workspace draft state. */
  drafts: Record<string, DraftRecord>;
}

interface DraftStoreActions {
  /** Returns the draft for the given workspace, falling back to the empty
   *  draft (without mutating the store). */
  get: (workspaceId: string) => DraftRecord;
  setMethod: (workspaceId: string, m: HttpMethod) => void;
  setUrl: (workspaceId: string, u: string) => void;
  setBody: (workspaceId: string, b: string) => void;
  setBodyType: (workspaceId: string, t: BodyType) => void;
  setAuthType: (workspaceId: string, t: AuthType) => void;
  setAuthConfig: (workspaceId: string, patch: Partial<AuthConfig>) => void;
  setHeaders: (workspaceId: string, h: Record<string, string>) => void;
  togglePopover: (workspaceId: string, key: PopoverKey) => void;
  closePopover: (workspaceId: string, key: PopoverKey) => void;
  closeAllPopovers: (workspaceId: string) => void;
  fillFrom: (workspaceId: string, snap: Partial<DraftSnapshot>) => void;
  undoFill: (workspaceId: string) => boolean;
  clearAll: (workspaceId: string) => void;
}

type State = DraftStoreState & DraftStoreActions;

const emptyDraft: DraftRecord = {
  method: "GET",
  url: "",
  body: "",
  bodyType: "none",
  authType: "none",
  authConfig: {},
  headers: {},
  openPopovers: [],
  undoStack: [],
};

const snapshot = (d: DraftRecord): DraftSnapshot => ({
  method: d.method,
  url: d.url,
  body: d.body,
  bodyType: d.bodyType,
  authType: d.authType,
  authConfig: { ...d.authConfig },
  headers: { ...d.headers },
});

const updateDraft = (
  drafts: Record<string, DraftRecord>,
  workspaceId: string,
  patch: Partial<DraftRecord>
): Record<string, DraftRecord> => {
  const current = drafts[workspaceId] ?? emptyDraft;
  return { ...drafts, [workspaceId]: { ...current, ...patch } };
};

export const useDraftStoreRaw = create<State>()(
  persist(
    (set, get) => ({
      drafts: { [DEFAULT_WORKSPACE_ID]: { ...emptyDraft } },
      get: (workspaceId) =>
        get().drafts[workspaceId] ?? emptyDraft,
      setMethod: (workspaceId, m) =>
        set((s) => {
          const current = s.drafts[workspaceId] ?? emptyDraft;
          const bodyType =
            m === "GET" || m === "HEAD" || m === "OPTIONS"
              ? "none"
              : current.bodyType;
          return {
            drafts: updateDraft(s.drafts, workspaceId, {
              method: m,
              bodyType,
            }),
          };
        }),
      setUrl: (workspaceId, u) =>
        set((s) => ({
          drafts: updateDraft(s.drafts, workspaceId, { url: u }),
        })),
      setBody: (workspaceId, b) =>
        set((s) => ({
          drafts: updateDraft(s.drafts, workspaceId, { body: b }),
        })),
      setBodyType: (workspaceId, t) =>
        set((s) => ({
          drafts: updateDraft(s.drafts, workspaceId, { bodyType: t }),
        })),
      setAuthType: (workspaceId, t) =>
        set((s) => ({
          drafts: updateDraft(s.drafts, workspaceId, { authType: t }),
        })),
      setAuthConfig: (workspaceId, patch) =>
        set((s) => {
          const current = s.drafts[workspaceId] ?? emptyDraft;
          return {
            drafts: updateDraft(s.drafts, workspaceId, {
              authConfig: { ...current.authConfig, ...patch },
            }),
          };
        }),
      setHeaders: (workspaceId, h) =>
        set((s) => ({
          drafts: updateDraft(s.drafts, workspaceId, { headers: h }),
        })),
      togglePopover: (workspaceId, key) =>
        set((s) => {
          const current = s.drafts[workspaceId] ?? emptyDraft;
          const next = current.openPopovers.includes(key)
            ? current.openPopovers.filter((k) => k !== key)
            : [...current.openPopovers, key];
          return {
            drafts: updateDraft(s.drafts, workspaceId, {
              openPopovers: next,
            }),
          };
        }),
      closePopover: (workspaceId, key) =>
        set((s) => {
          const current = s.drafts[workspaceId] ?? emptyDraft;
          return {
            drafts: updateDraft(s.drafts, workspaceId, {
              openPopovers: current.openPopovers.filter((k) => k !== key),
            }),
          };
        }),
      closeAllPopovers: (workspaceId) =>
        set((s) => ({
          drafts: updateDraft(s.drafts, workspaceId, { openPopovers: [] }),
        })),
      fillFrom: (workspaceId, snap) =>
        set((s) => {
          const current = s.drafts[workspaceId] ?? emptyDraft;
          const prev = snapshot(current);
          const next: DraftRecord = {
            ...current,
            ...snap,
            authConfig: snap.authConfig
              ? { ...snap.authConfig }
              : current.authConfig,
            headers: snap.headers
              ? { ...snap.headers }
              : current.headers,
            undoStack: [...current.undoStack, prev].slice(-10),
          };
          return { drafts: { ...s.drafts, [workspaceId]: next } };
        }),
      undoFill: (workspaceId) => {
        const current = get().drafts[workspaceId];
        if (!current) return false;
        const top = current.undoStack[current.undoStack.length - 1];
        if (!top) return false;
        set((s) => ({
          drafts: {
            ...s.drafts,
            [workspaceId]: {
              ...current,
              ...top,
              openPopovers: current.openPopovers,
              undoStack: current.undoStack.slice(0, -1),
            },
          },
        }));
        return true;
      },
      clearAll: (workspaceId) =>
        set((s) => ({
          drafts: { ...s.drafts, [workspaceId]: { ...emptyDraft } },
        })),
    }),
    {
      name: "justapi-v1-draft",
      version: 2,
      migrate: (persisted, version) => {
        if (version >= 2) return persisted as State;
        // v1 had a single flat draft. Move it under the Default workspace id.
        const p = persisted as Partial<DraftRecord> | undefined;
        if (!p) {
          return {
            drafts: { [DEFAULT_WORKSPACE_ID]: { ...emptyDraft } },
          } as unknown as State;
        }
        const single: DraftRecord = {
          ...emptyDraft,
          ...p,
          openPopovers: [],
          undoStack: [],
        };
        return {
          drafts: { [DEFAULT_WORKSPACE_ID]: single },
        } as unknown as State;
      },
    }
  )
);

/**
 * Backwards-compatible draft API. Components keep calling
 * `useDraftStore(s => s.field)` and `useDraftStore(s => s.action)`; this
 * wrapper scopes everything to the active workspace and caches bound
 * actions by workspace id so their identity stays stable per-workspace
 * (preventing useEffect/useMemo deps from invalidating each render).
 */

type CompatActions = {
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
};

export type CompatDraftState = DraftRecord & CompatActions;

const actionsCache = new Map<string, CompatActions>();

const actionsFor = (workspaceId: string): CompatActions => {
  let cached = actionsCache.get(workspaceId);
  if (cached) return cached;
  const s = useDraftStoreRaw.getState;
  cached = {
    setMethod: (m) => s().setMethod(workspaceId, m),
    setUrl: (u) => s().setUrl(workspaceId, u),
    setBody: (b) => s().setBody(workspaceId, b),
    setBodyType: (t) => s().setBodyType(workspaceId, t),
    setAuthType: (t) => s().setAuthType(workspaceId, t),
    setAuthConfig: (patch) => s().setAuthConfig(workspaceId, patch),
    setHeaders: (h) => s().setHeaders(workspaceId, h),
    togglePopover: (key) => s().togglePopover(workspaceId, key),
    closePopover: (key) => s().closePopover(workspaceId, key),
    closeAllPopovers: () => s().closeAllPopovers(workspaceId),
    fillFrom: (snap) => s().fillFrom(workspaceId, snap),
    undoFill: () => s().undoFill(workspaceId),
    clearAll: () => s().clearAll(workspaceId),
  };
  actionsCache.set(workspaceId, cached);
  return cached;
};

const compatSnapshot = (workspaceId: string): CompatDraftState => {
  const draft =
    useDraftStoreRaw.getState().drafts[workspaceId] ?? emptyDraft;
  return { ...draft, ...actionsFor(workspaceId) };
};

/**
 * `useDraftStore((s) => s.url)` and `useDraftStore((s) => s.setUrl)` style
 * usage — selector is run against a workspace-scoped snapshot.
 */
export function useDraftStore<T>(selector: (s: CompatDraftState) => T): T {
  const active = useWorkspaceStore((s) => s.activeWorkspaceId);
  return useDraftStoreRaw((raw) => {
    const draft = raw.drafts[active] ?? emptyDraft;
    const snap: CompatDraftState = { ...draft, ...actionsFor(active) };
    return selector(snap);
  });
}

/**
 * Static read for the active workspace, useful for non-React code
 * (send hook, keyboard hook, slash commands).
 */
useDraftStore.getState = (): CompatDraftState => {
  const active = useWorkspaceStore.getState().activeWorkspaceId;
  return compatSnapshot(active);
};
