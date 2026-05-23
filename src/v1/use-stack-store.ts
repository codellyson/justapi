import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Card, CardRequestSnapshot } from "./types";
import type { HttpResponse } from "../utils/http";
import { extractHost } from "./host";
import { DEFAULT_WORKSPACE_ID, useWorkspaceStore } from "./use-workspace-store";

const id = () =>
  `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

interface SpawnInput {
  workspaceId: string;
  request: CardRequestSnapshot;
  env: Card["env"];
  auth: Card["auth"];
  body: Card["body"];
}

interface StackState {
  /** All cards across all workspaces. Selectors filter by workspaceId. */
  cards: Card[];
  /** Per-workspace drawer state. null = drawer closed for that workspace. */
  displayedCardIdByWorkspace: Record<string, string | null>;

  spawn: (input: SpawnInput) => string;
  resolve: (cardId: string, response: HttpResponse) => void;
  fail: (cardId: string, error: string) => void;
  setDisplayed: (workspaceId: string, cardId: string | null) => void;
  closeDrawer: (workspaceId: string) => void;
  dismiss: (cardId: string) => void;
  restoreToStack: (cardId: string) => void;
  archiveAll: (workspaceId: string) => void;
  unarchive: (cardId: string) => void;
  remove: (cardId: string) => void;
  resetWorkspace: (workspaceId: string) => void;
}

export const useStackStore = create<StackState>()(
  persist(
    (set) => ({
      cards: [],
      displayedCardIdByWorkspace: {},
      spawn: (input) => {
        const cardId = id();
        const card: Card = {
          id: cardId,
          workspaceId: input.workspaceId,
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
          displayedCardIdByWorkspace: {
            ...s.displayedCardIdByWorkspace,
            [input.workspaceId]: cardId,
          },
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
      setDisplayed: (workspaceId, cardId) =>
        set((s) => ({
          displayedCardIdByWorkspace: {
            ...s.displayedCardIdByWorkspace,
            [workspaceId]: cardId,
          },
        })),
      closeDrawer: (workspaceId) =>
        set((s) => ({
          displayedCardIdByWorkspace: {
            ...s.displayedCardIdByWorkspace,
            [workspaceId]: null,
          },
        })),
      dismiss: (cardId) =>
        set((s) => {
          const target = s.cards.find((c) => c.id === cardId);
          const nextDisplayed = { ...s.displayedCardIdByWorkspace };
          if (
            target &&
            nextDisplayed[target.workspaceId] === cardId
          ) {
            nextDisplayed[target.workspaceId] = null;
          }
          return {
            cards: s.cards.map((c) =>
              c.id === cardId ? { ...c, inStack: false } : c
            ),
            displayedCardIdByWorkspace: nextDisplayed,
          };
        }),
      restoreToStack: (cardId) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId ? { ...c, inStack: true, archived: false } : c
          ),
        })),
      archiveAll: (workspaceId) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.workspaceId === workspaceId
              ? { ...c, archived: true, inStack: false }
              : c
          ),
          displayedCardIdByWorkspace: {
            ...s.displayedCardIdByWorkspace,
            [workspaceId]: null,
          },
        })),
      unarchive: (cardId) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId ? { ...c, archived: false } : c
          ),
        })),
      remove: (cardId) =>
        set((s) => {
          const target = s.cards.find((c) => c.id === cardId);
          const nextDisplayed = { ...s.displayedCardIdByWorkspace };
          if (
            target &&
            nextDisplayed[target.workspaceId] === cardId
          ) {
            nextDisplayed[target.workspaceId] = null;
          }
          return {
            cards: s.cards.filter((c) => c.id !== cardId),
            displayedCardIdByWorkspace: nextDisplayed,
          };
        }),
      resetWorkspace: (workspaceId) =>
        set((s) => ({
          cards: s.cards.filter((c) => c.workspaceId !== workspaceId),
          displayedCardIdByWorkspace: {
            ...s.displayedCardIdByWorkspace,
            [workspaceId]: null,
          },
        })),
    }),
    {
      name: "justapi-v1-stack",
      version: 4,
      migrate: (persisted, version) => {
        const p = persisted as
          | {
              cards?: Card[];
              displayedCardId?: string | null;
              displayedCardIdByWorkspace?: Record<string, string | null>;
            }
          | undefined;
        if (!p) return { cards: [], displayedCardIdByWorkspace: {} } as unknown as StackState;

        let cards = p.cards ?? [];
        if (version < 2) {
          cards = cards.map((c) => ({
            ...c,
            inStack: c.inStack ?? !c.archived,
          }));
        }
        if (version < 4) {
          // Tag legacy cards with the Default workspace.
          cards = cards.map((c) => ({
            ...c,
            workspaceId: c.workspaceId ?? DEFAULT_WORKSPACE_ID,
          }));
        }

        let displayedMap: Record<string, string | null>;
        if (version < 4) {
          displayedMap = {
            [DEFAULT_WORKSPACE_ID]: p.displayedCardId ?? null,
          };
        } else {
          displayedMap = p.displayedCardIdByWorkspace ?? {};
        }

        return {
          cards,
          displayedCardIdByWorkspace: displayedMap,
        } as unknown as StackState;
      },
    }
  )
);

/** Read helpers scoped to the active workspace. */
export const useActiveWorkspaceCards = (): Card[] => {
  const active = useWorkspaceStore((s) => s.activeWorkspaceId);
  return useStackStore((s) =>
    s.cards.filter((c) => c.workspaceId === active)
  );
};

export const useActiveDisplayedCardId = (): string | null => {
  const active = useWorkspaceStore((s) => s.activeWorkspaceId);
  return useStackStore((s) => s.displayedCardIdByWorkspace[active] ?? null);
};

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
