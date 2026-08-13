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
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, avatarColor: string) => Promise<boolean>;
  logout: () => Promise<void>;
  generatePairCode: () => Promise<string | null>;
  linkPairCode: (code: string) => Promise<boolean>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearError: () => void;
}

const API_BASE = '/api/auth';

async function post(path: string, body: unknown): Promise<{ ok: boolean; data: any }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false, data: { error: 'Không thể kết nối máy chủ' } };
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

      login: async (email, password) => {
        set({ loading: true, error: null });
        const { ok, data } = await post('/login', { email, password });
        set({ loading: false });
        if (!ok) {
          set({ error: data.error || 'Đăng nhập thất bại' });
          return false;
        }
        set({ user: mapUser(data.user), token: data.token, isLoggedIn: true, error: null });
        return true;
      },

      register: async (name, email, password, avatarColor) => {
        set({ loading: true, error: null });
        const { ok, data } = await post('/register', { name, email, password, avatar_color: avatarColor });
        set({ loading: false });
        if (!ok) {
          set({ error: data.error || 'Đăng ký thất bại' });
          return false;
        }
        set({ user: mapUser(data.user), token: data.token, isLoggedIn: true, error: null });
        return true;
      },

      logout: async () => {
        const token = get().token;
        if (token) {
          await post('/logout', { token });
        }
        set({ user: null, isLoggedIn: false, token: null, error: null });
      },

      generatePairCode: async () => {
        const token = get().token;
        if (!token) return null;
        const { ok, data } = await post('/pair/generate', { token });
        if (!ok || !data.pair_code) return null;
        if (get().user) {
          set({ user: { ...get().user!, pairCode: data.pair_code } });
        }
        return data.pair_code;
      },

      linkPairCode: async (code) => {
        set({ error: null });
        const { ok, data } = await post('/pair/link', { code });
        if (!ok) {
          set({ error: data.error || 'Mã Pair Code không hợp lệ' });
          return false;
        }
        set({ user: mapUser(data.user), token: data.token, isLoggedIn: true, error: null });
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
      partialize: (state) => ({ user: state.user, token: state.token, isLoggedIn: state.isLoggedIn }),
    }
  )
);
