'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, SESSION_EXPIRED_EVENT } from '@/lib/api';
import {
  AuthUser,
  AuthResponse,
  saveSession,
  clearSession,
  getStoredToken,
  getStoredUser,
  redirectPathForRole,
  safeInternalPath,
  canRoleVisit,
} from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { captureReferralCode, getStoredReferralCode, clearStoredReferralCode } from '@/lib/referral';
import { unregister as unregisterPush, getStoredPushToken } from '@/lib/push';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, options?: AuthRedirectOptions) => Promise<void>;
  register: (data: RegisterData, options?: AuthRedirectOptions) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
  /** Bascule Mode Gérant / Mode Coiffeur — sans déconnexion, redirige vers l'accueil du nouveau mode. */
  switchProMode: (mode: 'salon_owner' | 'hairdresser') => Promise<void>;
  /** Double identité : un gérant sans profil coiffeur s'en crée un, rattaché à son salon. */
  enableHairdresserMode: () => Promise<void>;
  /** Double identité (sens inverse) : un coiffeur sans salon en crée un, redirige vers l'onboarding gérant. */
  enableSalonOwnerMode: (salonName: string) => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  region?: string;
  department?: string;
  address?: string;
  hairdresser_type?: string;
  salon_id?: number;
  specialties?: number[];
  salon_name?: string;
  salon_city?: string;
  salon_region?: string;
  salon_department?: string;
  salon_address?: string;
  booking_url?: string;
  salon_instagram?: string;
  siret?: string;
  ref?: string;
}

interface AuthRedirectOptions {
  /**
   * Chemin interne où revenir après l'auth (ex: fiche coiffeur d'où une
   * réservation a été interrompue). Prioritaire sur redirectPathForRole,
   * à condition que le rôle ait le droit d'aller à cette adresse (voir
   * canRoleVisit) : un client renvoyé vers une route /pro atterrissait sur
   * un refus de garde de rôle juste après s'être connecté. Passé au travers
   * de safeInternalPath — une URL absolue ou protocol-relative est ignorée.
   */
  returnTo?: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Le bypass de login de fin de développement (NEXT_PUBLIC_AUTH_BYPASS) a été
// retiré avant soumission App Store : il embarquait deux couples
// e-mail/mot de passe de comptes réels en clair dans le bundle JavaScript
// public, lisible par n'importe qui. Pour tester un compte sans passer par le
// formulaire, minter un jeton côté serveur (php artisan tinker) plutôt que de
// réintroduire des identifiants dans le code.

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    captureReferralCode();

