const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
export const SESSION_EXPIRED_EVENT = 'chair:session-expired';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('chair_token');
}

/**
 * Un 401 sur une requête authentifiée veut dire que le token n'est plus
 * valide (dev : DB réinitialisée sous le tapis / prod : token révoqué) — sans
 * ça, l'utilisateur restait sur la page avec un "Unauthenticated." affiché
 * tel quel, sans comprendre qu'il fallait juste se reconnecter. On nettoie la
 * session ici et on prévient AuthContext, qui gère la redirection (un module
 * hors-React ne peut pas appeler useRouter directement).
 */
function handleUnauthenticated(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('chair_token');
  localStorage.removeItem('chair_user');
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

/** Réseau injoignable (serveur éteint, mode avion) : fetch lève un TypeError
 *  anglais ("Failed to fetch") — jamais montrable tel quel à l'utilisateur. */
const NETWORK_ERROR_MESSAGE = 'Connexion impossible. Vérifie ta connexion internet et réessaie.';

/**
 * Traduit en français humain les messages techniques que Laravel renvoie en
 * anglais ("Unauthenticated.", "Too Many Attempts.", "Server Error") — les
 * messages métier du backend sont déjà en français et passent tels quels.
 */
function humanizeErrorMessage(status: number, serverMsg?: string | null): string {
  const msg = (serverMsg ?? '').trim();
  const looksEnglishTechnical =
    !msg ||
    /unauthenticated|unauthorized|forbidden|too many attempts|server error|not found|no query results|sqlstate|exception|stack trace|call to|undefined/i.test(msg);
  if (!looksEnglishTechnical) return msg;
  if (status === 401) return 'Ta session a expiré. Reconnecte-toi pour continuer.';
  if (status === 403) return 'Tu n’as pas accès à cette action.';
  if (status === 404) return 'Ce contenu n’existe plus ou a été retiré.';
  if (status === 429) return 'Trop de tentatives. Patiente quelques instants puis réessaie.';
  if (status >= 500)  return 'Une erreur est survenue de notre côté. Réessaie dans un instant.';
  return 'Une erreur est survenue. Réessaie dans un instant.';
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  if (!res.ok) {
    if (res.status === 401 && token) handleUnauthenticated();
    const error = await res.json().catch(() => ({ message: null }));
    // Expose first field error for 422 validation failures
    if (res.status === 422 && error.errors) {
      const firstField = Object.keys(error.errors)[0];
      const firstMsg   = error.errors[firstField]?.[0];
      throw new Error(firstMsg ?? error.message ?? 'Données invalides');
    }
    throw new Error(humanizeErrorMessage(res.status, error.message));
  }

  // 204 No Content (et tout body vide) n'a rien à parser — res.json() lève
  // "Unexpected end of JSON input" sur un body vide, ce qui cassait tout
  // endpoint DELETE renvoyant 204 (ex: suppression définitive d'un service).
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  // Body optionnel : Laravel lit sans problème un JSON sur un DELETE
  // (utilisé par push.unregister pour cibler le token de CET appareil,
  // pas toutes les souscriptions de l'utilisateur).
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
};

/** Upload multipart — jamais de Content-Type manuel (casserait la frontière générée par le navigateur). */
async function requestMultipart<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }
  if (!res.ok) {
    if (res.status === 401 && token) handleUnauthenticated();
    const error = await res.json().catch(() => ({ message: null }));
    if (res.status === 422 && error.errors) {
      const firstField = Object.keys(error.errors)[0];
      const firstMsg   = error.errors[firstField]?.[0];
      throw new Error(firstMsg ?? error.message ?? 'Données invalides');
    }
    throw new Error(humanizeErrorMessage(res.status, error.message));
  }
  return res.json();
}

// ── Géolocalisation ──────────────────────────────────────────────────

