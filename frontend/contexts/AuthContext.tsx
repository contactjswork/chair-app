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
import { useRouter, usePathname } from 'next/navigation';
import { initOneSignal, identifyOneSignalUser, clearOneSignalUser } from '@/lib/oneSignal';
import { captureReferralCode, getStoredReferralCode, clearStoredReferralCode } from '@/lib/referral';

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
  salon_id?: number;
  specialties?: number[];
  salon_name?: string;
  salon_city?: string;
  booking_url?: string;
  salon_instagram?: string;
  siret?: string;
  ref?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Bypass login temporaire (fin de dev / démo pré-lancement) ────────────
// Activé via NEXT_PUBLIC_AUTH_BYPASS=true. Remettre à false (ou retirer la
// variable) avant soumission App Store / Play Store pour restaurer le login
// normal — rien n'est supprimé, juste désactivé.
const AUTH_BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true';
const BYPASS_ACCOUNTS = {
  pro:    { email: 'test_new_coiffeur@test.com', password: 'chairdemo2026' },
  client: { email: 'client@gmail.com',           password: 'chairdemo2026' },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    initOneSignal();
    captureReferralCode();

    if (AUTH_BYPASS) return; // géré par l'effet dédié ci-dessous

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

  // ── Bypass login : reconnecte avec le bon compte démo selon la section
  // visitée (pro vs client), y compris quand on bascule de l'une à l'autre
  // sans rechargement complet de page.
  useEffect(() => {
    if (!AUTH_BYPASS) return;

    const token = getStoredToken();
    const storedUser = getStoredUser();
    const isPro = pathname.startsWith('/pro');
    const expectedRole = isPro ? 'hairdresser' : 'client';

    if (token && storedUser && storedUser.role === expectedRole) {
      setUser(storedUser);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const creds = isPro ? BYPASS_ACCOUNTS.pro : BYPASS_ACCOUNTS.client;
    api.post<AuthResponse>('/login', creds)
      .then((data) => {
        saveSession(data.token, data.user);
        setUser(data.user);
      })
      .catch(() => {
        // Backend injoignable — on garde la session existante si elle existe, sinon rien
        if (token && storedUser) setUser(storedUser);
      })
      .finally(() => setIsLoading(false));
  }, [pathname]);

  // Lie l'appareil (OneSignal) au coiffeur connecté, dès que l'utilisateur est connu.
  useEffect(() => {
    if (user) identifyOneSignalUser(user.id);
  }, [user?.id]);

  async function login(email: string, password: string): Promise<void> {
    const data = await api.post<AuthResponse>('/login', { email, password });
    saveSession(data.token, data.user);
    setUser(data.user);
    const pending = sessionStorage.getItem('chair_redirect');
    if (pending) {
      sessionStorage.removeItem('chair_redirect');
      router.push(pending);
    } else {
      router.push(redirectPathForRole(data.user.role));
    }
  }

  async function register(registerData: RegisterData): Promise<void> {
    const ref = registerData.ref ?? getStoredReferralCode();
    const data = await api.post<AuthResponse>('/register', { ...registerData, ref });
    clearStoredReferralCode();
    saveSession(data.token, data.user);
    setUser(data.user);
    const pending = sessionStorage.getItem('chair_redirect');
    if (pending) {
      sessionStorage.removeItem('chair_redirect');
      router.push(pending);
    } else {
      router.push(redirectPathForRole(data.user.role, true));
    }
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
    clearOneSignalUser();
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
