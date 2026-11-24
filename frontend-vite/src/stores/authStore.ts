import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useLibraryStore } from './libraryStore';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarColor: string;
  pairCode: string;
  createdAt: number;
}

export type AuthModalTab = 'login' | 'register' | 'pair';

interface AuthState {
  user: UserProfile | null;
  isLoggedIn: boolean;
  token: string | null;
  loading: boolean;
  error: string | null;
  authModalOpen: boolean;
  authModalTab: AuthModalTab;
  openAuthModal: (tab?: AuthModalTab) => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, avatarColor: string) => Promise<boolean>;
  logout: () => Promise<void>;
  verifySession: () => Promise<boolean>;
  handleUnauthorized: () => void;
  generatePairCode: () => Promise<string | null>;
  linkPairCode: (code: string) => Promise<boolean>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearError: () => void;
}

const API_BASE = '/api/auth';

async function post(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Unable to connect to server' } };
  }
}

function mapUser(u: any): UserProfile {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatarColor: u.avatar_color || '{"from":"#ff5500","to":"#ff7a00"}',
    pairCode: u.pair_code || '',
    createdAt: u.created_at || Date.now(),
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      token: null,
      loading: false,
      error: null,
      authModalOpen: false,
      authModalTab: 'login',

      openAuthModal: (tab = 'login') =>
        set({ authModalOpen: true, authModalTab: tab, error: null }),

      closeAuthModal: () => set({ authModalOpen: false, error: null }),

      login: async (email, password) => {
        set({ loading: true, error: null });
        const { ok, data } = await post('/login', { email, password });
        set({ loading: false });
        if (!ok) {
          set({ error: data.error || 'Sign in failed' });
          return false;
        }
        const mapped = mapUser(data.user);
        set({ user: mapped, token: data.token, isLoggedIn: true, error: null });
        void useLibraryStore.getState().syncPlaylistsFromServer(data.token, mapped.id);
        return true;
      },

      register: async (name, email, password, avatarColor) => {
        set({ loading: true, error: null });
        const { ok, data } = await post('/register', {
          name,
          email,
          password,
          avatar_color: avatarColor,
        });
        set({ loading: false });
        if (!ok) {
          set({ error: data.error || 'Registration failed' });
          return false;
        }
        const mapped = mapUser(data.user);
        set({ user: mapped, token: data.token, isLoggedIn: true, error: null });
        void useLibraryStore.getState().syncPlaylistsFromServer(data.token, mapped.id);
        return true;
      },

      logout: async () => {
        const token = get().token;
        if (token) {
          await post('/logout', { token });
        }
        set({ user: null, isLoggedIn: false, token: null, error: null });
        await useLibraryStore.getState().resetForLogout();
      },

      verifySession: async () => {
        const token = get().token;
        if (!token) {
          if (get().isLoggedIn || get().user) {
            set({ user: null, isLoggedIn: false, token: null });
          }
          return false;
        }
        const { ok, status, data } = await post('/me', { token });
        if (ok && data?.user) {
          set({ user: mapUser(data.user), isLoggedIn: true });
          return true;
        }
        if (status === 401) {
          set({ user: null, token: null, isLoggedIn: false });
          return false;
        }
        // Network or 5xx error: keep current state offline-tolerant
        return true;
      },

      handleUnauthorized: () => {
        set({ user: null, token: null, isLoggedIn: false });
      },

      generatePairCode: async () => {
        const token = get().token;
        if (!token) return null;
        const { ok, status, data } = await post('/pair/generate', { token });
        if (status === 401) {
          get().handleUnauthorized();
          return null;
        }
        if (!ok || !data.pair_code) return null;
        if (get().user) {
          set({ user: { ...get().user!, pairCode: data.pair_code } });
        }
        return data.pair_code;
      },

      linkPairCode: async (code) => {
        set({ loading: true, error: null });
        const { ok, data } = await post('/pair/link', { code });
        set({ loading: false });
        if (!ok) {
          set({ error: data.error || 'Invalid pair code' });
          return false;
        }
        const mapped = mapUser(data.user);
        set({ user: mapped, token: data.token, isLoggedIn: true, error: null });
        void useLibraryStore.getState().syncPlaylistsFromServer(data.token, mapped.id);
        return true;
      },

      updateProfile: (updates) => {
        set(state => {
          if (!state.user) return state;
          return { user: { ...state.user, ...updates } };
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
      }),
    },
  ),
);