export const geo = {
  /** Mise à jour de la position GPS de l'utilisateur connecté. */
  updateLocation: (data: { latitude: number; longitude: number; postal_code?: string }) =>
    api.put('/user/location', data),

  /** Coiffeurs proches (utilise le endpoint /hairdressers avec lat/lng/radius). */
  nearby: (lat: number, lng: number, radius = 20, perPage = 8) => {
    const qs = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius: String(radius),
      per_page: String(perPage),
    });
    return api.get<import('./types').PaginatedResponse<import('./types').ApiHairdresserProfile>>(`/hairdressers?${qs}`);
  },

  /** Liste des régions officielles France — sélecteur en cascade inscription pro. */
  regions: () => api.get<{ regions: string[] }>('/geo/regions'),

  /** Départements d'une région donnée, triés par nom. */
  departments: (region: string) =>
    api.get<{ departments: Array<{ code: string; name: string }> }>(`/geo/departments?region=${encodeURIComponent(region)}`),

  /** Autocomplétion ville (API Adresse data.gouv.fr) — "Stras" → Strasbourg, coordonnées incluses. */
  searchCity: (q: string) =>
    api.get<{ results: CitySuggestion[] }>(`/geo/search-city?q=${encodeURIComponent(q)}`),

  /** Autocomplétion adresse (numéro + rue) — scopée à une ville via son citycode une fois connue. */
  searchAddress: (q: string, citycode?: string | null) =>
    api.get<{ results: AddressSuggestion[] }>(
      `/geo/search-address?q=${encodeURIComponent(q)}${citycode ? `&citycode=${encodeURIComponent(citycode)}` : ''}`
    ),

  /** Ville la plus proche d'une position GPS — bouton "Ma position". */
  reverseCity: (lat: number, lng: number) =>
    api.get<CitySuggestion>(`/geo/reverse-city?lat=${lat}&lng=${lng}`),
};

export interface CitySuggestion {
  label: string;
  city: string;
  postcode: string | null;
  /** Code INSEE — permet de scoper une recherche d'adresse à CETTE commune
   *  précise (deux communes homonymes de départements différents n'auraient
   *  sinon aucun moyen d'être distinguées). */
  citycode: string | null;
  lat: number;
  lng: number;
}

export interface AddressSuggestion {
  label: string;
  postcode: string | null;
}

// ── Search ───────────────────────────────────────────────────────────

export interface SearchParams {
  q?: string;
  city?: string;
  specialty?: string;
  min_rating?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  per_page?: number;
}

export const search = {
  query: (params: SearchParams) => {
    const qs = new URLSearchParams();
    if (params.q)                   qs.set('q', params.q);
    if (params.city)                qs.set('city', params.city);
    if (params.specialty)           qs.set('specialty', params.specialty);
    if (params.min_rating)          qs.set('min_rating', String(params.min_rating));
    if (params.lat != null)         qs.set('lat', String(params.lat));
    if (params.lng != null)         qs.set('lng', String(params.lng));
    if (params.radius != null)      qs.set('radius', String(params.radius));
    if (params.page)                qs.set('page', String(params.page));
    if (params.per_page)            qs.set('per_page', String(params.per_page));
    return api.get<ApiSearchResponse>(`/search?${qs}`);
  },

  suggestions: (q: string) =>
    api.get<{ suggestions: ApiSearchSuggestion[] }>(`/search/suggestions?q=${encodeURIComponent(q)}`),
};

// ── Posts / Likes / Inspirations ─────────────────────────────────────

export const posts = {
  toggleLike: (postId: number) =>
    api.post<{ liked: boolean; likes_count: number }>(`/posts/${postId}/like`, {}),
};

export const savedPosts = {
  list: () =>
    api.get<import('./types').ApiPost[]>('/saved-posts'),

  save: (postId: number) =>
    api.post<{ saved: boolean }>(`/saved-posts/${postId}`, {}),

  unsave: (postId: number) =>
    api.delete<{ saved: boolean }>(`/saved-posts/${postId}`),

  status: (postId: number) =>
    api.get<{ saved: boolean }>(`/saved-posts/${postId}/status`),
};

// ── Interactions ────────────────────────────────────────────────────

export interface InteractionStatus {
  following: boolean;
  saved: boolean;
}

export interface FollowResponse {
  following: boolean;
  followers_count: number;
}

export const interactions = {
  status: (hairdresserId: number) =>
    api.get<InteractionStatus>(`/interactions/${hairdresserId}`),

  follow: (hairdresserId: number) =>
    api.post<FollowResponse>(`/follows/${hairdresserId}`, {}),

  unfollow: (hairdresserId: number) =>
    api.delete<FollowResponse>(`/follows/${hairdresserId}`),

  save: (hairdresserId: number) =>
    api.post<{ saved: boolean }>(`/saved-profiles/${hairdresserId}`, {}),

  unsave: (hairdresserId: number) =>
    api.delete<{ saved: boolean }>(`/saved-profiles/${hairdresserId}`),

  savedList: () =>
    api.get<SavedHairdresser[]>('/saved-profiles'),

  followedList: () =>
    api.get<SavedHairdresser[]>('/followed-hairdressers'),
};

