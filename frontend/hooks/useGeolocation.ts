// Gestion de la géolocalisation navigateur + cache localStorage

import { Geolocation } from '@capacitor/geolocation';

export const GEO_LOCATION_KEY = 'chair_user_location';
export const GEO_ASKED_KEY    = 'chair_geo_asked';

/**
 * Vrai uniquement dans le shell natif Capacitor (iOS/Android) — jamais dans
 * un navigateur web classique.
 */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  timestamp: number;
}

/** Retourne la position stockée si elle a moins de 24h, sinon null. */
export function getStoredLocation(): UserLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GEO_LOCATION_KEY);
    if (!raw) return null;
    const loc = JSON.parse(raw) as UserLocation;
    if (Date.now() - loc.timestamp > 86_400_000) {
      localStorage.removeItem(GEO_LOCATION_KEY);
      return null;
    }
    return loc;
  } catch {
    return null;
  }
}

export function storeLocation(loc: Omit<UserLocation, 'timestamp'>): void {
  localStorage.setItem(GEO_LOCATION_KEY, JSON.stringify({ ...loc, timestamp: Date.now() }));
}

export function clearStoredLocation(): void {
  localStorage.removeItem(GEO_LOCATION_KEY);
}

export function hasGeoBeenAsked(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(GEO_ASKED_KEY) === '1';
}

export function markGeoAsked(): void {
  localStorage.setItem(GEO_ASKED_KEY, '1');
}

/**
 * Demande la position GPS. Sur l'app native, passe par le plugin Capacitor
 * (bridge natif direct) plutôt que navigator.geolocation — sinon WKWebView
 * déclenche EN PLUS sa propre popup "ce site veut votre position" après la
 * vraie popup système, ce qui fait deux demandes pour une seule action.
 */
export async function requestBrowserGeolocation(): Promise<{ latitude: number; longitude: number }> {
  if (isNativeApp()) {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10_000 });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  }
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Géolocalisation non disponible'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  });
}

/** Formate la distance de façon lisible. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
