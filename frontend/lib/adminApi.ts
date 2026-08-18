/**
 * Client API centralisé pour le Super Admin CHAIR. Un seul point de vérité
 * pour l'URL de l'API, le jeton Sanctum, les types de réponse et la gestion
 * d'erreur (401 -> déconnexion propre, 403 -> message de permission, 422 ->
 * erreurs de validation par champ). Toutes les pages /admin/* doivent passer
 * par `adminFetch` plutôt que d'appeler `fetch` directement.
 *
 * N'invente AUCUN endpoint : chaque fonction ci-dessous correspond
 * exactement à une route déjà construite par les agents backend précédents
 * (voir routes/api.php côté Laravel).
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

/** LOCAL si l'API pointe vers localhost/127.0.0.1, PRODUCTION sinon. */
export function apiEnvironment(): 'LOCAL' | 'PRODUCTION' {
  return /localhost|127\.0\.0\.1/.test(API_URL) ? 'LOCAL' : 'PRODUCTION';
}

const TOKEN_KEY = 'chair_admin_token';
const USER_KEY = 'chair_admin_user';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminSession(token: string, user: AdminSessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredAdminUser(): AdminSessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSessionUser;
  } catch {
    return null;
  }
}

// ─── Erreur typée ───────────────────────────────────────────────────────────

export class AdminApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  /** Corps JSON brut de la réponse d'erreur — utile quand un endpoint renvoie
   * des champs additionnels au-delà de message/errors (ex: 422 avec détail
   * d'usage sur DELETE /admin/specialties/{id}). */
  body?: Record<string, unknown>;

  constructor(message: string, status: number, errors?: Record<string, string[]>, body?: Record<string, unknown>) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.errors = errors;
    this.body = body;
  }

  get isForbidden() {
    return this.status === 403;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const isFormLike = options.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body && !isFormLike ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    clearAdminSession();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/connexion')) {
      window.location.href = '/admin/connexion';
    }
    throw new AdminApiError('Session expirée, reconnexion nécessaire.', 401);
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const body = (data ?? {}) as { message?: string; error?: string; errors?: Record<string, string[]> } & Record<string, unknown>;
    const message = body.message ?? body.error ?? `Erreur ${res.status}`;
    throw new AdminApiError(message, res.status, body.errors, body);
  }

  return data as T;
}

function toQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return '';
  const usable = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!usable.length) return '';
  const qs = new URLSearchParams(usable.map(([k, v]) => [k, String(v)]));
  return `?${qs.toString()}`;
}

// FormData (upload de fichier, ex. photo de spécialité) doit partir telle
// quelle — JSON.stringify() dessus renverrait "{}" (FormData n'a aucune
// propriété énumérable) et perdrait silencieusement le fichier. request()
// détecte déjà `body instanceof FormData` pour ne pas poser de
// Content-Type: application/json dessus (le navigateur fixe lui-même le
// boundary multipart), encore fallait-il ne pas la sérialiser avant.
function toRequestBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

