import { create } from 'zustand';
import type { CapturedRequest, DebuggerTab } from '../utils/extension-bridge';

export type DebuggerStatus =
  | 'unknown'       // haven't checked for extension yet
  | 'no-extension'  // extension not installed / not reachable
  | 'idle'          // extension connected, no tab attached
  | 'attached';     // capturing from a tab

interface DebuggerState {
  status: DebuggerStatus;
  attachedTabId: number | null;
  attachedTabTitle: string;
  tabs: DebuggerTab[];
  captures: CapturedRequest[];
  selectedRequestId: string | null;
  lastError: string | null;
  paused: boolean;
  /** The captured request currently loaded into Explorer for replay, if any. */
  replayOriginal: CapturedRequest | null;

  setStatus: (s: DebuggerStatus) => void;
  setTabs: (tabs: DebuggerTab[]) => void;
  setAttached: (tabId: number | null, title: string) => void;
  setSelected: (requestId: string | null) => void;
  setError: (msg: string | null) => void;
  setPaused: (paused: boolean) => void;
  setReplayOriginal: (entry: CapturedRequest | null) => void;

  resetCaptures: () => void;
  applyState: (payload: {
    attachedTabId: number | null;
    attachedTabTitle: string;
    paused?: boolean;
    captures: CapturedRequest[];
  }) => void;
  addCapture: (entry: CapturedRequest) => void;
  updateCapture: (entry: CapturedRequest) => void;
  evictCaptures: (requestIds: string[]) => void;
}

export const useDebuggerStore = create<DebuggerState>((set) => ({
  status: 'unknown',
  attachedTabId: null,
  attachedTabTitle: '',
  tabs: [],
  captures: [],
  selectedRequestId: null,
  lastError: null,
  paused: false,
  replayOriginal: null,

  setStatus: (s) => set({ status: s }),
  setTabs: (tabs) => set({ tabs }),
  setAttached: (tabId, title) =>
    set({
      attachedTabId: tabId,
      attachedTabTitle: title,
      status: tabId === null ? 'idle' : 'attached',
    }),
  setSelected: (requestId) => set({ selectedRequestId: requestId }),
  setError: (msg) => set({ lastError: msg }),
  setPaused: (paused) => set({ paused }),
  setReplayOriginal: (entry) => set({ replayOriginal: entry }),

  resetCaptures: () => set({ captures: [], selectedRequestId: null, replayOriginal: null }),

  applyState: ({ attachedTabId, attachedTabTitle, paused, captures }) =>
    set({
      attachedTabId,
      attachedTabTitle,
      captures,
      paused: !!paused,
      status: attachedTabId === null ? 'idle' : 'attached',
    }),

  addCapture: (entry) =>
    set((state) => ({ captures: [...state.captures, entry] })),

  updateCapture: (entry) =>
    set((state) => {
      const idx = state.captures.findIndex((c) => c.requestId === entry.requestId);
      if (idx === -1) return { captures: [...state.captures, entry] };
      const next = state.captures.slice();
      next[idx] = entry;
      return { captures: next };
    }),

  evictCaptures: (requestIds) =>
    set((state) => {
      const drop = new Set(requestIds);
      return {
        captures: state.captures.filter((c) => !drop.has(c.requestId)),
        selectedRequestId:
          state.selectedRequestId && drop.has(state.selectedRequestId)
            ? null
            : state.selectedRequestId,
      };
    }),
}));
