'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  AuthUser,
  AuthResponse,
  saveSession,
  clearSession,
  getStoredToken,
  getStoredUser,
  redirectPathForRole,
} from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: string;
  city?: string;
  hairdresser_type?: string;
  salon_name?: string;
  salon_city?: string;
  booking_url?: string;
  salon_instagram?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
      setUser(storedUser);
      // Verify token is still valid in background
      api.get<AuthUser>('/me')
        .then((freshUser) => {
          setUser(freshUser);
          saveSession(token, freshUser);
        })
        .catch(() => {
          clearSession();
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const data = await api.post<AuthResponse>('/login', { email, password });
    saveSession(data.token, data.user);
    setUser(data.user);
    router.push(redirectPathForRole(data.user.role));
  }

  async function register(registerData: RegisterData): Promise<void> {
    const data = await api.post<AuthResponse>('/register', registerData);
    saveSession(data.token, data.user);
    setUser(data.user);
    router.push(redirectPathForRole(data.user.role, true));
  }

  function updateUser(updates: Partial<AuthUser>): void {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      const token = getStoredToken();
      if (token) saveSession(token, updated);
      return updated;
    });
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/logout', {});
    } catch {
      // Token may already be invalid — proceed with local cleanup
    }
    clearSession();
    setUser(null);
    router.push('/connexion');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
