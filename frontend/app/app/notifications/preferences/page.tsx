'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { ArrowLeft, Check } from 'lucide-react';

const PREF_KEY = 'chair_notif_prefs';

interface NotifPrefs {
  reminder_24h: boolean;
  reminder_1h: boolean;
  booking_confirmed: boolean;
  booking_cancelled: boolean;
  review_request: boolean;
  review_reply: boolean;
  followed_post: boolean;
  new_hairdresser_nearby: boolean;
  promotions: boolean;
  security: boolean;
}

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
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) setPrefs({ ...DEFAULT, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  function toggle(key: keyof NotifPrefs) {
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] };
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto pb-28">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-[18px] font-bold text-neutral-900">Notifications</h1>
          </div>
          <div className={`flex items-center gap-1.5 text-[12px] font-medium transition-all duration-300 ${saved ? 'text-neutral-900 opacity-100' : 'opacity-0'}`}>
            <Check size={13} strokeWidth={3} />
            Sauvegardé
          </div>
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