// ── Reviews ─────────────────────────────────────────────────────────

export const reviews = {
  reply: (reviewId: number, reply: string) =>
    api.post(`/reviews/${reviewId}/reply`, { reply }),
};

// ── Streak ───────────────────────────────────────────────────────────

export const streak = {
  get: () => api.get('/my-streak'),
};

// ── Analytics ────────────────────────────────────────────────────────

import type { ApiAnalytics, ApiAnalyticsTimeseries } from './types';

export const analytics = {
  get: () => api.get<ApiAnalytics>('/my-analytics'),
  timeseries: (period: '7d' | '30d' | '90d' | '12mo') =>
    api.get<ApiAnalyticsTimeseries>(`/my-analytics/timeseries?period=${period}`),
};

// ── Abonnements CHAIR+ / CHAIR BUSINESS ─────────────────────────────────

import type { ApiMySubscription } from './types';

export const subscription = {
  mine: () => api.get<ApiMySubscription>('/my-subscription'),
  subscribe: (plan: 'chair_plus' | 'chair_business') =>
    api.post<{ checkout_url: string }>('/subscribe', { plan }),
  manage: () => api.post<{ portal_url: string }>('/subscribe/manage', {}),
};

// ── Stories CHAIR+ ──────────────────────────────────────────────────────

import type { ApiStoryBubble, ApiStory } from './types';

export const stories = {
  feed: () => api.get<{ bubbles: ApiStoryBubble[] }>('/stories/feed'),
  mine: () => api.get<ApiStory[]>('/stories/mine'),
  byHairdresser: (hairdresserId: number) => api.get<ApiStory[]>(`/stories/by-hairdresser/${hairdresserId}`),
  view: (id: number) => api.post<{ views_count: number }>(`/stories/${id}/view`, {}),
  remove: (id: number) => api.delete<{ message: string }>(`/stories/${id}`),
};

// ── Support prioritaire CHAIR+ ──────────────────────────────────────────

import type { ApiSupportRequest } from './types';

export const support = {
  send: (subject: string, message: string) =>
    api.post<ApiSupportRequest>('/support-requests', { subject, message }),
  mine: () => api.get<ApiSupportRequest[]>('/support-requests/mine'),
};

// ── Programme ambassadeur ──────────────────────────────────────────────

import type { ApiReferral, ApiReferralInfo, ShareActionType, ShareChannel } from './types';

export const referral = {
  mine: () => api.get<ApiReferral>('/my-referral'),
  share: (actionType: ShareActionType, opts?: { targetType?: string; targetId?: number; channel?: ShareChannel }) =>
    api.post<{ rewarded: boolean; points: number }>('/share-events', {
      action_type: actionType,
      target_type: opts?.targetType,
      target_id: opts?.targetId,
      channel: opts?.channel,
    }),
  // Publique (sans auth) — page d'atterrissage /parrainage/{code}.
  info: (code: string) => api.get<ApiReferralInfo>(`/referral-info/${encodeURIComponent(code)}`),
};

// ── Réputation par spécialité ──────────────────────────────────────────

import type { ApiSpecialtyProgressResponse } from './types';

export const specialtyProgress = {
  mine: () => api.get<ApiSpecialtyProgressResponse>('/my-specialty-progress'),
};

// ── Leaderboard ──────────────────────────────────────────────────────

