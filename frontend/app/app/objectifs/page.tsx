'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppShell from '@/components/layout/AppShell';
import { appointments as appointmentsApi, interactions } from '@/lib/api';
import type { SavedHairdresser } from '@/lib/api';

type ApiAppointment = { status: string; review?: unknown };
import { computeClientAchievements } from '@/components/ui/ChairBadges';
import { LEVEL_STYLES } from '@/lib/chairLevel';
import { ArrowLeft, Lock, Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const LEVEL_ORDER = ['Nouveau', 'Découvreur', 'Régulier', 'Expert CHAIR'];
const LEVEL_KEYS: Record<string, string> = {
  'Nouveau': 'neutral', 'Découvreur': 'bronze', 'Régulier': 'silver', 'Expert CHAIR': 'gold',
};
const LEVEL_MIN_PTS: Record<string, number> = {
  'Nouveau': 0, 'Découvreur': 40, 'Régulier': 100, 'Expert CHAIR': 200,
};

export default function ObjectifsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [appts, setAppts] = useState<ApiAppointment[]>([]);
  const [follows, setFollows] = useState<SavedHairdresser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/connexion'); return; }
    if (user.role !== 'client') { router.replace('/app'); return; }
    setLoading(true);
    Promise.all([
      appointmentsApi.myList().then((d) => setAppts(d as ApiAppointment[])).catch(() => {}),
      interactions.followedList().then((d) => setFollows(d as SavedHairdresser[])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [user, isLoading, router]);

  if (isLoading || loading || !user) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 pt-6 space-y-3">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </AppShell>
    );
  }

  const completedBookings = appts.filter((a) => a.status === 'completed').length;
  const reviewsCount = appts.filter((a) => a.review != null).length;

  const { achievements, points, level } = computeClientAchievements({
    hasAvatar: !!user.avatar,
    hasCity: !!user.city,
    savedCount: 0,
    followsCount: follows.length,
    reviewsCount,
    bookingsCount: completedBookings,
  });

  const levelKey = LEVEL_KEYS[level] ?? 'neutral';
  const levelStyle = LEVEL_STYLES[levelKey];
  const doneCount = achievements.filter((a) => a.done).length;
  const progressPct = Math.round((points / 360) * 100); // 360 = max pts total
  const currentIdx = LEVEL_ORDER.indexOf(level);
  const nextLevel = LEVEL_ORDER[currentIdx + 1];
  const nextMin = nextLevel ? LEVEL_MIN_PTS[nextLevel] : null;
  const levelProgressPct = nextMin
    ? Math.min(100, Math.round(((points - LEVEL_MIN_PTS[level]) / (nextMin - LEVEL_MIN_PTS[level])) * 100))
    : 100;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto pb-28">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[18px] font-bold text-neutral-900">Mes objectifs</h1>
        </div>

        {/* Niveau card */}
        <div className={`mx-4 rounded-2xl px-5 py-5 mb-6 ${levelStyle.bg} border border-neutral-100`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-0.5">Ton niveau</p>
              <p className={`text-[22px] font-bold leading-tight ${levelStyle.text}`}>{level}</p>
            </div>
            <div className="text-right">
              <p className={`text-[28px] font-bold leading-none ${levelStyle.text}`}>{points}</p>
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold mt-0.5">pts</p>
            </div>
          </div>

          {/* Barre de progression vers niveau suivant */}
          <div className="mb-1">
            <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1.5">
              <span>{doneCount}/{achievements.length} objectifs complétés</span>
              {nextLevel && <span>{nextMin! - points} pts pour {nextLevel}</span>}
              {!nextLevel && <span>Niveau max atteint 🏆</span>}
            </div>
            <div className="h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-neutral-900 rounded-full transition-all duration-700"
                style={{ width: `${levelProgressPct}%` }}
              />
            </div>
          </div>

          {/* Paliers */}
          <div className="flex items-center justify-between mt-3">
            {LEVEL_ORDER.map((l, i) => {
              const isReached = LEVEL_ORDER.indexOf(level) >= i;
              return (
                <div key={l} className="flex flex-col items-center gap-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all ${isReached ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-300'}`}>
                    {isReached ? <Check size={10} strokeWidth={3} /> : i + 1}
                  </div>
                  <span className={`text-[9px] font-semibold leading-tight text-center max-w-[50px] ${isReached ? 'text-neutral-600' : 'text-neutral-300'}`}>
                    {l === 'Expert CHAIR' ? 'Expert' : l}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Liste des objectifs */}
        <div className="px-4">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
            Objectifs
          </p>
          <div className="space-y-2.5">
            {achievements.map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.name}
                  className={`flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all ${
                    a.done
                      ? 'bg-white border-neutral-100'
                      : 'bg-neutral-50 border-neutral-100 opacity-70'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    a.done ? 'bg-neutral-900' : 'bg-neutral-200'
                  }`}>
                    {a.done
                      ? <Icon size={18} className="text-white" strokeWidth={2} />
                      : <Lock size={15} className="text-neutral-400" strokeWidth={2} />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-bold leading-tight ${a.done ? 'text-neutral-900' : 'text-neutral-500'}`}>
                      {a.name}
                    </p>
                    <p className="text-[12px] text-neutral-400 mt-0.5 leading-snug">{a.desc}</p>
                  </div>

                  {/* Points */}
                  <div className="flex-shrink-0 text-right">
                    {a.done ? (
                      <div className="flex items-center gap-1">
                        <Check size={12} className="text-neutral-900" strokeWidth={3} />
                        <span className="text-[12px] font-bold text-neutral-900">+{a.pts}</span>
                      </div>
                    ) : (
                      <span className="text-[12px] font-semibold text-neutral-400">+{a.pts} pts</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA si objectifs manquants */}
        {doneCount < achievements.length && (
          <div className="mx-4 mt-6 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
            <p className="text-[13px] font-semibold text-neutral-900 mb-1">Comment progresser ?</p>
            <ul className="space-y-1.5 mt-2">
              {!user.avatar && (
                <li className="flex items-center gap-2 text-[12px] text-neutral-500">
                  <ChevronRight size={12} className="text-neutral-300 flex-shrink-0" />
                  <Link href="/app/compte/modifier" className="hover:text-neutral-900 transition-colors">Ajoute une photo de profil</Link>
                </li>
              )}
              {!user.city && (
                <li className="flex items-center gap-2 text-[12px] text-neutral-500">
                  <ChevronRight size={12} className="text-neutral-300 flex-shrink-0" />
                  <Link href="/app/compte/modifier" className="hover:text-neutral-900 transition-colors">Ajoute ta ville</Link>
                </li>
              )}
              <li className="flex items-center gap-2 text-[12px] text-neutral-500">
                <ChevronRight size={12} className="text-neutral-300 flex-shrink-0" />
                <Link href="/app/recherche" className="hover:text-neutral-900 transition-colors">Explore des coiffeurs et abonne-toi</Link>
              </li>
              <li className="flex items-center gap-2 text-[12px] text-neutral-500">
                <ChevronRight size={12} className="text-neutral-300 flex-shrink-0" />
                <span>Prends un rendez-vous et laisse un avis</span>
              </li>
            </ul>
          </div>
        )}

      </div>
    </AppShell>
  );
}
