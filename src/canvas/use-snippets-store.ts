"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CardRequestSnapshot } from "./types";

/** A reusable request template — bookmarked from a node, dropped onto any
 *  canvas. The global library that collections used to double as. */
export interface Snippet {
  id: string;
  name: string;
  createdAt: number;
  snapshot: CardRequestSnapshot;
}

const uid = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Deep-copy so later node edits never mutate the saved template. */
const copySnapshot = (s: CardRequestSnapshot): CardRequestSnapshot => ({
  ...s,
  headers: { ...s.headers },
  authConfig: { ...s.authConfig },
});

interface SnippetsState {
  snippets: Snippet[];
  /** True once the one-time migration from legacy collections has run. */
  migrated: boolean;
  saveSnippet: (name: string, snapshot: CardRequestSnapshot) => void;
  removeSnippet: (id: string) => void;
  renameSnippet: (id: string, name: string) => void;
  /** Seed from legacy saved requests, exactly once. */
  seedFromLegacy: (
    items: { name: string; snapshot: CardRequestSnapshot; createdAt: number }[]
  ) => void;
}

export const useSnippetsStore = create<SnippetsState>()(
  persist(
    (set) => ({
      snippets: [],
      migrated: false,
      saveSnippet: (name, snapshot) =>
        set((s) => ({
          snippets: [
            ...s.snippets,
            { id: uid(), name, createdAt: Date.now(), snapshot: copySnapshot(snapshot) },
          ],
        })),
      removeSnippet: (id) =>
        set((s) => ({ snippets: s.snippets.filter((x) => x.id !== id) })),
      renameSnippet: (id, name) =>
        set((s) => ({
          snippets: s.snippets.map((x) => (x.id === id ? { ...x, name } : x)),
        })),
      seedFromLegacy: (items) =>
        set((s) =>
          s.migrated
            ? {}
            : {
                snippets: [
                  ...s.snippets,
                  ...items.map((it) => ({
                    id: uid(),
                    name: it.name,
                    createdAt: it.createdAt,
                    snapshot: copySnapshot(it.snapshot),
                  })),
                ],
                migrated: true,
              }
        ),
    }),
    { name: "justapi-snippets", version: 1 }
  )
);