export const leaderboard = {
  /** `radius`/`lat`/`lng` : classement localisé sur la position réelle du
   *  compte (jamais le GPS appareil) — voir HomeRankingSection/classements
   *  pour la cascade "50km → région (rayon élargi) → France". */
  get: (params: { city?: string; type?: string; limit?: number; lat?: number; lng?: number; radiusKm?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.city)     qs.set('city', params.city);
    if (params.type)     qs.set('type', params.type);
    if (params.limit)    qs.set('limit', String(params.limit));
    if (params.lat != null && params.lng != null && params.radiusKm != null) {
      qs.set('lat', String(params.lat));
      qs.set('lng', String(params.lng));
      qs.set('radius_km', String(params.radiusKm));
    }
    return api.get(`/leaderboard?${qs.toString()}`);
  },
  /** Classement par spécialité, filtré ville/département/région/France/rayon.
   *  geo='auto' (défaut si geoValue fourni) : un champ libre unique, le niveau
   *  est deviné côté backend (département/région en priorité, sinon ville).
   *  geo='radius' : localisé sur lat/lng/radiusKm (voir leaderboard.get). */
  bySpecialty: (params: { specialtyId: number; geo?: 'city' | 'department' | 'region' | 'country' | 'auto' | 'radius'; geoValue?: string; limit?: number; lat?: number; lng?: number; radiusKm?: number }) => {
    const qs = new URLSearchParams();
    qs.set('specialty_id', String(params.specialtyId));
    if (params.geo)      qs.set('geo', params.geo);
    if (params.geoValue) qs.set('geo_value', params.geoValue);
    if (params.limit)    qs.set('limit', String(params.limit));
    if (params.geo === 'radius' && params.lat != null && params.lng != null && params.radiusKm != null) {
      qs.set('lat', String(params.lat));
      qs.set('lng', String(params.lng));
      qs.set('radius_km', String(params.radiusKm));
    }
    return api.get<import('./types').ApiSpecialtyLeaderboard>(`/leaderboard?${qs.toString()}`);
  },
  /** Rang du coiffeur connecté dans EXACTEMENT la même vue (spécialité + zone)
   *  que bySpecialty() — pour se situer même hors du top affiché. */
  mySpecialtyRank: (params: { specialtyId: number; geo?: 'city' | 'department' | 'region' | 'country' | 'auto'; geoValue?: string }) => {
    const qs = new URLSearchParams();
    qs.set('specialty_id', String(params.specialtyId));
    if (params.geo)      qs.set('geo', params.geo);
    if (params.geoValue) qs.set('geo_value', params.geoValue);
    return api.get<import('./types').ApiMySpecialtyRank>(`/my-specialty-rank?${qs.toString()}`);
  },
};

// ── Appointments ────────────────────────────────────────────────────

import type { ApiStats } from './types';

export interface AppointmentCreateData {
  hairdresser_id: number;
  client_name: string;
  client_email: string;
  client_phone?: string;
  service: string;
  desired_date: string;
  desired_slot: string;
  message?: string;
}

export interface RealBookingData {
  hairdresser_id: number;
  client_name: string;
  client_email: string;
  client_phone?: string;
  service_id: number;
  appointment_date: string;
  appointment_time: string;
  message?: string;
}

export const appointments = {
  create: (data: AppointmentCreateData) =>
    api.post('/appointments', data),

  book: (data: RealBookingData) =>
    api.post('/appointments', data),

  list: () =>
    api.get('/appointments'),

  updateStatus: (id: number, status: string) =>
    api.put(`/appointments/${id}/status`, { status }),

  reviewByToken: (token: string, data: { rating: number; comment?: string }) =>
    api.post(`/review-by-token/${token}`, data),

  submitReview: (appointmentId: number, data: { rating: number; comment?: string }) =>
    api.post(`/appointments/${appointmentId}/review`, data),

  getStats: () =>
    api.get<ApiStats>('/stats'),

  myList: () =>
    api.get('/my-appointments'),

  /**
   * Client : annule SON rendez-vous à venir.
   * `updateStatus` juste au-dessus est la route COIFFEUR (elle exige un profil
   * coiffeur côté serveur) — un client n'a jamais eu de sortie avant celle-ci.
   * Aucune règle n'est décidée ici : le serveur revérifie la propriété du
   * rendez-vous (client_id de la ligne, pas un paramètre) et son statut, et
   * renvoie le rendez-vous à jour pour rafraîchir la liste sans rechargement.
   */
  cancelMine: (id: number) =>
    api.put<import('./types').ApiAppointment>(`/appointments/${id}/cancel`, {}),
};

// ── Visites vérifiées (QR) ────────────────────────────────────────────

import type {
  ApiQrTokenResponse, ApiScanInfo,
  ApiVisitConfirmed, ApiVerifiedVisit,
} from './types';

