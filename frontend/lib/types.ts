// ── Types API — shape exacte des réponses Laravel ─────────────────

export interface ApiStreak {
  current_streak: number;
  longest_streak: number;
  weekly_streak: number;
  total_active_days: number;
  last_activity_date: string | null;
  is_active_today: boolean;
}

export interface ApiLeaderboardEntry {
  rank: number;
  id: number;
  slug: string;
  name: string;
  avatar: string | null;
  city: string | null;
  specialty: string | null;
  specialty_slug: string | null;
  avg_rating: number;
  reviews_count: number;
  followers_count: number;
  posts_count: number;
  is_verified: boolean;
  identity_verified: boolean;
  score: number;
}

export interface ApiLeaderboard {
  type: string;
  city: string | null;
  results: ApiLeaderboardEntry[];
}

// ── Classement par spécialité (voir docs/REPUTATION_ARCHITECTURE.md) ──
export interface ApiSpecialtyLeaderboardEntry {
  rank: number;
  id: number;
  slug: string;
  name: string;
  avatar: string | null;
  city: string | null;
  score: number;
  level: number;
  level_name: string;
  level_color: 'neutral' | 'bronze' | 'silver' | 'gold' | 'purple' | 'diamond';
  is_reference: boolean;
  is_verified: boolean;
}

export interface ApiSpecialtyLeaderboard {
  type: 'specialty';
  specialty_id: number;
  specialty_name: string | null;
  geo: 'city' | 'department' | 'region' | 'country';
  geo_value: string | null;
  results: ApiSpecialtyLeaderboardEntry[];
}

export interface ApiSpecialtyHighlight {
  specialty_id: number;
  specialty_name: string | null;
  level: number;
  level_name: string;
  level_color: 'neutral' | 'bronze' | 'silver' | 'gold' | 'purple' | 'diamond';
  is_reference: boolean;
  local_rank: number | null;
  local_total: number | null;
  fast_progress: boolean;
}

export interface ApiAnalyticsTrend {
  pct: number;
  direction: 'up' | 'down' | 'stable';
}

export interface ApiAnalytics {
  posts: { this_week: number; last_week: number; trend: ApiAnalyticsTrend };
  appointments: {
    this_week: number; last_week: number;
    this_month: number; last_month: number;
    trend_week: ApiAnalyticsTrend; trend_month: ApiAnalyticsTrend;
  };
  followers: { this_week: number; last_week: number; trend: ApiAnalyticsTrend; total: number };
  reviews: { this_month: number; total: number; avg: number };
  top_specialty: { name: string; slug: string; score: number } | null;
  recommendations: Array<{
    type: string; title: string; desc: string; cta: string; href: string; urgency: 'high' | 'medium' | 'low';
  }>;
}


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
  category: string | null;
  icon?: string | null;
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
  hairdresser_reply: string | null;
  replied_at: string | null;
  is_verified: boolean;
  is_certified: boolean;
  specialty: string | null;
  created_at: string;
  client: ApiUser;
}

export interface ApiQrTokenResponse {
  token: string;
  scan_url: string;
  valid_until: string;
  valid_from: string;
  ttl_minutes: number;
  specialty_id: number | null;
  specialty_name: string | null;
}

// ── Abonnements CHAIR+ / CHAIR BUSINESS (voir docs/CHAIR_PLUS.md) ──
export interface ApiSubscriptionDetail {
  plan: 'chair_plus' | 'chair_business';
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  trial_ends_at: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  covers_today: boolean;
}

export interface ApiMySubscription {
  has_chair_plus: boolean;
  subscription: ApiSubscriptionDetail | null;
  salon_subscription: ApiSubscriptionDetail | null;
}

// ── Stories CHAIR+ (voir docs/CHAIR_PLUS.md) ──
export interface ApiStoryBubble {
  hairdresser_id: number;
  slug: string;
  name: string;
  avatar: string | null;
  stories_count: number;
  has_unseen: boolean;
}

export interface ApiStory {
  id: number;
  user_id: number;
  media_url: string;
  type: 'image' | 'video';
  expires_at: string;
  views_count: number;
  created_at: string;
}

// ── Programme ambassadeur (voir docs/GROWTH.md) ──
export interface ApiReferral {
  code: string;
  link: string;
  referral_count: number;
  points_earned: number;
  next_milestone: number | null;
  milestones: number[];
  chair_plus_until: string | null;
  boost_until: string | null;
}

export type ShareActionType =
  | 'share_profile' | 'share_post' | 'social_post'
  | 'invite_hairdresser' | 'invite_salon' | 'invite_client'
  | 'first_review' | 'first_favorite';

export type ShareChannel = 'copy_link' | 'qr' | 'instagram' | 'whatsapp' | 'snapchat' | 'tiktok' | 'native';

// ── Réputation par spécialité (voir docs/REPUTATION_ARCHITECTURE.md) ──
export interface ApiSpecialtyNextStepGap {
  type: 'content' | 'visits' | 'reviews';
  missing: number;
  label: string;
}

