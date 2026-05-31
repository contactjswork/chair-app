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

export function redirectPathForRole(role: UserRole): string {
  if (role === 'hairdresser') return '/dashboard';
  return '/compte';
}
