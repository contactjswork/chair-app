// Retours haptiques — module central côté app.
//
// Même contrat de disponibilité que lib/push.ts : les binaires CHAIR
// chargent le site distant (server.url), donc le code web est toujours en
// avance sur les binaires. @capacitor/haptics n'existe QUE dans les binaires
// compilés après son ajout — sur un binaire actuel comme sur le web,
// Capacitor.isPluginAvailable('Haptics') renvoie false. Chaque fonction se
// dégrade donc en no-op silencieux, jamais d'exception, jamais d'await requis
// côté appelant (fire-and-forget : `void hapticLight()`).
//
// Imports dynamiques : le plugin ne pèse rien dans le bundle web tant
// qu'aucun retour haptique n'est déclenché.
//
// SOBRIÉTÉ — quatre points de contact seulement, choisis en réunion :
// changement d'onglet (léger), réservation confirmée (succès), annulation
// confirmée (avertissement), like (léger). L'haptique partout est pire que
// pas d'haptique : ne pas en ajouter sans décision explicite.

async function hapticsIfAvailable() {
  if (typeof window === 'undefined') return null;
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Haptics')) return null;
    return await import('@capacitor/haptics');
  } catch {
    return null;
  }
}

/** Impact léger — changement d'onglet, like. */
export async function hapticLight(): Promise<void> {
  try {
    const mod = await hapticsIfAvailable();
    if (!mod) return;
    await mod.Haptics.impact({ style: mod.ImpactStyle.Light });
  } catch { /* no-op : l'haptique ne doit jamais casser un parcours */ }
}

/** Notification de succès — réservation confirmée. */
export async function hapticSuccess(): Promise<void> {
  try {
    const mod = await hapticsIfAvailable();
    if (!mod) return;
    await mod.Haptics.notification({ type: mod.NotificationType.Success });
  } catch { /* no-op */ }
}

/** Notification d'avertissement — annulation confirmée. */
export async function hapticWarning(): Promise<void> {
  try {
    const mod = await hapticsIfAvailable();
    if (!mod) return;
    await mod.Haptics.notification({ type: mod.NotificationType.Warning });
  } catch { /* no-op */ }
}
