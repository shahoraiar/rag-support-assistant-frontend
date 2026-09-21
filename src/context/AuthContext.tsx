import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  clearTokens,
  fetchCurrentUser,
  googleLoginApi,
  hasAccessToken,
  loginApi,
  mapApiUser,
  registerApi,
  setAgentAvailability,
} from '../lib/api';
import type { User, UserRole } from '../types';

interface RegisterResult {
  success: boolean;
  error?: string;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<User | null>;
  register: (name: string, email: string, password: string) => Promise<RegisterResult>;
  loginWithGoogle: (credential: string) => Promise<RegisterResult>;
  logout: () => void;
  isRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function persistUser(user: User) {
  localStorage.setItem('supportai_user', JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setAuthenticatedUser = (nextUser: User) => {
    setUser(nextUser);
    persistUser(nextUser);
  };

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!hasAccessToken()) {
        localStorage.removeItem('supportai_user');
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const me = await fetchCurrentUser();
        if (!cancelled) setAuthenticatedUser(me);
      } catch {
        clearTokens();
        localStorage.removeItem('supportai_user');
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password = 'demo1234') => {
    try {
      const data = await loginApi(email, password);
      const nextUser = mapApiUser(data.user);
      setAuthenticatedUser(nextUser);
      return nextUser;
    } catch {
      return null;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<RegisterResult> => {
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    try {
      const data = await registerApi({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'customer',
      });
      const nextUser = mapApiUser(data.user);
      setAuthenticatedUser(nextUser);
      return { success: true, user: nextUser };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Registration failed. Please try again.',
      };
    }
  };

  const loginWithGoogle = async (credential: string): Promise<RegisterResult> => {
    try {
      const data = await googleLoginApi(credential);
      const nextUser = mapApiUser(data.user);
      setAuthenticatedUser(nextUser);
      return { success: true, user: nextUser };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Google sign-in failed. Please try again.',
      };
    }
  };

  const logout = () => {
    const role = user?.role;
    // Mark agent offline before dropping the token (best-effort)
    if (role === 'agent' && hasAccessToken()) {
      void setAgentAvailability(false).catch(() => undefined);
    }
    setUser(null);
    localStorage.removeItem('supportai_user');
    clearTokens();
  };

  const isRole = (role: UserRole) => user?.role === role;

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