export const adminApi = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined | null>) =>
    request<T>(`${path}${toQuery(params)}`),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: toRequestBody(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: toRequestBody(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ─── Permissions ────────────────────────────────────────────────────────────

export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  USERS_READ: 'users.read',
  USERS_SUSPEND: 'users.suspend',
  USERS_DELETE: 'users.delete',
  USERS_POINTS_ADJUST: 'users.points_adjust',
  HAIRDRESSERS_READ: 'hairdressers.read',
  HAIRDRESSERS_VERIFY: 'hairdressers.verify',
  HAIRDRESSERS_CHAIR_PICK: 'hairdressers.chair_pick',
  HAIRDRESSERS_CHAIR_PLUS_TEST: 'hairdressers.chair_plus_test',
  HAIRDRESSERS_VISIBILITY: 'hairdressers.visibility',
  HAIRDRESSERS_BADGES_MANAGE: 'hairdressers.badges_manage',
  APPOINTMENTS_READ: 'appointments.read',
  CONTENT_MODERATE: 'content.moderate',
  REPORTS_MANAGE: 'reports.manage',
  SUBSCRIPTIONS_READ: 'subscriptions.read',
  SUPPORT_MANAGE: 'support.manage',
  NOTIFICATIONS_SEND: 'notifications.send',
  ANALYTICS_READ: 'analytics.read',
  BADGES_MANAGE: 'badges.manage',
  SETTINGS_UPDATE: 'settings.update',
  FEATURE_FLAGS_MANAGE: 'feature_flags.manage',
  ADMINS_MANAGE: 'admins.manage',
  AUDIT_LOGS_READ: 'audit_logs.read',
  SALONS_READ: 'salons.read',
  SALONS_MANAGE: 'salons.manage',
  SPECIALTIES_MANAGE: 'specialties.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function hasPermission(user: AdminSessionUser | null, key: PermissionKey): boolean {
  if (!user) return false;
  if (user.admin_role === 'super_admin') return true;
  return (user.permissions ?? []).includes(key);
}

export interface AdminSessionUser {
  id: number;
  name: string;
  email: string;
  admin_role?: string | null;
  admin_role_name?: string | null;
  permissions?: string[];
}

// ─── Pagination générique (contrat Laravel paginate()) ─────────────────────

export interface Paginated<T> {
  data: T[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface DashboardCounters {
  new_users: number;
  new_hairdressers: number;
  new_salons: number;
  new_appointments: number;
  new_reviews: number;
  new_posts: number;
  new_chair_plus_subscriptions: number;
}

export interface DashboardToday {
  today: DashboardCounters;
  this_week: DashboardCounters;
  alerts: {
    pending_reports: number;
    hairdressers_to_verify: number;
    suspended_accounts: number;
    suspended_users: number;
    suspended_salons: number;
    support_requests_open: number;
    support_requests_priority_open: number;
  };
  week_started_at: string;
  generated_at: string;
}

// ─── Utilisateurs ───────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  city?: string | null;
  created_at: string;
  suspended_at?: string | null;
  avatar?: string | null;
}

export interface AdminUserDetail {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    city?: string | null;
    phone?: string | null;
    avatar?: string | null;
    bio?: string | null;
    created_at: string;
    suspended_at?: string | null;
    referred_by?: { id: number; name: string; email: string } | null;
    admin_role?: { id: number; key: string; name: string } | null;
  };
  stats: {
    appointments_as_client: number;
    appointments_as_hairdresser: number;
    reviews_given: number;
    reviews_received: number;
    saved_profiles: number;
    saved_posts: number;
    follows: number;
    posts_published: number;
    referrals_count: number;
  };
  recent_appointments: Array<{
    id: number;
    hairdresser_id: number;
    client_id: number;
    status: string;
    appointment_date: string;
    appointment_time: string;
    created_at: string;
    hairdresser?: { id: number; slug: string; user?: { id: number; name: string } };
    client?: { id: number; name: string };
  }>;
  recent_reviews: Array<{
    id: number;
    rating: number;
    comment: string;
    created_at: string;
    client?: { id: number; name: string };
    hairdresser?: { id: number; slug: string; user?: { id: number; name: string } };
  }>;
  referrals: Array<{ id: number; name: string; email: string; role: string; created_at: string }>;
  professional: {
    profile_id: number;
    slug: string;
    city?: string | null;
    is_independent: boolean;
    is_verified: boolean;
    identity_verified: boolean;
    diploma_status: string;
    is_hidden: boolean;
    hidden_reason?: string | null;
    chair_pick_until?: string | null;
    chair_plus_until?: string | null;
    is_chair_plus: boolean;
    salon?: { id: number; name: string; city: string; slug: string } | null;
    specialties: Array<{ id: number; name: string; slug: string }>;
    services_count: number;
    service_categories_count: number;
    avg_rating: number;
    reviews_count: number;
    followers_count: number;
    verified_visits_count: number;
    chair_score: number;
    chair_score_adjustment: number;
    chair_level: ChairLevel;
    badges: BadgeCatalogEntry[];
  } | null;
  salon_owned: { id: number; name: string; city: string; hairdressers_count: number } | null;
}

/** Forme exacte de BadgeService::getLevel() — PAS une simple chaîne. */
export interface ChairLevel {
  level: number;
  name: string;
  color: string;
  points: number;
  progress: number;
  next: { name: string; min: number } | null;
}

/** Forme exacte de BadgeService::toArrayShape()+getFullCatalog() — 'name', pas 'title'. */
export interface BadgeCatalogEntry {
  code: string;
  name: string;
  desc: string | null;
  category: string | null;
  family: string;
  pts: number;
  tier: number;
  rarity: string;
  visible: boolean;
  roles: string[];
  unlocked: boolean;
  unlocked_at?: string | null;
  admin_awarded?: boolean;
  [key: string]: unknown;
}

// ─── Professionnels ─────────────────────────────────────────────────────────

export interface AdminHairdresserRow {
  id: number;
  profile_id: number;
  name: string;
  email: string;
  city?: string | null;
  type: string;
  score: number;
  rating: number;
  reviews_count: number;
  appointments: number;
  status: 'active' | 'suspended';
  pro_plus: boolean;
  is_verified: boolean;
  is_hidden: boolean;
  created_at: string;
}

export interface AdminHairdresserDetail {
  profile: {
    id: number;
    user_id: number;
    slug: string;
    city?: string | null;
    is_independent: boolean;
    is_verified: boolean;
    identity_verified: boolean;
    diploma_status: string;
    is_hidden: boolean;
    hidden_reason?: string | null;
    chair_pick_until?: string | null;
    chair_plus_test_mode?: boolean | null;
    user?: { id: number; name: string; email: string; phone?: string; city?: string; suspended_at?: string | null; created_at: string };
    salon?: { id: number; name: string; city: string; slug: string; is_verified: boolean; suspended_at?: string | null } | null;
    specialties: Array<{ id: number; name: string; slug: string }>;
  };
  stats: {
    appointments_count: number;
    services_count: number;
    service_categories_count: number;
    reviews_count: number;
    avg_rating: number;
    followers_count: number;
    posts_count: number;
    visits_count: number;
    verified_visits_count: number;
  };
  chair_score: number;
  chair_score_adjustment: number;
  chair_level: ChairLevel;
  badges: BadgeCatalogEntry[];
  is_chair_plus: boolean;
  recent_reviews: Array<{ id: number; rating: number; comment: string; created_at: string; client?: { id: number; name: string } }>;
}

export interface PendingDiploma {
  id: number;
  name: string;
  email: string;
  city?: string | null;
  diploma?: string | null;
  diploma_document_url?: string | null;
  submitted_at: string;
}

// ─── Salons ─────────────────────────────────────────────────────────────────

export interface AdminSalonRow {
  id: number;
  name: string;
  slug: string;
  city?: string | null;
  owner: { id: number; name: string; email: string } | null;
  hairdressers_count: number;
  is_verified: boolean;
  verification_status?: string | null;
  suspended: boolean;
  created_at: string;
}

export interface AdminSalonDetail {
  salon: {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    department?: string | null;
    region?: string | null;
    phone?: string | null;
    website?: string | null;
    instagram_url?: string | null;
    siret?: string | null;
    is_verified: boolean;
    verification_status?: string | null;
    suspended_at?: string | null;
    suspended_reason?: string | null;
    is_chair_business: boolean;
    owner: { id: number; name: string; email: string; phone?: string } | null;
    created_at: string;
  };
  stats: {
    hairdressers_count: number;
    job_offers_count: number;
    chair_rentals_count: number;
    avg_rating: number;
    reviews_count: number;
  };
  team: Array<{
    profile_id: number;
    user_id: number;
    name: string;
    email: string;
    is_independent: boolean;
    is_verified: boolean;
    suspended: boolean;
    reviews_count: number;
    avg_rating: number;
  }>;
  job_offers: Array<{ id: number; title: string; job_type: string; contract_type: string; status: string; created_at: string }>;
  chair_rentals: Array<{ id: number; title: string; space_type: string; status: string; price_per_day?: number; price_per_month?: number; created_at: string }>;
}

// ─── Modération ─────────────────────────────────────────────────────────────

export interface ModerationSummary {
  pending_reports: number;
  low_rating_needs_attention: number;
  hidden_reviews: number;
}

export interface AdminReviewRow {
  id: number;
  author_name: string;
  hairdresser_name: string;
  rating: number;
  comment: string;
  created_at: string;
  status: string;
  needs_attention: boolean;
}

export interface AdminReportRow {
  id: number;
  type: string;
  reported_user_name: string;
  reported_user_id: number | null;
  reason: string;
  reporter_name: string;
  created_at: string;
  content_id: number | null;
}

// ─── Badges / Spécialités ───────────────────────────────────────────────────

export interface AdminBadge {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  category?: string | null;
  family: 'carriere' | 'exceptionnel';
  rarity: 'commun' | 'rare' | 'epique' | 'legendaire' | 'ultime';
  tier: number;
  reward: number;
  criteria: { metric: string; operator: string; value: number } | null;
  roles: string[] | null;
  visible: boolean;
  enabled: boolean;
  order: number;
  is_generic: boolean;
  is_hardcoded: boolean;
  awarded_count: number;
}

export interface AdminBadgesResponse {
  data: AdminBadge[];
  metrics: string[];
  operators: string[];
}

export interface AdminSpecialty {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  image_url?: string | null;
  category?: string | null;
  description?: string | null;
  is_active: boolean;
  order: number;
  usage: Record<string, number>;
  usage_total: number;
}

// ─── Configuration ──────────────────────────────────────────────────────────

export interface AdminFeatureFlag {
  id: number;
  key: string;
  enabled: boolean;
  description?: string | null;
}

export interface AdminAppSetting {
  id: number;
  key: string;
  value: unknown;
  group: string;
  type: 'string' | 'integer' | 'float' | 'boolean' | 'json';
  min?: number | null;
  max?: number | null;
  default_value: unknown;
  description?: string | null;
  updated_by?: number | null;
}

// ─── Audit logs ─────────────────────────────────────────────────────────────

export interface AdminAuditLogRow {
  id: number;
  admin_id: number;
  admin?: { id: number; name: string; email: string } | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_value: unknown;
  new_value: unknown;
  ip?: string | null;
  created_at: string;
}

// ─── Comptes admin ──────────────────────────────────────────────────────────

export interface AdminAccountRow {
  id: number;
  name: string;
  email: string;
  admin_role?: string | null;
  suspended: boolean;
  created_at: string;
}

export interface AdminRoleRow {
  id: number;
  key: string;
  name: string;
  description?: string | null;
}

// ─── Analytics / Insights ───────────────────────────────────────────────────

export interface AnalyticsStats {
  registrations: Array<{ date: string; count: number }>;
  appointments: Array<{ date: string; count: number }>;
  top_cities: Array<{ city: string; count: number }>;
  registrations_by_role: { client: Array<{ date: string; count: number }>; hairdresser: Array<{ date: string; count: number }> };
  reviews: Array<{ date: string; count: number }>;
  posts: Array<{ date: string; count: number }>;
  new_subscriptions: Array<{ date: string; plan: string; count: number }>;
  active_users: { last_7_days: number; last_30_days: number };
  retention: {
    d7: { cohort_size: number; retained: number; rate: number | null };
    d30: { cohort_size: number; retained: number; rate: number | null };
    note: string;
  };
  days: number;
}

export interface DemandSupplyRow {
  city: string;
  specialty_slug: string;
  specialty_name: string;
  demand_count: number;
  supply_count: number;
  gap: number;
}

export interface DemandSupplyResponse {
  data: DemandSupplyRow[];
  min_demand_threshold: number;
  methodology: string;
  limitation: string;
}

export interface GeoCoverageRow {
  city: string;
  clients_count: number;
  professionals_count: number;
  salons_count: number;
  clients_per_professional: number | null;
}

export interface GeoCoverageResponse {
  by_clients: GeoCoverageRow[];
  low_coverage: GeoCoverageRow[];
  methodology: string;
  limitation: string;
}

export interface AdminSubscriptionRow {
  id: number;
  name: string;
  email?: string | null;
  plan: string;
  amount: number;
  status: string;
  started_at: string;
}

export interface AdminSubscriptionsResponse {
  data: AdminSubscriptionRow[];
  total: number;
  last_page: number;
  mrr: number;
  active_paying_count: number;
}

// ─── Formatage partagé ──────────────────────────────────────────────────────

export function formatDate(iso?: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', opts ?? { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
