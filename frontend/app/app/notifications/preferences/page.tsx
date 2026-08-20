'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { Check } from 'lucide-react';
import { notifications as notifApi } from '@/lib/api';
import type { ApiNotificationPreferences } from '@/lib/types';

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
            Les notifications push sont gérées par ton appareil.{'\n'}
            Tu peux aussi les désactiver dans les Réglages de ton téléphone.
          </p>

        </div>
      </div>
    </AppShell>
  );
}