    const token = getStoredToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
      setUser(storedUser);
      // Vérifie le token en arrière-plan. Un second setUser(freshUser)
      // inconditionnel changeait la référence de `user` à chaque montage,
      // ce qui refaisait tourner en double tout effet `useEffect(..., [user])`
      // en aval (ex: /pro/profil chargeait /profile + /specialties + /services
      // deux fois de suite) — d'où des 429 atteints anormalement vite. On ne
      // remplace la référence que si les données ont réellement changé.
      api.get<AuthUser>('/me')
        .then((freshUser) => {
          saveSession(token, freshUser);
          setUser((prev) => (prev && JSON.stringify(prev) === JSON.stringify(freshUser) ? prev : freshUser));
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

  // Session invalidée en cours d'usage (token révoqué / DB dev réinitialisée
  // sous le tapis) — lib/api.ts a déjà nettoyé le localStorage, ici on
  // nettoie l'état React et on redirige avec un message clair plutôt que de
  // laisser un "Unauthenticated." brut affiché sur la page en cours.
  // Le flag part en sessionStorage, pas juste en ?expired= : plusieurs pages
  // authentifiées ont leur propre garde `if (!user) router.replace('/connexion')`
  // qui se déclenche au même rendu que setUser(null) ci-dessous et gagne
  // parfois la course, écrasant l'URL — sessionStorage survit à ce remplacement.
  useEffect(() => {
    function onSessionExpired() {
      sessionStorage.setItem('chair_session_expired', '1');
      setUser(null);
      if (pathname.startsWith('/connexion') || pathname.startsWith('/inscription')) return;
      sessionStorage.setItem('chair_redirect', pathname);
      router.push('/connexion?expired=1');
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [pathname, router]);

  /**
   * Cible post-auth, par priorité :
   * 1. returnTo explicite (query ?returnTo= des pages connexion/inscription) ;
   * 2. chair_redirect en sessionStorage (session expirée, scan QR,
   *    invitation — mécanisme historique conservé) ;
   * 3. l'accueil du rôle (redirectPathForRole).
   * Les deux premiers passent par safeInternalPath (anti open-redirect) puis
   * par canRoleVisit (anti cul-de-sac sur garde de rôle).
   */
  function resolvePostAuthPath(freshUser: AuthUser, isNewUser: boolean, options?: AuthRedirectOptions): string {
    const returnTo = safeInternalPath(options?.returnTo);
    if (returnTo && canRoleVisit(freshUser.role, returnTo)) return returnTo;
    const pending = safeInternalPath(sessionStorage.getItem('chair_redirect'));
    sessionStorage.removeItem('chair_redirect');
    if (pending && canRoleVisit(freshUser.role, pending)) return pending;
    return redirectPathForRole(freshUser.role, isNewUser);
  }

  async function login(email: string, password: string, options?: AuthRedirectOptions): Promise<void> {
    const data = await api.post<AuthResponse>('/login', { email, password });
    saveSession(data.token, data.user);
    setUser(data.user);
    router.push(resolvePostAuthPath(data.user, false, options));
  }

  async function register(registerData: RegisterData, options?: AuthRedirectOptions): Promise<void> {
    const ref = registerData.ref ?? getStoredReferralCode();
    const data = await api.post<AuthResponse>('/register', { ...registerData, ref });
    clearStoredReferralCode();
    saveSession(data.token, data.user);
    setUser(data.user);
    router.push(resolvePostAuthPath(data.user, true, options));
  }

  async function switchProMode(mode: 'salon_owner' | 'hairdresser'): Promise<void> {
    const updated = await api.post<AuthUser>('/my-account/switch-pro-mode', { mode });
    const token = getStoredToken();
    if (token) saveSession(token, updated);
    setUser(updated);
    router.push(mode === 'salon_owner' ? '/pro/salon-owner' : '/pro');
  }

  async function enableHairdresserMode(): Promise<void> {
    const updated = await api.post<AuthUser>('/my-account/enable-hairdresser-mode', {});
    const token = getStoredToken();
    if (token) saveSession(token, updated);
    setUser(updated);
    // Le profil coiffeur qu'on vient de créer est nu (pas de photo/bio/
    // spécialités/services) — même onboarding qu'une inscription coiffeur
    // fraîche, pour ne pas laisser un profil vide derrière le mode switcher.
    router.push('/onboarding');
  }

  async function enableSalonOwnerMode(salonName: string): Promise<void> {
    const updated = await api.post<AuthUser>('/my-account/enable-salon-owner-mode', { salon_name: salonName });
    const token = getStoredToken();
    if (token) saveSession(token, updated);
    setUser(updated);
    // Même logique que enableHairdresserMode : le salon vient d'être créé nu
    // (juste un nom) — direction l'onboarding gérant pour le compléter (logo,
    // couverture, description, localisation), comme pour une inscription
    // gérant classique.
    router.push('/onboarding/gerant');
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
    // Désenregistre le token push de CET appareil AVANT /logout : l'appel
    // DELETE est authentifié, après la révocation du jeton API il prendrait
    // un 401. Best-effort et no-op hors natif — ne bloque jamais le logout.
    // Le token est lu AVANT unregisterPush() (qui purge le localStorage) pour
    // servir de filet de sécurité : /logout le détache aussi côté backend si
    // le DELETE a échoué (les deux chemins sont idempotents).
    const pushToken = getStoredPushToken();
    try {
      await unregisterPush();
    } catch {
      // L'appareil recevra d'éventuelles push jusqu'à expiration du token
      // APNs — acceptable, /logout ci-dessous retente le détachement.
    }
    try {
      await api.post('/logout', pushToken ? { push_token: pushToken } : {});
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
        switchProMode,
        enableHairdresserMode,
        enableSalonOwnerMode,
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
