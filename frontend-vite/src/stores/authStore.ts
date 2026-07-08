import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  name: string;
  avatarColor: string;
  createdAt: number;
}

interface AuthState {
  user: UserProfile | null;
  isLoggedIn: boolean;
  login: (name: string, avatarColor: string) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,

      login: (name, avatarColor) => {
        const user: UserProfile = {
          name,
          avatarColor,
          createdAt: Date.now(),
        };
        set({ user, isLoggedIn: true });
      },

      logout: () => {
        set({ user: null, isLoggedIn: false });
      },

      updateProfile: (updates) => {
        set(state => {
          if (!state.user) return state;
          return { user: { ...state.user, ...updates } };
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
