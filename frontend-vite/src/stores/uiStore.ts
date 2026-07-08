import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'spotify' | 'apple';

interface UIState {
  isSidebarOpen: boolean;
  isNowPlayingOpen: boolean;
  isPlayerExpanded: boolean;
  theme: Theme;
  toggleSidebar: () => void;
  toggleNowPlaying: () => void;
  closeSidebar: () => void;
  expandPlayer: () => void;
  collapsePlayer: () => void;
  togglePlayer: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidebarOpen: false,
      isNowPlayingOpen: true,
      isPlayerExpanded: false,
      theme: 'spotify' as Theme,

      toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
      toggleNowPlaying: () => set(state => ({ isNowPlayingOpen: !state.isNowPlayingOpen })),
      closeSidebar: () => set({ isSidebarOpen: false }),
      expandPlayer: () => set({ isPlayerExpanded: true }),
      collapsePlayer: () => set({ isPlayerExpanded: false }),
      togglePlayer: () => set(state => ({ isPlayerExpanded: !state.isPlayerExpanded })),

      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },

      toggleTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);
