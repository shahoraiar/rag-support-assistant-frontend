import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  emailExists,
  getAllUsers,
  loadRegisteredUsers,
  saveRegisteredUsers,
} from '../data/userStore';
import type { User, UserRole } from '../types';

interface GoogleProfile {
  email: string;
  name: string;
  picture?: string;
}

interface RegisterResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string) => boolean;
  register: (name: string, email: string, password: string) => RegisterResult;
  loginWithGoogle: (profile: GoogleProfile) => void;
  logout: () => void;
  isRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function persistUser(user: User) {
  localStorage.setItem('supportai_user', JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('supportai_user');
    return saved ? JSON.parse(saved) : null;
  });

  const setAuthenticatedUser = (nextUser: User) => {
    setUser(nextUser);
    persistUser(nextUser);
  };

  const login = (email: string) => {
    const found = getAllUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setAuthenticatedUser(found);
      return true;
    }
    return false;
  };

  const register = (name: string, email: string, password: string): RegisterResult => {
    const normalizedEmail = email.trim().toLowerCase();

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const exists = emailExists(normalizedEmail);
    if (exists) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const newUser: User = {
      id: `u${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      role: 'customer',
    };

    const registered = loadRegisteredUsers();
    registered.push(newUser);
    saveRegisteredUsers(registered);
    setAuthenticatedUser(newUser);
    return { success: true };
  };

  const loginWithGoogle = (profile: GoogleProfile) => {
    const normalizedEmail = profile.email.toLowerCase();
    const existing = getAllUsers().find((u) => u.email.toLowerCase() === normalizedEmail);

    if (existing) {
      setAuthenticatedUser({
        ...existing,
        name: profile.name || existing.name,
        avatar: profile.picture || existing.avatar,
      });
      return;
    }

    const newUser: User = {
      id: `u${Date.now()}`,
      name: profile.name,
      email: normalizedEmail,
      role: 'customer',
      avatar: profile.picture,
    };

    const registered = loadRegisteredUsers();
    registered.push(newUser);
    saveRegisteredUsers(registered);
    setAuthenticatedUser(newUser);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('supportai_user');
  };

  const isRole = (role: UserRole) => user?.role === role;

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
