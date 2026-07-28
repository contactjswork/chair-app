const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('chair_token');
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

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erreur réseau' }));
    // Expose first field error for 422 validation failures
    if (res.status === 422 && error.errors) {
      const firstField = Object.keys(error.errors)[0];
      const firstMsg   = error.errors[firstField]?.[0];
      throw new Error(firstMsg ?? error.message ?? 'Données invalides');
    }
    throw new Error(error.message || `Erreur ${res.status}`);
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
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** Upload multipart — jamais de Content-Type manuel (casserait la frontière générée par le navigateur). */
async function requestMultipart<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erreur réseau' }));
    throw new Error(error.message || `Erreur ${res.status}`);
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
};

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

import type { ApiReferral, ShareActionType, ShareChannel } from './types';

export const referral = {
  mine: () => api.get<ApiReferral>('/my-referral'),
  share: (actionType: ShareActionType, opts?: { targetType?: string; targetId?: number; channel?: ShareChannel }) =>
    api.post<{ rewarded: boolean; points: number }>('/share-events', {
      action_type: actionType,
      target_type: opts?.targetType,
      target_id: opts?.targetId,
      channel: opts?.channel,
    }),
};

// ── Réputation par spécialité ──────────────────────────────────────────

import type { ApiSpecialtyProgressResponse } from './types';

export const specialtyProgress = {
  mine: () => api.get<ApiSpecialtyProgressResponse>('/my-specialty-progress'),
};

// ── Leaderboard ──────────────────────────────────────────────────────

export const leaderboard = {
  get: (params: { city?: string; type?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.city)  qs.set('city', params.city);
    if (params.type)  qs.set('type', params.type);
    if (params.limit) qs.set('limit', String(params.limit));
    return api.get(`/leaderboard?${qs.toString()}`);
  },
  /** Classement par spécialité, filtré ville/département/région/France.
   *  geo='auto' (défaut si geoValue fourni) : un champ libre unique, le niveau
   *  est deviné côté backend (département/région en priorité, sinon ville). */
  bySpecialty: (params: { specialtyId: number; geo?: 'city' | 'department' | 'region' | 'country' | 'auto'; geoValue?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    qs.set('specialty_id', String(params.specialtyId));
    if (params.geo)      qs.set('geo', params.geo);
    if (params.geoValue) qs.set('geo_value', params.geoValue);
    if (params.limit)    qs.set('limit', String(params.limit));
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

import type { ApiNotificationsResponse, ApiSearchResponse, ApiSearchSuggestion } from './types';

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