export const visits = {
  /** Coiffeur : récupère ou génère le token QR actif */
  getQrToken: (specialtyId?: number | null) =>
    api.get<ApiQrTokenResponse>(`/hairdresser/qr-token${specialtyId ? `?specialty_id=${specialtyId}` : ''}`),

  /** Coiffeur : force la génération d'un nouveau QR même si l'actuel est encore valide.
   *  specialty_id : quelle prestation ce QR va certifier (alimente le score de la bonne spécialité). */
  refreshQrToken: (specialtyId?: number | null) =>
    api.post<ApiQrTokenResponse>('/hairdresser/qr-token/refresh', { specialty_id: specialtyId ?? null }),

  /** Public : infos du coiffeur avant confirmation du scan */
  getScanInfo: (token: string) =>
    api.get<ApiScanInfo>(`/scan/${token}`),

  /** Auth requis : confirme la visite, retourne visit_id. serviceId (prestation réelle du
   *  coiffeur) alimente correctement specialty_id — serviceName ne reste qu'un repli quand
   *  le coiffeur n'a configuré aucune prestation. */
  confirmVisit: (token: string, serviceId: number | null, serviceName?: string) =>
    api.post<ApiVisitConfirmed>(`/scan/${token}`, serviceId != null ? { service_id: serviceId } : { service_name: serviceName }),

  /** Auth requis : soumet un avis certifié */
  submitReview: (data: { visit_id: number; rating: number; comment: string }) =>
    api.post('/scan/review', data),

  /** Coiffeur : liste ses visites vérifiées */
  myVisits: () =>
    api.get<{ data: ApiVerifiedVisit[] }>('/hairdresser/visits'),
};

// ── Notifications ─────────────────────────────────────────────────────

import type { ApiNotificationPreferences, ApiNotificationsResponse, ApiSearchResponse, ApiSearchSuggestion } from './types';

export const notifications = {
  /** Badge polling — retourne { notifications, unread_count } pour les non lues */
  list: () =>
    api.get<ApiNotificationsResponse>('/notifications'),

  /** Centre de notifications — retourne toutes les notifs (lues + non lues) */
  listAll: () =>
    api.get<ApiNotificationsResponse>('/notifications?all=true'),

  markRead: (id: number) =>
    api.post<{ ok: boolean }>(`/notifications/${id}/read`, {}),

  markAllRead: () =>
    api.post<{ ok: boolean }>('/notifications/read-all', {}),

  /** Préférences — créées avec les défauts au premier accès (respectées à l'envoi côté backend). */
  getPreferences: () =>
    api.get<{ preferences: ApiNotificationPreferences }>('/notification-preferences'),

  updatePreferences: (prefs: Partial<ApiNotificationPreferences>) =>
    api.put<{ preferences: ApiNotificationPreferences }>('/notification-preferences', prefs),
};

// ── Push (appareils natifs uniquement — voir lib/push.ts) ─────────────

export const push = {
  /**
   * Enregistre le token APNs de CET appareil (table push_subscriptions,
   * upsert par token — voir PushTokenController::register). `app` identifie
   * le binaire : un token APNs n'est valable QUE pour le bundle qui l'a
   * obtenu, le backend en déduit le topic d'envoi. Seul 'ios' est accepté
   * aujourd'hui (l'envoi backend est APNs uniquement) — Android rejoindra le
   * contrat avec FCM.
   */
  register: (data: { token: string; platform: 'ios'; app?: 'client' | 'pro' }) =>
    api.post<{ message: string }>('/push/register', data),

  /** Retire le token de CET appareil (au logout) — les autres appareils restent abonnés. Idempotent. */
  unregister: (token: string) =>
    api.delete<{ message: string }>('/push/register', { token }),
};

// ── Services ─────────────────────────────────────────────────────────

export const services = {
  publicList: (slug: string) =>
    api.get(`/hairdressers/${slug}/services`),

  categories: {
    list: () => api.get('/service-categories'),
    create: (data: { name: string; description?: string }) =>
      api.post('/service-categories', data),
    update: (id: number, data: Partial<{ name: string; description: string; display_order: number }>) =>
      api.put(`/service-categories/${id}`, data),
    delete: (id: number) => api.delete(`/service-categories/${id}`),
  },

  items: {
    list: () => api.get('/services'),
    create: (data: { category_id: number; specialty_id?: number | null; name: string; description?: string; price: number | null; duration_minutes: number | null }) =>
      api.post('/services', data),
    update: (id: number, data: Partial<{ category_id: number; specialty_id: number | null; name: string; description: string; price: number | null; duration_minutes: number | null; is_active: boolean }>) =>
      api.put(`/services/${id}`, data),
    deactivate: (id: number) => api.delete(`/services/${id}`),
    duplicate: (id: number) => api.post(`/services/${id}/duplicate`, {}),
    /** Suppression définitive — rejette avec un message clair si le service a des rendez-vous liés. */
    deletePermanently: (id: number) => api.delete(`/services/${id}/permanent`),
  },
};

