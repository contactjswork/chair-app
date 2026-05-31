const API_BASE = 'http://localhost:8000/api';

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

export const appointments = {
  create: (data: AppointmentCreateData) =>
    api.post('/appointments', data),

  list: () =>
    api.get('/appointments'),

  updateStatus: (id: number, status: string) =>
    api.put(`/appointments/${id}/status`, { status }),

  reviewByToken: (token: string, data: { rating: number; comment?: string }) =>
    api.post(`/review-by-token/${token}`, data),

  getStats: () =>
    api.get('/stats'),
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
