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

export function redirectPathForRole(role: UserRole, isNewUser = false): string {
  if (role === 'hairdresser') {
    return isNewUser ? '/onboarding' : '/pro';
  }
  if (role === 'salon_owner') {
    // L'accueil gérant vit désormais dans l'espace CHAIR BUSINESS.
    return isNewUser ? '/onboarding/gerant' : '/business';
  }
  return isNewUser ? '/app/onboarding' : '/app';
}

/**
 * Un `returnTo` n'est honoré que s'il mène quelque part où le rôle a
 * réellement le droit d'aller. Sans ce contrôle, un client authentifié
 * pouvait être renvoyé vers une route /pro protégée par un garde de rôle :
 * il atterrissait sur un écran de refus juste après s'être connecté, ce qui
 * est le cul-de-sac que la reprise de parcours est censée éviter.
 *
 * Les professionnels, eux, peuvent légitimement rejoindre une route /app
 * (un lien de réalisation partagé, par exemple) : on ne restreint que le
 * sens client → espace pro.
 */
export function canRoleVisit(role: UserRole, path: string): boolean {
  const isProPath = path === '/pro' || path.startsWith('/pro/') || path === '/onboarding' || path.startsWith('/onboarding/')
    // Espace gérant CHAIR BUSINESS — même monde professionnel que /pro.
    || path === '/business' || path.startsWith('/business/');
  if (isProPath) return role === 'hairdresser' || role === 'salon_owner';
  return true;
}
