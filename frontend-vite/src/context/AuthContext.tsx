import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface UserProfile {
  name: string;
  avatarColor: string;
  createdAt: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  login: (name: string, avatarColor: string) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const STORAGE_KEY = 'ytm_user_profile';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: UserProfile = JSON.parse(stored);
        setUser(parsed);
      }
    } catch {
      // Corrupted data – silently ignore
    }
  }, []);

  const login = (name: string, avatarColor: string): void => {
    const profile: UserProfile = {
      name,
      avatarColor,
      createdAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setUser(profile);
  };

  const logout = (): void => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const updateProfile = (updates: Partial<UserProfile>): void => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated: UserProfile = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
