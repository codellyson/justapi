import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HttpMethod } from '../utils/http';
import { KeyValuePair } from '../components/ui/key-value-editor';

export interface CollectionItem {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  bodyType: 'json' | 'form-data' | 'raw' | 'none';
  body: string;
  authType: 'none' | 'bearer' | 'basic' | 'api-key';
  authConfig: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

interface CollectionsState {
  items: CollectionItem[];
  activeCollectionId: string | null;
  examplesSeeded: boolean;
  addItem: (item: Omit<CollectionItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateItem: (id: string, updates: Partial<CollectionItem>) => void;
  deleteItem: (id: string) => void;
  setActiveCollectionId: (id: string | null) => void;
  clearAll: () => void;
  seedExamples: (
    items: Omit<CollectionItem, 'id' | 'createdAt' | 'updatedAt'>[]
  ) => void;
}

export const useCollectionsStore = create<CollectionsState>()(
  persist(
    (set, get) => ({
      items: [],
      activeCollectionId: null,
      examplesSeeded: false,
      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              ...item,
              id: Date.now().toString(),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        })),
      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: Date.now() }
              : item
          ),
        })),
      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      setActiveCollectionId: (id) => set({ activeCollectionId: id }),
      clearAll: () => set({ items: [], activeCollectionId: null }),
      seedExamples: (items) => {
        const state = get();
        if (state.examplesSeeded || state.items.length > 0) {
          if (!state.examplesSeeded) set({ examplesSeeded: true });
          return;
        }
        const now = Date.now();
        const seeded: CollectionItem[] = items.map((item, i) => ({
          ...item,
          id: `seed-${now}-${i}`,
          createdAt: now + i,
          updatedAt: now + i,
        }));
        set({ items: seeded, examplesSeeded: true });
      },
    }),
    {
      name: 'collections-storage',
    }
  )
);