// ── Schedule ──────────────────────────────────────────────────────────

export const schedule = {
  get: () => api.get('/schedule'),
  update: (schedules: unknown[]) => api.put('/schedule', { schedules }),
  unavailabilities: {
    list: () => api.get('/unavailabilities'),
    create: (data: { start_datetime: string; end_datetime: string; reason?: string }) =>
      api.post('/unavailabilities', data),
    delete: (id: number) => api.delete(`/unavailabilities/${id}`),
  },
  bookingWindow: {
    get: () => api.get('/booking-window'),
    update: (days: number | null) => api.put('/booking-window', { booking_window_days: days }),
  },
};

// ── Availability ──────────────────────────────────────────────────────

export const availability = {
  slots: (slug: string, date: string, serviceId: number) =>
    api.get(`/hairdressers/${slug}/availability?date=${date}&service_id=${serviceId}`),
  availableDates: (slug: string, serviceId: number, month: string) =>
    api.get(`/hairdressers/${slug}/available-dates?service_id=${serviceId}&month=${month}`),
};

// ── Salons ───────────────────────────────────────────────────────────

import type { ApiAvailableHairdresser, ApiSalonFull, ApiSalonJoinRequest, ApiTrainingBadge, ApiJobOffer, ApiSalonInvitation, ApiSalonInvitationPreview } from './types';

export const salons = {
  list: (params?: { q?: string; city?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q)    qs.set('q', params.q);
    if (params?.city) qs.set('city', params.city);
    return api.get<import('./types').PaginatedResponse<ApiSalonFull>>(`/salons?${qs}`);
  },
  show: (slug: string) => api.get<ApiSalonFull>(`/salons/${slug}`),
  mySalon: () => api.get<{ salon: ApiSalonFull; pending_requests: ApiSalonJoinRequest[] }>('/my-salon'),
  recentReviews: () => api.get<import('./types').ApiSalonRecentReview[]>('/my-salon/recent-reviews'),
  updateMySalon: (data: Partial<ApiSalonFull>) => api.put<ApiSalonFull>('/my-salon', data),
  uploadLogo: (file: Blob) => {
    const form = new FormData();
    form.append('logo', file, 'logo.jpg');
    return requestMultipart<{ url: string }>('/my-salon/logo', form);
  },
  uploadCover: (file: Blob) => {
    const form = new FormData();
    form.append('cover', file, 'cover.jpg');
    return requestMultipart<{ url: string }>('/my-salon/cover', form);
  },
  createMySalon: (data: { name: string; city?: string; siret?: string }) =>
    api.post<ApiSalonFull>('/my-salon', data),
  removeHairdresser: (profileId: number) =>
    api.delete<{ message: string }>(`/my-salon/hairdressers/${profileId}`),
  /** Gérant : attribue une visite / déclenche une demande d'avis pour un membre
   *  de son équipe (fallback salarié — jamais un avis écrit par le gérant lui-même). */
  inviteReview: (profileId: number, specialtyId?: number | null) =>
    api.post<{ token: string; scan_url: string; valid_until: string; specialty_id: number | null }>(
      `/my-salon/hairdressers/${profileId}/review-invite`,
      { specialty_id: specialtyId ?? null }
    ),
  verifySiret: (siret: string) =>
    api.get<{ valid: boolean; business_name?: string; city?: string; activity_code?: string; is_hairdresser?: boolean; is_active?: boolean; message?: string }>(`/verify-siret?siret=${siret}`),
  requestJoin: (salonId: number, message?: string) => api.post<ApiSalonJoinRequest>('/join-salon', { salon_id: salonId, message }),
  myJoinRequests: () => api.get<ApiSalonJoinRequest[]>('/my-join-requests'),
  acceptRequest: (requestId: number) => api.post<{ message: string }>(`/join-requests/${requestId}/accept`, {}),
  declineRequest: (requestId: number) => api.post<{ message: string }>(`/join-requests/${requestId}/decline`, {}),
  leaveSalon: () => api.delete<{ message: string }>('/leave-salon'),
};

// ── Invitations salon → coiffeur ───────────────────────────────────────

