import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarColor: string;
  pairCode: string;
  createdAt: number;
}

interface AuthState {
  user: UserProfile | null;
  isLoggedIn: boolean;
  login: (name: string, avatarColor: string, email?: string) => void;
  register: (name: string, email: string, avatarColor: string) => void;
  logout: () => void;
  generatePairCode: () => string;
  linkPairCode: (code: string) => boolean;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

function createRandomPairCode(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `KV-${num}`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,

      login: (name, avatarColor, email) => {
        const existing = get().user;
        const pairCode = existing?.pairCode || createRandomPairCode();
        const user: UserProfile = {
          id: existing?.id || `user_${Date.now()}`,
          name,
          email: email || `${name.toLowerCase().replace(/\s+/g, '')}@kvmusic.com`,
          avatarColor,
          pairCode,
          createdAt: existing?.createdAt || Date.now(),
        };
        localStorage.setItem(`pair_account_${pairCode}`, JSON.stringify(user));
        set({ user, isLoggedIn: true });
      },

      register: (name, email, avatarColor) => {
        const pairCode = createRandomPairCode();
        const user: UserProfile = {
          id: `user_${Date.now()}`,
          name,
          email,
          avatarColor,
          pairCode,
          createdAt: Date.now(),
        };
        localStorage.setItem(`pair_account_${pairCode}`, JSON.stringify(user));
        set({ user, isLoggedIn: true });
      },

      logout: () => {
        set({ user: null, isLoggedIn: false });
      },

      generatePairCode: () => {
        const code = createRandomPairCode();
        set(state => {
          if (!state.user) return state;
          const updated = { ...state.user, pairCode: code };
          localStorage.setItem(`pair_account_${code}`, JSON.stringify(updated));
          return { user: updated };
        });
        return code;
      },

      linkPairCode: (code: string) => {
        const formattedCode = code.trim().toUpperCase();
        const saved = localStorage.getItem(`pair_account_${formattedCode}`);
        if (saved) {
          try {
            const user: UserProfile = JSON.parse(saved);
            set({ user, isLoggedIn: true });
            return true;
          } catch (e) {
            return false;
          }
        }
        // Fallback: create linked profile for code
        const user: UserProfile = {
          id: `paired_${formattedCode}`,
          name: `Thiết bị (${formattedCode})`,
          email: `device_${formattedCode.toLowerCase()}@kvmusic.com`,
          avatarColor: JSON.stringify({ from: '#00a8ff', to: '#2e86de' }),
          pairCode: formattedCode,
          createdAt: Date.now()
        };
        localStorage.setItem(`pair_account_${formattedCode}`, JSON.stringify(user));
        set({ user, isLoggedIn: true });
        return true;
      },

      updateProfile: (updates) => {
        set(state => {
          if (!state.user) return state;
          const updated = { ...state.user, ...updates };
          if (updated.pairCode) {
            localStorage.setItem(`pair_account_${updated.pairCode}`, JSON.stringify(updated));
          }
          return { user: updated };
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
