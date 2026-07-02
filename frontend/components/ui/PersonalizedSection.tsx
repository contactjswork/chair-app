'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Sparkles, UserPlus } from 'lucide-react';
import HairdresserCard from './HairdresserCard';
import type { ApiHairdresserProfile, PaginatedResponse } from '@/lib/types';

interface Prefs {
  gender: 'femme' | 'homme' | null;
  interests: string[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export default function PersonalizedSection() {
  const [hairdressers, setHairdressers] = useState<ApiHairdresserProfile[]>([]);
  const [primarySlug,  setPrimarySlug]  = useState('');
  const [primaryLabel, setPrimaryLabel] = useState('');
  const [ready,        setReady]        = useState(false);
  const [isGuest,      setIsGuest]      = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('chair_token');

    // Pas connecté → afficher le CTA d'inscription
    if (!token) {
      setIsGuest(true);
      setReady(true);
      return;
    }

    try {
      const raw = localStorage.getItem('chair_preferences');
      if (!raw) { setReady(true); return; }

      const prefs: Prefs = JSON.parse(raw);
      const interests = prefs.interests ?? [];
      if (interests.length === 0) { setReady(true); return; }

      // Varier l'intérêt affiché à chaque visite (rotation aléatoire)
      const slug = interests[Math.floor(Math.random() * interests.length)];
      setPrimarySlug(slug);

      fetch(`${API}/hairdressers?specialty=${slug}&per_page=8`)
        .then((r) => r.json())
        .then((data: PaginatedResponse<ApiHairdresserProfile>) => {
          const list = data.data ?? [];
          setHairdressers(list);
          const name = list[0]?.specialties?.find((s) => s.slug === slug)?.name;
          setPrimaryLabel(name ?? slug);
        })
        .catch(() => {})
        .finally(() => setReady(true));
    } catch {
      setReady(true);
    }
  }, []);

  if (!ready) return null;

  // ── CTA pour les visiteurs non connectés ──────────────────────────────
  if (isGuest) {
    return (
      <section className="mt-10 px-4 md:px-8 max-w-6xl md:mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-neutral-900 px-6 py-7">
          {/* Fond décoratif */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles size={12} className="text-white/50" />
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/50">Pour toi</p>
            </div>
            <h2 className="text-[20px] font-bold text-white leading-tight mb-2">
              Trouve les coiffeurs<br />faits pour toi.
            </h2>
            <p className="text-[13px] text-white/55 leading-relaxed mb-5">
              Crée un compte gratuit et CHAIR sélectionne les meilleurs profils selon ton style.
            </p>
            <div className="flex gap-2">
              <Link
                href="/inscription"
                className="flex items-center gap-2 bg-white text-neutral-900 font-bold text-[13px] px-4 py-2.5 rounded-xl hover:bg-neutral-100 transition-colors"
              >
                <UserPlus size={14} />
                Créer un compte
              </Link>
              <Link
                href="/connexion"
                className="flex items-center gap-2 border border-white/20 text-white font-semibold text-[13px] px-4 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (hairdressers.length === 0) return null;

  return (
    <section className="mt-10 md:mt-14">

      {/* Header */}
      <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles size={10} className="text-neutral-400" />
            <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-400">
              Pour toi
            </p>
          </div>
          <h2 className="text-[17px] md:text-[19px] font-bold text-neutral-900 tracking-tight leading-tight">
            Spécialistes {primaryLabel}
          </h2>
        </div>
        <Link
          href={`/app/recherche?specialty=${primarySlug}`}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
        >
          <ChevronRight size={16} strokeWidth={2.5} className="text-neutral-900" />
        </Link>
      </div>

      {/* Cartes coiffeurs */}
      <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-3 no-scrollbar">
        {hairdressers.map((h) => (
          <div key={h.id} className="flex-shrink-0 w-[160px] md:w-[190px]">
            <HairdresserCard hairdresser={h} />
          </div>
        ))}
      </div>

    </section>
  );
}
