export type UserRole = 'client' | 'hairdresser' | 'salon_owner' | 'admin';

export interface HairdresserProfile {
  id: number;
  slug: string;
  tagline: string | null;
  followers_count: number;
  posts_count: number;
  avg_rating: string;
  reviews_count: number;
  is_verified: boolean;
  is_independent: boolean;
  city: string | null;
  salon_id: number | null;
  verified_visits_count: number;
  salon?: { id: number; name: string; slug: string } | null;
}

export interface AuthSalon {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  logo: string | null;
  is_verified: boolean;
  siret: string | null;
  verification_status: 'unverified' | 'pending_review' | 'verified' | 'rejected';
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  city: string | null;
  avatar: string | null;
  bio: string | null;
  hairdresser_profile?: HairdresserProfile | null;
  salon?: AuthSalon | null;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

const TOKEN_KEY = 'chair_token';
const USER_KEY = 'chair_user';

export function saveSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

// Fin de dev / démo pré-lancement : onboarding coiffeur désactivé temporairement
// (voir AuthContext.tsx — même variable). L'onboarding client (/app/onboarding) reste actif.
const SKIP_PRO_ONBOARDING = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true';

export function redirectPathForRole(role: UserRole, isNewUser = false): string {
  if (role === 'hairdresser') {
    if (isNewUser && SKIP_PRO_ONBOARDING) return '/pro';
    return isNewUser ? '/onboarding' : '/pro';
  }
  if (role === 'salon_owner') return isNewUser ? '/pro/salon' : '/pro/salon-owner';
  return isNewUser ? '/app/onboarding' : '/app';
}