export interface ApiSpecialtyNextStep {
  specialty_id: number;
  specialty_name: string | null;
  next_level_name: string;
  next_level_min: number;
  type: 'content' | 'visits' | 'reviews';
  missing: number;
  label: string;
  gaps: ApiSpecialtyNextStepGap[];
}

export interface ApiSpecialtyProgress {
  specialty_id: number;
  specialty_name: string | null;
  score: number;
  level: number;
  level_name: string;
  level_color: 'neutral' | 'bronze' | 'silver' | 'gold' | 'purple' | 'diamond';
  is_reference: boolean;
  posts_count: number;
  reviews_count: number;
  avg_rating: number;
  visits_count: number;
  local_rank: number | null;
  local_total: number | null;
  next_step: ApiSpecialtyNextStep | null;
}

export interface ApiSpecialtyProgressResponse {
  specialties: ApiSpecialtyProgress[];
  weighted_aggregate: number;
  chair_score: number;
}

export interface ApiScanInfo {
  hairdresser_id: number;
  hairdresser_name: string;
  hairdresser_slug: string;
  avatar: string | null;
  salon_name: string | null;
  city: string | null;
  verified_visits_count: number;
  token_valid_until: string;
  services: { id: number; name: string }[];
}

export interface ApiVisitConfirmed {
  visit_id: number;
  hairdresser_id: number;
  hairdresser_name: string;
  hairdresser_slug: string;
  service_type: string | null;
}

export interface ApiVerifiedVisit {
  id: number;
  hairdresser_id: number;
  service_type: string | null;
  scanned_at: string;
  client: ApiUser | null;
  review: { id: number; rating: number; comment: string } | null;
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

// ── Badge & Level system ───────────────────────────────────────────
export interface ApiChairBadge {
  code: string;
  name: string;
  desc: string;
  category: string;
  family: 'carriere' | 'exceptionnel';
  pts: number;
  tier: 1 | 2 | 3 | 4;
  visible: boolean;
}

export interface ApiChairLevel {
  level: number;
  name: string;
  color: 'neutral' | 'bronze' | 'silver' | 'gold' | 'purple' | 'diamond';
  points: number;
  progress: number;
  next: { name: string; min: number } | null;
}

export interface ApiHairdresserProfile {
  id: number;
  slug: string;
  banner_image: string | null;
  tagline: string | null;
  years_experience: number | null;
  diploma: string | null;
  city: string | null;
  postal_code: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  distance_km?: number;
  is_independent: boolean;
  is_verified: boolean;
  identity_verified: boolean;
  pro_active_badge: boolean;
  followers_count: number;
  posts_count: number;
  avg_rating: string;
  reviews_count: number;
  visits_count: number;
  verified_visits_count: number;
  instagram_url: string | null;
  tiktok_url: string | null;
  booking_url: string | null;
  keywords: string | null;
  work_status: 'home' | 'private_salon' | 'rented_chair' | 'studio' | null;
  work_address: string | null;
  work_availability: 'employed' | 'looking_salon' | 'looking_gig' | 'not_available' | null;
  booking_window_days?: number | null;
  training_badges?: ApiTrainingBadge[];
  user: ApiUser;
  specialties: ApiSpecialty[];
  salon: ApiSalon | null;
  reviews?: ApiReview[];
  // Gamification
  chair_badges?: ApiChairBadge[];
  chair_badges_all?: ApiChairBadge[];
  chair_points?: number;
  chair_level?: ApiChairLevel;
  chair_streak?: { current_streak: number; is_active_today: boolean };
  specialty_highlights?: ApiSpecialtyHighlight[];
  chair_plus_until?: string | null;
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
  specialty_id?: number | null;
  name: string;
  description: string | null;
  price: string | null;
  duration_minutes: number | null;
  is_active: boolean;
  visits_count: number;
  image_url: string | null;
  category?: ApiServiceCategory;
  specialty?: ApiSpecialty | null;
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

/** CHAIR+ actif — payé ou banqué (récompenses ambassadeur), même champ. */
export function hasChairPlus(profile: ApiHairdresserProfile | null | undefined): boolean {
  if (!profile?.chair_plus_until) return false;
  return new Date(profile.chair_plus_until).getTime() > Date.now();
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

// ── Training badges ─────────────────────────────────────────────────

export interface ApiTrainingBadge {
  id: number;
  institution: string;
  name: string;
  slug: string;
  category: 'formation' | 'certification';
  pivot?: { year: number | null; is_verified: boolean };
}

export interface ApiJobOffer {
  id: number;
  salon_id: number;
  title: string;
  job_type: 'hairdresser' | 'colorist' | 'barber' | 'stylist' | 'apprentice' | 'other';
  level?: 'cap1' | 'cap2' | 'bp1' | 'bp2' | 'bm_bts1' | 'bm_bts2' | null;
  contract_type: 'cdi' | 'cdd' | 'alternance' | 'apprentissage' | 'freelance';
  description: string | null;
  city: string | null;
  status: 'open' | 'closed';
  created_at: string;
  salon?: ApiSalon & { logo?: string | null; slug?: string };
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
  siret: string | null;
  verification_status: 'unverified' | 'pending_review' | 'verified' | 'rejected';
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
