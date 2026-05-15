import { create } from 'zustand';

export type SidebarSection = 'collections' | 'debug' | 'history';

interface UIState {
  sidebarSection: SidebarSection;
  sidebarOpen: boolean;
  setSidebarSection: (s: SidebarSection) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarSection: 'collections',
  sidebarOpen: false,
  setSidebarSection: (s) => set({ sidebarSection: s }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
