import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  hue: number;
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  createWorkspace: (name?: string) => string;
  renameWorkspace: (id: string, name: string) => void;
  cycleWorkspaceColor: (id: string) => void;
  deleteWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string) => void;
}

const id = () =>
  `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const DEFAULT_ID = "w_default";

/** Curated, evenly-spaced hues that hold up in both light and dark modes. */
export const WORKSPACE_HUES = [210, 150, 275, 35, 345, 195, 20, 255];

export const accentForHue = (hue: number) => ({
  dot: `hsl(${hue} 70% 55%)`,
  soft: `hsl(${hue} 60% 55% / 0.12)`,
  border: `hsl(${hue} 65% 55% / 0.55)`,
  text: `hsl(${hue} 55% 50%)`,
});

const nextHue = (current: number): number => {
  const idx = WORKSPACE_HUES.indexOf(current);
  return WORKSPACE_HUES[(idx + 1) % WORKSPACE_HUES.length];
};

const defaultWorkspace: Workspace = {
  id: DEFAULT_ID,
  name: "Default",
  createdAt: 0,
  hue: WORKSPACE_HUES[0],
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [defaultWorkspace],
      activeWorkspaceId: DEFAULT_ID,
      createWorkspace: (name) => {
        const newId = id();
        const existingCount = get().workspaces.length;
        const ws: Workspace = {
          id: newId,
          name: name?.trim() || `Workspace ${existingCount + 1}`,
          createdAt: Date.now(),
          hue: WORKSPACE_HUES[existingCount % WORKSPACE_HUES.length],
        };
        set((s) => ({
          workspaces: [...s.workspaces, ws],
          activeWorkspaceId: newId,
        }));
        return newId;
      },
      renameWorkspace: (id, name) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === id ? { ...w, name } : w
          ),
        })),
      cycleWorkspaceColor: (id) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === id ? { ...w, hue: nextHue(w.hue) } : w
          ),
        })),
      deleteWorkspace: (id) =>
        set((s) => {
          if (s.workspaces.length <= 1) return s;
          const remaining = s.workspaces.filter((w) => w.id !== id);
          const newActive =
            s.activeWorkspaceId === id
              ? remaining[0]?.id ?? DEFAULT_ID
              : s.activeWorkspaceId;
          return {
            workspaces: remaining,
            activeWorkspaceId: newActive,
          };
        }),
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
    }),
    {
      name: "justapi-v1-workspaces",
      version: 2,
      migrate: (persisted, version) => {
        const p = persisted as
          | { workspaces?: Workspace[]; activeWorkspaceId?: string }
          | undefined;
        if (!p) {
          return {
            workspaces: [defaultWorkspace],
            activeWorkspaceId: DEFAULT_ID,
          } as unknown as WorkspaceState;
        }
        let workspaces = p.workspaces ?? [defaultWorkspace];
        if (version < 2) {
          workspaces = workspaces.map((w, i) => ({
            ...w,
            hue: w.hue ?? WORKSPACE_HUES[i % WORKSPACE_HUES.length],
          }));
        }
        return {
          workspaces,
          activeWorkspaceId: p.activeWorkspaceId ?? DEFAULT_ID,
        } as unknown as WorkspaceState;
      },
    }
  )
);

export const DEFAULT_WORKSPACE_ID = DEFAULT_ID;
