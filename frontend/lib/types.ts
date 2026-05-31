// ── Types API — shape exacte des réponses Laravel ─────────────────

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  city: string | null;
  bio: string | null;
}

export interface ApiSpecialty {
  id: number;
  name: string;
  slug: string;
  category: string;
}

export interface ApiSalon {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  address: string | null;
}

export interface ApiReview {
  id: number;
  rating: number;
  comment: string;
  is_verified: boolean;
  specialty: string | null;
  created_at: string;
  client: ApiUser;
}

export interface ApiPostImage {
  id: number;
  url: string;
  type: 'before' | 'after' | 'result';
  order: number;
}

export interface ApiPost {
  id: number;
  type: 'before_after' | 'result' | 'technique';
  description: string;
  duration_minutes: number | null;
  price_indication: number | null;
  cover_image: string | null;
  likes_count: number;
  views_count: number;
  is_published: boolean;
  created_at: string;
  hairdresser?: ApiHairdresserProfile & { user: ApiUser };
  specialty: ApiSpecialty | null;
  images: ApiPostImage[];
}

export interface ApiHairdresserProfile {
  id: number;
  slug: string;
  banner_image: string | null;
  tagline: string | null;
  years_experience: number | null;
  city: string | null;
  postal_code: string | null;
  is_independent: boolean;
  is_verified: boolean;
  followers_count: number;
  posts_count: number;
  avg_rating: string;
  reviews_count: number;
  instagram_url: string | null;
  tiktok_url: string | null;
  booking_url: string | null;
  user: ApiUser;
  specialties: ApiSpecialty[];
  salon: ApiSalon | null;
  reviews?: ApiReview[];
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'declined' | 'completed' | 'cancelled';

export interface ApiAppointment {
  id: number;
  hairdresser_id: number;
  client_id: number | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  service: string;
  desired_date: string;
  desired_slot: string;
  message: string | null;
  status: AppointmentStatus;
  review_token: string | null;
  review_unlocked: boolean;
  created_at: string;
  client?: ApiUser | null;
}

export interface ApiStats {
  followers_count: number;
  posts_count: number;
  avg_rating: string;
  reviews_count: number;
  saved_count: number;
  appointments_pending: number;
  appointments_confirmed: number;
  appointments_completed: number;
  appointments_total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

// ── Helpers ────────────────────────────────────────────────────────

const BACKEND = 'http://localhost:8000';

/** Préfixe les URLs relatives (/storage/...) avec l'origine du backend. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/storage/')) return `${BACKEND}${url}`;
  return url;
}

export function getBeforeImage(post: ApiPost): string | null {
  return post.images.find((i) => i.type === 'before')?.url ?? null;
}

export function getAfterImage(post: ApiPost): string | null {
  return post.images.find((i) => i.type === 'after')?.url ?? post.cover_image;
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return 'il y a 1 jour';
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem.`;
  if (diffDays < 365) return `il y a ${Math.floor(diffDays / 30)} mois`;
  return `il y a ${Math.floor(diffDays / 365)} an(s)`;
}