export const invitations = {
  /** Gérant : invite un coiffeur déjà sur CHAIR (hairdresser_id) ou par email. */
  invite: (data: { hairdresser_id?: number; email?: string; message?: string | null }) =>
    api.post<ApiSalonInvitation>('/my-salon/invite', data),
  sent: () => api.get<ApiSalonInvitation[]>('/my-salon/invitations'),
  resend: (id: number) => api.post<ApiSalonInvitation>(`/my-salon/invitations/${id}/resend`, {}),
  cancel: (id: number) => api.delete<{ ok: boolean }>(`/my-salon/invitations/${id}`),

  /** Coiffeur : invitations reçues sur un compte déjà lié au salon owner. */
  received: () => api.get<ApiSalonInvitation[]>('/my-invitations'),
  accept: (id: number) => api.post<{ ok: boolean }>(`/my-invitations/${id}/accept`, {}),
  decline: (id: number) => api.post<{ ok: boolean }>(`/my-invitations/${id}/decline`, {}),

  /** Arrivée via le lien partagé (email) — fonctionne avec ou sans compte. */
  previewByToken: (token: string) => api.get<ApiSalonInvitationPreview>(`/invitations/${token}`),
  acceptByToken: (token: string) => api.post<{ ok: boolean }>(`/invitations/${token}/accept`, {}),
  declineByToken: (token: string) => api.post<{ ok: boolean }>(`/invitations/${token}/decline`, {}),
};

// ── Training badges ────────────────────────────────────────────────────

export const training = {
  catalogue: () => api.get<ApiTrainingBadge[]>('/training-badges'),
  myBadges:  () => api.get<ApiTrainingBadge[]>('/my-training-badges'),
  add:       (training_badge_id: number, year?: number) =>
    api.post<ApiTrainingBadge[]>('/my-training-badges', { training_badge_id, year }),
  remove:    (badgeId: number) => api.delete<{ message: string }>(`/my-training-badges/${badgeId}`),
};

// ── Job offers ─────────────────────────────────────────────────────────

export const jobOffers = {
  list: (params?: { city?: string; job_type?: string; contract_type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.city)          qs.set('city', params.city);
    if (params?.job_type)      qs.set('job_type', params.job_type);
    if (params?.contract_type) qs.set('contract_type', params.contract_type);
    return api.get<import('./types').PaginatedResponse<ApiJobOffer>>(`/job-offers?${qs}`);
  },
  myOffers:  () => api.get<ApiJobOffer[]>('/my-job-offers'),
  create:    (data: Partial<ApiJobOffer>) => api.post<ApiJobOffer>('/job-offers', data),
  update:    (id: number, data: Partial<ApiJobOffer>) => api.put<ApiJobOffer>(`/job-offers/${id}`, data),
  remove:    (id: number) => api.delete<{ message: string }>(`/job-offers/${id}`),
};

// ── Available hairdressers ────────────────────────────────────────────

export type AvailabilityWhen = 'today' | 'tomorrow' | 'this_week' | 'weekend';

export const availableHairdressers = {
  list: (params?: { when?: AvailabilityWhen; lat?: number; lng?: number; radius?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.when)     qs.set('when', params.when);
    if (params?.lat != null) qs.set('lat', String(params.lat));
    if (params?.lng != null) qs.set('lng', String(params.lng));
    if (params?.radius)   qs.set('radius', String(params.radius));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    return api.get<{ data: ApiAvailableHairdresser[]; total: number; when: string }>(`/available-hairdressers?${qs}`);
  },
};

export interface SavedHairdresser {
  id: number;
  slug: string;
  tagline: string | null;
  city: string | null;
  banner_image: string | null;
  avg_rating: string;
  reviews_count: number;
  followers_count: number;
  posts_count: number;
  is_verified: boolean;
  is_independent: boolean;
  user: {
    id: number;
    name: string;
    avatar: string | null;
  };
  specialties: Array<{ id: number; name: string; slug: string }>;
}

// ── Location de fauteuil ───────────────────────────────────────────────

import type { ApiChairRental, ApiChairRentalRequest, ApiChairRentalRequestMessage, ChairEquipmentKey, ChairSpaceType } from './types';

export interface ChairRentalPublicParams {
  city?: string;
  space_type?: ChairSpaceType;
  min_price?: number;
  max_price?: number;
  day?: number;
  equipment?: ChairEquipmentKey[];
  lat?: number;
  lng?: number;
  radius?: number;
}

