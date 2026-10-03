import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api } from '../lib/api';
import { User } from '../lib/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sadra_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadUser = useCallback(async () => {
    const currentToken = localStorage.getItem('sadra_token');
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.get<User>('/auth/me');
      setUser(res.data ?? null);
    } catch {
      localStorage.removeItem('sadra_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('sadra_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('sadra_token');
    setToken(null);
    setUser(null);
  };

  const refresh = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth باید داخل AuthProvider استفاده شود');
  return ctx;
}