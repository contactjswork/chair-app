// Capture du code de parrainage (?ref=CODE) — voir docs/GROWTH.md.
// Persisté en localStorage pour survivre à la navigation jusqu'à l'inscription
// (le visiteur clique un lien de parrainage, navigue un peu, puis s'inscrit).

const STORAGE_KEY = 'chair_ref';

export function captureReferralCode(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) localStorage.setItem(STORAGE_KEY, ref.trim());
}

export function getStoredReferralCode(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem(STORAGE_KEY) ?? undefined;
}

export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
