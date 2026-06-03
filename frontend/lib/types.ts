// ── Types API — shape exacte des réponses Laravel ─────────────────

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  city: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
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
  /** 'homme' | 'femme' | null (unisexe) — champ propre à la réalisation */
  gender: 'homme' | 'femme' | null;
  duration_minutes: number | null;
  price_indication: number | null;
  cover_image: string | null;
  likes_count: number;
  views_count: number;
  is_published: boolean;
  liked_by_user?: boolean;
  saved_by_user?: boolean;
  /** Tags multi-spécialités de la réalisation (post_tags pivot) */
  tags?: ApiSpecialty[];
  created_at: string;
  hairdresser?: ApiHairdresserProfile & { user: ApiUser };
  /** Spécialité primaire/display — conservée pour compatibilité */
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
  latitude: number | string | null;
  longitude: number | string | null;
  distance_km?: number;
  is_independent: boolean;
  is_verified: boolean;
  followers_count: number;
  posts_count: number;
  avg_rating: string;
  reviews_count: number;
  visits_count: number;
  instagram_url: string | null;
  tiktok_url: string | null;
  booking_url: string | null;
  keywords: string | null;
  work_status: 'home' | 'private_salon' | 'rented_chair' | 'studio' | null;
  work_address: string | null;
  user: ApiUser;
  specialties: ApiSpecialty[];
  salon: ApiSalon | null;
  reviews?: ApiReview[];
}

export type AppointmentStatus =
  | 'pending'
  | 'pending_payment'
  | 'confirmed'
  | 'declined'
  | 'completed'
  | 'cancelled'
  | 'no_show';

// ── Booking system ─────────────────────────────────────────────────

export interface ApiServiceCategory {
  id: number;
  hairdresser_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  visits_count: number;
  services?: ApiService[];
  all_services?: ApiService[];
}

export interface ApiService {
  id: number;
  hairdresser_id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: string | null;
  duration_minutes: number | null;
  is_active: boolean;
  visits_count: number;
  image_url: string | null;
  category?: ApiServiceCategory;
}

export interface ApiScheduleDay {
  id?: number;
  hairdresser_id?: number;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  break_start: string | null;
  break_end: string | null;
  is_open: boolean;
}

export interface ApiUnavailability {
  id: number;
  hairdresser_id: number;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
}

export interface ApiAppointment {
  id: number;
  hairdresser_id: number;
  client_id: number | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  service: string;
  service_id: number | null;
  desired_date: string | null;
  desired_slot: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  duration_minutes: number | null;
  price: string | null;
  payment_method: 'on_site' | 'deposit' | 'full' | null;
  message: string | null;
  status: AppointmentStatus;
  review_token: string | null;
  review_unlocked: boolean;
  created_at: string;
  client?: ApiUser | null;
  service_model?: ApiService | null;
  review?: { id: number; rating: number; comment: string | null; is_verified: boolean } | null;
  hairdresser?: {
    id: number;
    slug: string;
    city: string | null;
    avg_rating: string;
    user: { name: string; avatar: string | null };
  } | null;
}

export type NotificationType =
  | 'appointment_created'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'review_request'
  | 'review_received'
  | 'new_follower'
  | 'system';

export interface ApiNotification {
  id: number;
  user_id: number;
  type: NotificationType | string;
  title: string | null;
  message: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface ApiNotificationsResponse {
  notifications: ApiNotification[];
  unread_count: number;
}

/** Extrait "YYYY-MM-DD" depuis un champ date potentiellement ISO ("2026-06-03T00:00:00.000000Z") */
export function apptDateStr(appt: ApiAppointment): string {
  return (appt.appointment_date || appt.desired_date || '').slice(0, 10);
}

/** Formate la date d'un RDV en français */
export function formatApptDate(appt: ApiAppointment, opts?: Intl.DateTimeFormatOptions): string {
  const str = apptDateStr(appt);
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', opts ?? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export interface ApiStats {
  followers_count: number;
  posts_count: number;
  avg_rating: string;
  reviews_count: number;
  review_breakdown?: Record<number, number>; // { 1: X, 2: X, 3: X, 4: X, 5: X }
  visits_count: number;
  saved_count: number;
  appointments_pending: number;
  appointments_confirmed: number;
  appointments_completed: number;
  appointments_total: number;
  appointments_this_month: number;
  revenue_estimate: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

// ── Helpers ────────────────────────────────────────────────────────

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api$/, '');

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
  return (
    post.images.find((i) => i.type === 'after' || i.type === 'result')?.url ??
    post.cover_image
  );
}

/** Retourne toutes les URLs brutes d'un post (triées par order), pour le carrousel. */
export function getAllImagesRaw(post: ApiPost): string[] {
  if (post.images.length > 0) {
    return [...post.images]
      .sort((a, b) => a.order - b.order)
      .map((i) => i.url);
  }
  return post.cover_image ? [post.cover_image] : [];
}

// ── Search ─────────────────────────────────────────────────────────

export type SearchSuggestionType = 'specialty' | 'hairdresser' | 'city' | 'location' | 'service';

export interface ApiSearchSuggestion {
  type: SearchSuggestionType;
  label: string;
  value: string;
  slug?: string;
}

export interface ApiSearchResponse {
  data: ApiHairdresserProfile[];
  total: number;
  per_page: number;
  current_page: number;
}

// ── Salon ───────────────────────────────────────────────────────────

export interface ApiSalonFull {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  website: string | null;
  instagram_url: string | null;
  cover_image: string | null;
  logo: string | null;
  is_verified: boolean;
  hairdressers_count?: number;
  hairdressers: (ApiHairdresserProfile & { user: ApiUser })[];
  owner?: ApiUser;
}

export interface ApiSalonJoinRequest {
  id: number;
  hairdresser_id: number;
  salon_id: number;
  status: 'pending' | 'accepted' | 'declined';
  message: string | null;
  created_at: string;
  salon?: ApiSalonFull;
  hairdresser?: ApiHairdresserProfile & { user: ApiUser };
}

// ── Available hairdressers ───────────────────────────────────────────

export interface ApiAvailableHairdresser extends ApiHairdresserProfile {
  slots_today: number;
  distance_km?: number;
  user: ApiUser;
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
