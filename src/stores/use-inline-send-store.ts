import { create } from 'zustand';
import type { HttpMethod, HttpResponse } from '../utils/http';

const key = (method: HttpMethod, url: string) => `${method} ${url}`;

interface InlineSendState {
  /** In-flight request descriptor; null when idle. */
  pending: { method: HttpMethod; url: string } | null;
  /** Current response (one at a time — palette is a single-shot surface). */
  current: { method: HttpMethod; url: string; response: HttpResponse } | null;
  /** Last known response per (method, url) for inline drift detection. */
  history: Record<string, HttpResponse>;
  error: string | null;

  setPending: (p: { method: HttpMethod; url: string } | null) => void;
  setError: (msg: string | null) => void;
  setCurrent: (method: HttpMethod, url: string, response: HttpResponse) => void;
  clear: () => void;
  getPrior: (method: HttpMethod, url: string) => HttpResponse | undefined;
}

export const useInlineSendStore = create<InlineSendState>((set, get) => ({
  pending: null,
  current: null,
  history: {},
  error: null,

  setPending: (p) => set({ pending: p, error: p ? null : get().error }),
  setError: (msg) => set({ error: msg, pending: null }),
  setCurrent: (method, url, response) =>
    set((state) => ({
      pending: null,
      error: null,
      current: { method, url, response },
      history: { ...state.history, [key(method, url)]: response },
    })),
  clear: () => set({ pending: null, current: null, error: null }),
  getPrior: (method, url) => get().history[key(method, url)],
}));