export const chairRentals = {
  // ── Gérant ──
  myRentals: () => api.get<ApiChairRental[]>('/my-salon/rentals'),
  create: (data: Partial<ApiChairRental>) => api.post<ApiChairRental>('/my-salon/rentals', data),
  update: (id: number, data: Partial<ApiChairRental>) => api.put<ApiChairRental>(`/my-salon/rentals/${id}`, data),
  remove: (id: number) => api.delete<{ ok: boolean }>(`/my-salon/rentals/${id}`),
  uploadPhotos: (id: number, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append('photos[]', f, f.name));
    return requestMultipart<{ photos: string[] }>(`/my-salon/rentals/${id}/photos`, form);
  },
  reorderPhotos: (id: number, photos: string[]) => api.put<{ photos: string[] }>(`/my-salon/rentals/${id}/photos/order`, { photos }),
  deletePhoto: (id: number, url: string) => api.delete<{ photos: string[] }>(`/my-salon/rentals/${id}/photos?url=${encodeURIComponent(url)}`),
  myRequests: (status?: string) => api.get<ApiChairRentalRequest[]>(`/my-salon/rental-requests${status ? `?status=${status}` : ''}`),
  acceptRequest: (id: number) => api.post<{ ok: boolean }>(`/my-salon/rental-requests/${id}/accept`, {}),
  declineRequest: (id: number) => api.post<{ ok: boolean }>(`/my-salon/rental-requests/${id}/decline`, {}),

  // ── Fil de discussion (gérant + coiffeur) ──
  showRequest: (id: number) => api.get<ApiChairRentalRequest>(`/chair-rental-requests/${id}`),
  sendMessage: (id: number, message: string) => api.post<ApiChairRentalRequestMessage>(`/chair-rental-requests/${id}/messages`, { message }),

  // ── Coiffeur indépendant ──
  list: (params?: ChairRentalPublicParams) => {
    const qs = new URLSearchParams();
    if (params?.city)       qs.set('city', params.city);
    if (params?.space_type) qs.set('space_type', params.space_type);
    if (params?.min_price != null) qs.set('min_price', String(params.min_price));
    if (params?.max_price != null) qs.set('max_price', String(params.max_price));
    if (params?.day != null) qs.set('day', String(params.day));
    if (params?.equipment?.length) qs.set('equipment', params.equipment.join(','));
    if (params?.lat != null) qs.set('lat', String(params.lat));
    if (params?.lng != null) qs.set('lng', String(params.lng));
    if (params?.radius != null) qs.set('radius', String(params.radius));
    return api.get<ApiChairRental[]>(`/chair-rentals?${qs}`);
  },
  show: (slug: string) => api.get<ApiChairRental>(`/chair-rentals/slug/${slug}`),
  sendRequest: (id: number, message?: string) => api.post<ApiChairRentalRequest>(`/chair-rentals/${id}/request`, { message }),
  myRequestsSent: () => api.get<ApiChairRentalRequest[]>('/my-chair-requests'),
  cancelRequest: (id: number) => api.post<{ ok: boolean }>(`/my-chair-requests/${id}/cancel`, {}),
};

// ── Modération communautaire (App Store Review Guideline 1.2 — UGC) ──
// Signalement de contenu + blocage d'utilisateur. Le blocage a un effet réel
// côté serveur : le contenu du compte bloqué disparaît du feed du bloqueur
// (filtrage dans HairdresserController::feed).

/** Motifs de signalement — slugs acceptés par POST /reports. */
export type ReportReason =
  | 'inappropriate'
  | 'harassment'
  | 'spam'
  | 'misleading'
  | 'intellectual_property'
  | 'other';

/**
 * Type de contenu signalé.
 * - 'post'    → content_id = id de la réalisation
 * - 'review'  → content_id = id de l'avis
 * - 'profile' → content_id = id du PROFIL coiffeur (hairdresser.id)
 */
export type ReportTargetType = 'post' | 'review' | 'profile';

export interface BlockedAccount {
  user_id: number;
  name: string;
  avatar: string | null;
  slug: string | null;
  blocked_at: string;
}

export const moderation = {
  report: (payload: {
    type: ReportTargetType;
    content_id: number;
    reason: ReportReason;
    details?: string;
  }) => api.post<{ message: string; report_id: number }>('/reports', payload),

  block: (userId: number) =>
    api.post<{ blocked: boolean; message: string }>(`/users/${userId}/block`, {}),

  unblock: (userId: number) =>
    api.delete<{ blocked: boolean; message: string }>(`/users/${userId}/block`),

  blockedList: () => api.get<BlockedAccount[]>('/my-blocks'),
};
