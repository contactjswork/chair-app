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

export interface ApiMySpecialtyRank {
  ranked: boolean;
  rank?: number;
  total?: number;
  points_to_next?: number | null;
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
  visits_count: number;
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

export interface ApiAnalyticsTimeseries {
  period: '7d' | '30d' | '90d' | '12mo';
  is_premium: boolean;
  labels: string[];
  posts: number[];
  appointments: number[];
  followers: number[];
  revenue: number[];
  /** Réservé CHAIR+ (is_premium=true uniquement) — visites réelles du profil public. */
  visits?: number[];
  /** Réservé CHAIR+ — réalisations enregistrées en favoris. */
  saves?: number[];
  /** Réservé CHAIR+ — % de visites converties en RDV honorés, par période. */
  conversion?: number[];
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
  image_url?: string | null;
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
  /** true = annulé côté Stripe mais accès conservé jusqu'à current_period_end. */
  cancel_at_period_end: boolean;
  covers_today: boolean;
}

/** Les 5 états produit CHAIR+ — dérivés de ApiSubscriptionDetail, jamais recalculés à la main ailleurs. */
export type ChairPlusState = 'free' | 'trial' | 'premium' | 'expired' | 'cancel_scheduled';

export function chairPlusState(hasPlus: boolean, sub: ApiSubscriptionDetail | null): ChairPlusState {
  if (!sub) return hasPlus ? 'premium' : 'free'; // premium banqué (parrainage) sans ligne Stripe
  if (sub.status === 'canceled') return hasPlus ? 'premium' : 'expired';
  if (sub.cancel_at_period_end) return 'cancel_scheduled';
  if (sub.status === 'trialing') return 'trial';
  return 'premium'; // active | past_due (Stripe retente, accès conservé — voir coversToday())
}

export interface ApiMySubscription {
  has_chair_plus: boolean;
  has_chair_business: boolean;
  subscription: ApiSubscriptionDetail | null;
  salon_subscription: ApiSubscriptionDetail | null;
}

export interface ApiSupportRequest {
  id: number;
  subject: string;
  message: string;
  priority: boolean;
  status: 'open' | 'answered' | 'closed';
  created_at: string;
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
  shares_count: number;
  referral_count: number;
  points_earned: number;
  next_milestone: number | null;
  milestones: number[];
  chair_plus_until: string | null;
  boost_until: string | null;
}

// Purement télémétrique — ne crédite jamais de points (voir ReferralService::TELEMETRY_ACTIONS
// côté backend). Les points de parrainage ne viennent que d'une inscription réelle via le lien.
export type ShareActionType = 'share_profile' | 'share_post' | 'social_post';

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

export type ApiRarity = 'commun' | 'rare' | 'epique' | 'legendaire' | 'ultime';

export interface ApiSpecialtyProgress {
  specialty_id: number;
  specialty_name: string | null;
  score: number;
  level: number;
  level_name: string;
  level_color: 'neutral' | 'bronze' | 'silver' | 'gold' | 'purple' | 'diamond';
  rarity: ApiRarity;
  is_reference: boolean;
  /** Niveau 6 — top 1% France entière sur cette spécialité précise. */
  is_national_reference: boolean;
  posts_count: number;
  reviews_count: number;
  avg_rating: number;
  visits_count: number;
  local_rank: number | null;
  local_total: number | null;
  /** Écart de points avec le rang juste au-dessus — null si déjà #1 ou non classé. */
  points_to_next: number | null;
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
  services: { id: number; name: string; specialty_id: number | null; specialty_name: string | null }[];
}

export interface ApiVisitConfirmed {
  visit_id: number;
  hairdresser_id: number;
  hairdresser_name: string;
  hairdresser_slug: string;
  service_type: string | null;
  specialty_id: number | null;
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
  type: 'before_after' | 'result' | 'technique' | 'video';
  description: string;
  /** Vidéo courte CHAIR+ (type='video' uniquement) — 30s max, 25 Mo max. */
  video_url?: string | null;
  video_thumbnail_url?: string | null;
  video_duration_seconds?: number | null;
  /** 'homme' | 'femme' | null (unisexe) — champ propre à la réalisation */
  gender: 'homme' | 'femme' | null;
  duration_minutes: number | null;
  price_indication: number | null;
  cover_image: string | null;
  likes_count: number;
  views_count: number;
  is_published: boolean;
  is_pinned?: boolean;
  display_order?: number;
  liked_by_user?: boolean;
  saved_by_user?: boolean;
  /** Uniquement renvoyé par GET /posts (dashboard) et GET /posts/{id} — pas de compteur dénormalisé, calculé à la volée. */
  saved_count?: number;
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
  tier: 1 | 2 | 3 | 4 | 5;
  rarity: ApiRarity;
  visible: boolean;
  /** Uniquement présent dans le catalogue complet (chair_badges_catalog) — absent de chair_badges/chair_badges_all, qui ne contiennent que des badges débloqués. */
  unlocked?: boolean;
  /** Date réelle de déblocage (uniquement présent si débloqué) — jamais recalculée côté front. */
  unlocked_at?: string | null;
}

/** Un des deux types renvoyés par /profile → next_badges (voir BadgeService::nextBadges). */
export type ApiNextBadge =
  | { type: 'badge'; code: string; name: string; tier: 1 | 2 | 3 | 4 | 5; rarity: ApiRarity; current: number; target: number; pct: number }
  | { type: 'specialty'; specialty_id: number; specialty_name: string | null; name: string; label: string; pct: number };

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
  salon_id?: number | null;
  siret?: string | null;
  siret_verification_status?: 'none' | 'pending' | 'verified' | 'rejected';
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
  /**
   * Entitlement fusionné réel (banqué OU abonnement payé OU CHAIR BUSINESS
   * salon) — présent uniquement sur les réponses "profil unique" qui
   * l'append() explicitement (login/me/profile), absent des listes de
   * recherche (coût requêtes). Toujours préférer ce champ à chair_plus_until
   * quand il est présent — voir hasChairPlus() plus bas.
   */
  is_chair_plus?: boolean;
  /** "Coup de cœur CHAIR" — sélection éditoriale, indépendante de l'abonnement. */
  is_chair_pick?: boolean;
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
  | 'appointment_rescheduled'
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

/**
 * CHAIR+ actif — payé, banqué (récompenses ambassadeur) ou CHAIR BUSINESS du
 * salon. Préfère is_chair_plus (entitlement fusionné réel, calculé backend)
 * quand présent ; ne retombe sur chair_plus_until (banqué uniquement) que si
 * absent — sinon un abonné payant Stripe pur apparaîtrait comme non-premium
 * partout où seul chair_plus_until était lu (bug corrigé le 2026-07-24).
 */
export function hasChairPlus(profile: ApiHairdresserProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.is_chair_plus !== undefined) return profile.is_chair_plus;
  if (!profile.chair_plus_until) return false;
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

// ── Location de fauteuil ────────────────────────────────────────────

export type ChairSpaceType = 'chair' | 'barber_post' | 'private_cabin' | 'coloring_corner' | 'independent_post';

export const CHAIR_SPACE_TYPES: { value: ChairSpaceType; label: string }[] = [
  { value: 'chair', label: 'Fauteuil coiffure' },
  { value: 'barber_post', label: 'Poste barbier' },
  { value: 'private_cabin', label: 'Cabine privée' },
  { value: 'coloring_corner', label: 'Coin coloration' },
  { value: 'independent_post', label: 'Poste indépendant' },
];

export type ChairEquipmentKey =
  | 'mirror' | 'premium_chair' | 'sink' | 'wifi' | 'ac' | 'heating' | 'parking'
  | 'break_room' | 'products_included' | 'card_terminal' | 'city_center' | 'near_station' | 'pmr';

export const CHAIR_EQUIPMENT_LABELS: Record<ChairEquipmentKey, string> = {
  mirror: 'Grand miroir',
  premium_chair: 'Fauteuil premium',
  sink: 'Bac à shampoing',
  wifi: 'Wi-Fi',
  ac: 'Climatisation',
  heating: 'Chauffage',
  parking: 'Parking',
  break_room: 'Salle de pause',
  products_included: 'Produits inclus',
  card_terminal: 'Terminal CB',
  city_center: 'Centre-ville',
  near_station: 'Gare proche',
  pmr: 'Accès PMR',
};

/** Hypothèse produit — taux plateforme utilisé pour l'estimation de revenu affichée au gérant, aucun paiement réel ne transite (Stripe Connect non branché). Doit rester identique à ChairRental::COMMISSION_RATE côté backend. */
export const CHAIR_COMMISSION_RATE = 0.10;

export type ChairRentalStatus = 'draft' | 'available' | 'rented' | 'disabled';
export type ChairRentalRequestStatus = 'pending' | 'in_discussion' | 'accepted' | 'declined' | 'cancelled';

export interface ApiChairRentalRequestMessage {
  id: number;
  chair_rental_request_id: number;
  sender_type: 'owner' | 'hairdresser';
  body: string;
  created_at: string;
}

export interface ApiChairRentalRequest {
  id: number;
  chair_rental_id: number;
  hairdresser_id: number;
  status: ChairRentalRequestStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  chair_rental?: ApiChairRental;
  hairdresser?: ApiHairdresserProfile & { user: ApiUser };
  messages?: ApiChairRentalRequestMessage[];
}

export interface ApiChairRental {
  id: number;
  salon_id: number;
  space_type: ChairSpaceType | null;
  title: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  access_instructions: string | null;
  price_per_day: number | null;
  price_per_week: number | null;
  price_per_month: number | null;
  deposit_amount: number | null;
  available_days: number[] | null;
  start_date: string | null;
  end_date: string | null;
  blocked_dates: string[] | null;
  equipment: ChairEquipmentKey[] | null;
  conditions: string | null;
  insurance_required: boolean;
  insurance_notes: string | null;
  products_policy: string | null;
  photos: string[] | null;
  status: ChairRentalStatus;
  published_at: string | null;
  created_at: string;
  distance_km?: number | null;
  estimated_monthly_revenue?: number | null;
  requests?: ApiChairRentalRequest[];
  salon?: ApiSalon & {
    logo?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    is_verified?: boolean;
    hairdressers?: (ApiHairdresserProfile & { user: ApiUser })[];
  };
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
  region: string | null;
  department: string | null;
  phone: string | null;
  website: string | null;
  instagram_url: string | null;
  cover_image: string | null;
  logo: string | null;
  is_verified: boolean;
  /** CHAIR BUSINESS actif — appendu uniquement sur la fiche publique unique (show()), jamais sur les listes. */
  is_chair_business?: boolean;
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

// ── Invitations salon → coiffeur ──────────────────────────────────────

export type ApiSalonInvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

export interface ApiSalonInvitation {
  id: number;
  salon_id: number;
  hairdresser_id: number | null;
  email: string | null;
  token: string;
  message: string | null;
  /** Statut persisté en base — peut rester 'pending' même après l'échéance
   *  tant qu'aucune action n'a déclenché la transition réelle. */
  status: ApiSalonInvitationStatus;
  /** Statut à afficher — 'expired' dès l'échéance dépassée, sans attendre
   *  une action serveur. Toujours préférer ce champ pour l'UI. */
  effective_status: ApiSalonInvitationStatus;
  expires_at: string | null;
  created_at: string;
  salon?: ApiSalonFull;
  hairdresser?: ApiHairdresserProfile & { user: ApiUser };
  /** Présent uniquement sur la réponse d'un invite/resend — lien à copier
   *  et transmettre manuellement (SMS, WhatsApp, email) : aucun envoi
   *  d'email n'est effectué côté serveur. */
  share_link?: string;
}

export interface ApiSalonInvitationPreview {
  salon: { name: string; slug: string; logo: string | null; city: string | null };
  message: string | null;
  status: ApiSalonInvitationStatus;
  already_claimed: boolean;
}

export interface ApiSalonRecentReview {
  id: number;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  created_at: string;
  hairdresser_name: string | null;
  client_name: string | null;
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
