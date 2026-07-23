"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CardRequestSnapshot } from "./types";

export interface SavedRequest {
  id: string;
  name: string;
  createdAt: number;
  snapshot: CardRequestSnapshot;
}

export interface Collection {
  id: string;
  name: string;
  createdAt: number;
  open: boolean;
  requests: SavedRequest[];
}

const uid = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

interface CollectionsState {
  collections: Collection[];
  createCollection: (name: string) => string;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;
  toggleCollection: (id: string) => void;
  saveRequest: (
    collectionId: string,
    name: string,
    snapshot: CardRequestSnapshot
  ) => void;
  removeRequest: (collectionId: string, requestId: string) => void;
}

export const useCollectionsStore = create<CollectionsState>()(
  persist(
    (set) => ({
      collections: [],
      createCollection: (name) => {
        const id = uid();
        set((s) => ({
          collections: [
            ...s.collections,
            { id, name, createdAt: Date.now(), open: true, requests: [] },
          ],
        }));
        return id;
      },
      renameCollection: (id, name) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, name } : c
          ),
        })),
      deleteCollection: (id) =>
        set((s) => ({
          collections: s.collections.filter((c) => c.id !== id),
        })),
      toggleCollection: (id) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, open: !c.open } : c
          ),
        })),
      saveRequest: (collectionId, name, snapshot) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  open: true,
                  requests: [
                    ...c.requests,
                    {
                      id: uid(),
                      name,
                      createdAt: Date.now(),
                      // Deep-copy so later node edits don't mutate the
                      // saved version.
                      snapshot: {
                        ...snapshot,
                        headers: { ...snapshot.headers },
                        authConfig: { ...snapshot.authConfig },
                      },
                    },
                  ],
                }
              : c
          ),
        })),
      removeRequest: (collectionId, requestId) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  requests: c.requests.filter((r) => r.id !== requestId),
                }
              : c
          ),
        })),
    }),
    { name: "justapi-canvas-collections", version: 1 }
  )
);
