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
    throw new Error(error.message || `Erreur ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

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

// ── Appointments ────────────────────────────────────────────────────

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
    api.get('/stats'),

  myList: () =>
    api.get('/my-appointments'),
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
    create: (data: { category_id: number; name: string; description?: string; price: number | null; duration_minutes: number | null }) =>
      api.post('/services', data),
    update: (id: number, data: Partial<{ category_id: number; name: string; description: string; price: number | null; duration_minutes: number | null; is_active: boolean }>) =>
      api.put(`/services/${id}`, data),
    deactivate: (id: number) => api.delete(`/services/${id}`),
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
};

// ── Availability ──────────────────────────────────────────────────────

export const availability = {
  slots: (slug: string, date: string, serviceId: number) =>
    api.get(`/hairdressers/${slug}/availability?date=${date}&service_id=${serviceId}`),
  availableDates: (slug: string, serviceId: number, month: string) =>
    api.get(`/hairdressers/${slug}/available-dates?service_id=${serviceId}&month=${month}`),
};

// ── Salons ───────────────────────────────────────────────────────────

import type { ApiAvailableHairdresser, ApiSalonFull, ApiSalonJoinRequest } from './types';

export const salons = {
  list: (params?: { q?: string; city?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q)    qs.set('q', params.q);
    if (params?.city) qs.set('city', params.city);
    return api.get<import('./types').PaginatedResponse<ApiSalonFull>>(`/salons?${qs}`);
  },
  show: (slug: string) => api.get<ApiSalonFull>(`/salons/${slug}`),
  mySalon: () => api.get<{ salon: ApiSalonFull; pending_requests: ApiSalonJoinRequest[] }>('/my-salon'),
  updateMySalon: (data: Partial<ApiSalonFull>) => api.put<ApiSalonFull>('/my-salon', data),
  requestJoin: (salonId: number, message?: string) => api.post<ApiSalonJoinRequest>('/join-salon', { salon_id: salonId, message }),
  myJoinRequests: () => api.get<ApiSalonJoinRequest[]>('/my-join-requests'),
  acceptRequest: (requestId: number) => api.post<{ message: string }>(`/join-requests/${requestId}/accept`, {}),
  declineRequest: (requestId: number) => api.post<{ message: string }>(`/join-requests/${requestId}/decline`, {}),
  leaveSalon: () => api.delete<{ message: string }>('/leave-salon'),
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
  avg_rating: string;
  reviews_count: number;
  followers_count: number;
  is_verified: boolean;
  user: {
    id: number;
    name: string;
    avatar: string | null;
  };
  specialties: Array<{ id: number; name: string; slug: string }>;
}
