'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { Check, BellOff, Bell } from 'lucide-react';
import { notifications as notifApi } from '@/lib/api';
import type { ApiNotificationPreferences } from '@/lib/types';
import {
  getPushPermissionState,
  getStoredPushToken,
  getLastPushError,
  requestAndRegister,
  type PushPermissionState,
} from '@/lib/push';

const PREF_KEY = 'chair_notif_prefs';

type NotifPrefs = ApiNotificationPreferences;

const DEFAULT: NotifPrefs = {
  reminder_24h: true,
  reminder_1h: true,
  booking_confirmed: true,
  booking_cancelled: true,
  review_request: true,
  review_reply: false,
  followed_post: false,
  new_hairdresser_nearby: false,
  promotions: false,
  security: true,
};

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-[46px] h-[26px] rounded-full transition-colors duration-200 flex-shrink-0 ${on ? 'bg-neutral-900' : 'bg-neutral-200'}`}
      role="switch"
      aria-checked={on}
    >
      <span className={`absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2.5 px-1">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">{title}</p>
        {desc && <p className="text-[12px] text-neutral-400 mt-0.5">{desc}</p>}
      </div>
      <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({
  label, desc, on, onChange,
}: { label: string; desc: string; on: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-neutral-900 leading-snug">{label}</p>
        <p className="text-[12px] text-neutral-400 mt-0.5 leading-snug">{desc}</p>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

/**
 * État du canal push sur CET appareil — natif uniquement, tout le bloc rend
 * null sur le web et les binaires sans le plugin ('unavailable').
 *
 * Trois cas visibles :
 *   • 'denied'  → bandeau d'explication. Pas de bouton « Ouvrir les
 *     réglages » : il n'existe aucun moyen documenté par Capacitor d'ouvrir
 *     les Réglages iOS sans plugin supplémentaire (l'URL 'app-settings:' via
 *     App.openUrl n'est ni documentée ni fiable) — plutôt une instruction
 *     claire qu'un bouton mort.
 *   • 'granted' sans token local → la permission existe mais l'appareil n'est
 *     pas (plus) enregistré côté CHAIR (migration, réinstallation, logout) :
 *     on propose la réactivation, sans popup système puisque déjà accordée.
 *   • 'prompt' → activation directe : la carte d'opt-in du compte a pu être
 *     écartée, cette page est l'endroit légitime pour revenir dessus.
 */
function PushChannelStatus() {
  const [perm, setPerm] = useState<PushPermissionState>('unavailable');
  const [hasToken, setHasToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await getPushPermissionState();
      if (cancelled) return;
      setPerm(state);
      setHasToken(!!getStoredPushToken());
    })();
    return () => { cancelled = true; };
  }, []);

  async function activate() {
    if (busy) return; // anti double-tap
    setBusy(true);
    setError(null);
    const result = await requestAndRegister();
    setBusy(false);
    if (result === 'registered') {
      setPerm('granted');
      setHasToken(true);
    } else if (result === 'denied') {
      setPerm('denied');
    } else if (result === 'error') {
      // Un échec muet laissait l'utilisateur (et le support) sans aucune
      // piste : le bouton revenait à son état initial, rien de plus.
      setError(getLastPushError() ?? "L'activation a échoué. Réessaie dans un instant.");
    }
  }

  if (perm === 'unavailable') return null;

  if (perm === 'denied') {
    return (
      <div className="mb-5 bg-neutral-50 rounded-2xl border border-neutral-100 px-5 py-4 flex items-start gap-3">
        <BellOff size={17} className="text-neutral-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-neutral-900 leading-snug">
            Les notifications sont désactivées dans les réglages de ton iPhone.
          </p>
          <p className="text-[12px] text-neutral-400 mt-1 leading-snug">
            Pour les réactiver : Réglages, puis Notifications, puis CHAIR.
          </p>
        </div>
      </div>
    );
  }

  if (perm === 'granted' && hasToken) return null;

  // 'prompt', ou 'granted' sans appareil enregistré.
  return (
    <div className="mb-5 bg-white rounded-2xl border border-neutral-100 px-5 py-4">
      <div className="flex items-start gap-3">
        <Bell size={17} className="text-neutral-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-neutral-900 leading-snug">
            {perm === 'granted' ? 'Cet appareil ne reçoit plus les notifications' : 'Les notifications ne sont pas activées'}
          </p>
          <p className="text-[12px] text-neutral-400 mt-0.5 leading-snug">
            {perm === 'granted'
              ? 'Réactive-les pour recevoir les confirmations et changements de tes rendez-vous.'
              : 'Active-les pour recevoir les confirmations et changements de tes rendez-vous.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={activate}
        disabled={busy}
        aria-busy={busy || undefined}
        className="mt-3 w-full h-[46px] rounded-2xl bg-neutral-900 text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
      >
        {busy && <span aria-hidden="true" className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
        {busy ? 'Activation…' : perm === 'granted' ? 'Réactiver les notifications' : 'Activer les notifications'}
      </button>

      {error && (
        <p role="alert" className="mt-2.5 text-[12px] text-red-600 leading-relaxed">
          {error}
        </p>
      )}
    </div>
  );
}

export default function NotifPrefsPage() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Valeurs héritées de l'ancien stockage localStorage (jamais respectées
    // à l'envoi à l'époque) — servent d'affichage immédiat et de migration.
    let localPrefs: NotifPrefs | null = null;
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) localPrefs = { ...DEFAULT, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    if (localPrefs) setPrefs(localPrefs);

    (async () => {
      try {
        if (localPrefs) {
          // Migration douce : on pousse une fois les valeurs locales vers
          // l'API, puis l'API devient la source de vérité (clé locale purgée).
          const { preferences } = await notifApi.updatePreferences(localPrefs);
          if (cancelled) return;
          setPrefs({ ...DEFAULT, ...preferences });
          localStorage.removeItem(PREF_KEY);
        } else {
          const { preferences } = await notifApi.getPreferences();
          if (cancelled) return;
          setPrefs({ ...DEFAULT, ...preferences });
        }
      } catch {
        // API indisponible (hors-ligne, non connecté) → repli sur les
        // valeurs locales/défauts déjà affichées.
      }
    })();

    return () => { cancelled = true; };
  }, []);

  function toggle(key: keyof NotifPrefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    // Source de vérité : l'API (respectée à l'envoi côté backend).
    // Repli localStorage uniquement si la sauvegarde échoue.
    notifApi.updatePreferences({ [key]: next[key] }).catch(() => {
      try { localStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto pb-28">

        {/* Header */}
        <div className="px-4 pt-4">
          <PageHeader
            title="Notifications"
            backHref="/app/compte"
            right={
              <div className={`flex items-center gap-1.5 text-[12px] font-medium transition-all duration-300 ${saved ? 'text-neutral-900 opacity-100' : 'opacity-0'}`}>
                <Check size={13} strokeWidth={3} />
                Sauvegardé
              </div>
            }
          />
        </div>

        <div className="px-4">

          {/* Canal push sur cet appareil (natif uniquement, null sur le web) */}
          <PushChannelStatus />

          {/* Réservations */}
          <Section title="Réservations" desc="Rappels et mises à jour de tes rendez-vous">
            <Row
              label="Rappel 24h avant"
              desc="Reçois un rappel la veille de ton rendez-vous"
              on={prefs.reminder_24h}
              onChange={() => toggle('reminder_24h')}
            />
            <Row
              label="Rappel 1h avant"
              desc="Un dernier rappel 1 heure avant"
              on={prefs.reminder_1h}
              onChange={() => toggle('reminder_1h')}
            />
            <Row
              label="Confirmation de RDV"
              desc="Quand un coiffeur confirme ta réservation"
              on={prefs.booking_confirmed}
              onChange={() => toggle('booking_confirmed')}
            />
            <Row
              label="Annulation de RDV"
              desc="Si ton rendez-vous est annulé ou modifié"
              on={prefs.booking_cancelled}
              onChange={() => toggle('booking_cancelled')}
            />
          </Section>

          {/* Avis */}
          <Section title="Avis" desc="Retours sur tes expériences">
            <Row
              label="Invitation à laisser un avis"
              desc="Après chaque rendez-vous complété"
              on={prefs.review_request}
              onChange={() => toggle('review_request')}
            />
            <Row
              label="Réponse à ton avis"
              desc="Quand un coiffeur répond à ton évaluation"
              on={prefs.review_reply}
              onChange={() => toggle('review_reply')}
            />
          </Section>

          {/* Social */}
          <Section title="Abonnements" desc="Activité des coiffeurs que tu suis">
            <Row
              label="Nouvelle réalisation"
              desc="Quand un coiffeur que tu suis publie un nouveau post"
              on={prefs.followed_post}
              onChange={() => toggle('followed_post')}
            />
          </Section>

          {/* Découverte */}
          <Section title="Découverte" desc="Désactivé par défaut pour éviter le spam">
            <Row
              label="Nouveau coiffeur à proximité"
              desc="Quand un nouveau profil rejoint CHAIR près de toi"
              on={prefs.new_hairdresser_nearby}
              onChange={() => toggle('new_hairdresser_nearby')}
            />
            <Row
              label="Offres & promotions"
              desc="Réductions et offres spéciales de coiffeurs"
              on={prefs.promotions}
              onChange={() => toggle('promotions')}
            />
          </Section>

          {/* Système */}
          <Section title="Système">
            <Row
              label="Sécurité du compte"
              desc="Connexion depuis un nouvel appareil, changement de mot de passe"
              on={prefs.security}
              onChange={() => toggle('security')}
            />
          </Section>

          <p className="text-[11px] text-neutral-300 text-center mt-2 leading-relaxed">
            Chaque interrupteur s&apos;applique aux notifications dans l&apos;app
            et aux notifications push envoyées sur ton téléphone.
            Tu peux aussi couper toutes les push dans les Réglages de ton téléphone.
          </p>

        </div>
      </div>
    </AppShell>
  );
}
