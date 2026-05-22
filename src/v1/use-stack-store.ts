import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Card, CardRequestSnapshot } from "./types";
import type { HttpResponse } from "../utils/http";
import { extractHost } from "./host";

const id = () =>
  `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

interface SpawnInput {
  request: CardRequestSnapshot;
  env: Card["env"];
  auth: Card["auth"];
  body: Card["body"];
}

interface StackState {
  cards: Card[];
  /** Which card the drawer is currently displaying. null = drawer closed.
   *  Closing the drawer does NOT remove the card from the stack — it stays
   *  visible in the peek rail. */
  displayedCardId: string | null;
  spawn: (input: SpawnInput) => string;
  resolve: (cardId: string, response: HttpResponse) => void;
  fail: (cardId: string, error: string) => void;
  /** Open the drawer on the given card (must already be in stack). */
  setDisplayed: (cardId: string | null) => void;
  /** Close the drawer without touching the stack. */
  closeDrawer: () => void;
  /** Remove a card from the visible rail (palette still sees it). */
  dismiss: (cardId: string) => void;
  /** Push a card back onto the visible stack (e.g. when picked from palette). */
  restoreToStack: (cardId: string) => void;
  archiveAll: () => void;
  unarchive: (cardId: string) => void;
  remove: (cardId: string) => void;
  reset: () => void;
}

export const useStackStore = create<StackState>()(
  persist(
    (set) => ({
      cards: [],
      displayedCardId: null,
      spawn: (input) => {
        const cardId = id();
        const card: Card = {
          id: cardId,
          createdAt: Date.now(),
          method: input.request.method,
          url: input.request.url,
          urlRaw: input.request.urlRaw,
          host: extractHost(input.request.url),
          env: input.env,
          auth: input.auth,
          body: input.body,
          request: input.request,
          response: null,
          pending: true,
          error: null,
          archived: false,
          inStack: true,
        };
        set((s) => ({
          cards: [card, ...s.cards],
          displayedCardId: cardId,
        }));
        return cardId;
      },
      resolve: (cardId, response) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId
              ? { ...c, response, pending: false, error: null }
              : c
          ),
        })),
      fail: (cardId, error) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId ? { ...c, pending: false, error } : c
          ),
        })),
      setDisplayed: (cardId) => set({ displayedCardId: cardId }),
      closeDrawer: () => set({ displayedCardId: null }),
      dismiss: (cardId) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId ? { ...c, inStack: false } : c
          ),
          displayedCardId:
            s.displayedCardId === cardId ? null : s.displayedCardId,
        })),
      restoreToStack: (cardId) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId ? { ...c, inStack: true, archived: false } : c
          ),
        })),
      archiveAll: () =>
        set((s) => ({
          cards: s.cards.map((c) => ({
            ...c,
            archived: true,
            inStack: false,
          })),
          displayedCardId: null,
        })),
      unarchive: (cardId) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId ? { ...c, archived: false } : c
          ),
        })),
      remove: (cardId) =>
        set((s) => ({
          cards: s.cards.filter((c) => c.id !== cardId),
          displayedCardId:
            s.displayedCardId === cardId ? null : s.displayedCardId,
        })),
      reset: () => set({ cards: [], displayedCardId: null }),
    }),
    {
      name: "justapi-v1-stack",
      version: 3,
      migrate: (persisted, version) => {
        const p = persisted as
          | { cards?: Card[]; displayedCardId?: string | null }
          | undefined;
        if (!p) return p as unknown as StackState;
        let cards = p.cards;
        if (version < 2 && cards) {
          cards = cards.map((c) => ({
            ...c,
            inStack: c.inStack ?? !c.archived,
          }));
        }
        return {
          ...p,
          cards: cards ?? [],
          displayedCardId: p.displayedCardId ?? null,
        } as StackState;
      },
    }
  )
);

export const findPriorSameUrl = (
  cards: Card[],
  index: number
): Card | null => {
  const me = cards[index];
  if (!me) return null;
  for (let i = index + 1; i < cards.length; i++) {
    const c = cards[i];
    if (c.archived) continue;
    if (c.method === me.method && c.url === me.url && c.response) {
      return c;
    }
  }
  return null;
};
