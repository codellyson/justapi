import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Environment } from '../utils/variables';

interface EnvironmentState {
  environments: Environment[];
  activeEnvironmentId: string | null;
  setEnvironments: (environments: Environment[]) => void;
  addEnvironment: (env: Omit<Environment, 'id'>) => void;
  updateEnvironment: (id: string, updates: Partial<Environment>) => void;
  deleteEnvironment: (id: string) => void;
  setActiveEnvironmentId: (id: string | null) => void;
  getActiveEnvironment: () => Environment | null;
  getVariables: () => Record<string, string>;
}

const STORAGE_KEY = 'justapi-environments';
const LEGACY_KEY = 'environment-storage';

// One-time key migration: carry persisted environments over from the old
// un-namespaced key so existing variables survive the rename.
if (typeof window !== 'undefined') {
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) localStorage.setItem(STORAGE_KEY, legacy);
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* private mode — fall back to defaults */
  }
}

// Fresh installs start with a single environment; the old Local/Dev/
// Staging/Prod placeholders are gone. Migrated users keep whatever they had.
const defaultEnvironments: Environment[] = [
  {
    id: 'local',
    name: 'Local',
    variables: {},
  },
];

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set, get) => ({
      environments: defaultEnvironments,
      activeEnvironmentId: 'local',
      setEnvironments: (environments) => set({ environments }),
      addEnvironment: (env) =>
        set((state) => ({
          environments: [
            ...state.environments,
            {
              ...env,
              id: Date.now().toString(),
            },
          ],
        })),
      updateEnvironment: (id, updates) =>
        set((state) => ({
          environments: state.environments.map((env) =>
            env.id === id ? { ...env, ...updates } : env
          ),
        })),
      deleteEnvironment: (id) =>
        set((state) => ({
          environments: state.environments.filter((env) => env.id !== id),
          activeEnvironmentId:
            state.activeEnvironmentId === id
              ? state.environments[0]?.id || null
              : state.activeEnvironmentId,
        })),
      setActiveEnvironmentId: (id) => set({ activeEnvironmentId: id }),
      getActiveEnvironment: () => {
        const state = get();
        return (
          state.environments.find(
            (env) => env.id === state.activeEnvironmentId
          ) || null
        );
      },
      getVariables: () => {
        const state = get();
        const env = state.environments.find(
          (env) => env.id === state.activeEnvironmentId
        );
        return env?.variables || {};
      },
    }),
    {
      name: STORAGE_KEY,
    }
  )
);

