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
  siret_verification_status?: 'none' | 'pending' | 'verified' | 'rejected';
  salon?: { id: number; name: string; slug: string } | null;
  /** Entitlement fusionné réel — voir HairdresserProfile::getIsChairPlusAttribute() côté backend. */
  is_chair_plus?: boolean;
  chair_plus_until?: string | null;
  /** "Pourquoi as-tu installé CHAIR PRO ?" — collecté en fin d'onboarding indépendant, sert à mettre en avant les bons items de nav (voir useProNav.ts). */
  pro_goals?: string[] | null;
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
  latitude?: number | null;
  longitude?: number | null;
  avatar: string | null;
  bio: string | null;
  hairdresser_profile?: HairdresserProfile | null;
  salon?: AuthSalon | null;
  /** Double identité gérant/coiffeur — voir AuthController::withEntitlement(). */
  can_manage_salon?: boolean;
  has_hairdresser_profile?: boolean;
  active_pro_mode?: 'salon_owner' | 'hairdresser' | null;
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

/**
 * Anti open-redirect : ne laisse passer que des chemins internes relatifs.
 * Accepte "/app/coiffeur/jean" ; rejette "https://evil.com", "//evil.com",
 * "/\evil.com" (les navigateurs normalisent \ en /) et tout ce qui ne
 * commence pas par un unique "/". Retourne null si le chemin est refusé.
 */
export function safeInternalPath(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith('/')) return null;
  const second = path.charAt(1);
  if (second === '/' || second === '\\') return null;
  return path;
}

// Fin de dev / démo pré-lancement : onboarding coiffeur désactivé temporairement
// (voir AuthContext.tsx — même variable). L'onboarding client (/app/onboarding) reste actif.
const SKIP_PRO_ONBOARDING = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true';

export function redirectPathForRole(role: UserRole, isNewUser = false): string {
  if (role === 'hairdresser') {
    if (isNewUser && SKIP_PRO_ONBOARDING) return '/pro';
    return isNewUser ? '/onboarding' : '/pro';
  }
  if (role === 'salon_owner') {
    if (isNewUser && SKIP_PRO_ONBOARDING) return '/pro/salon-owner';
    return isNewUser ? '/onboarding/gerant' : '/pro/salon-owner';
  }
  return isNewUser ? '/app/onboarding' : '/app';
}
