'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { interactions, type SavedHairdresser } from '@/lib/api';
import { Heart, MapPin, Star, BadgeCheck, LogIn } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/types';
import PageHeader from '@/components/layout/PageHeader';

export default function FavorisPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [saved, setSaved] = useState<SavedHairdresser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    interactions.savedList()
      .then(setSaved)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function handleUnsave(hairdresserId: number) {
    await interactions.unsave(hairdresserId).catch(() => {});
    setSaved((prev) => prev.filter((h) => h.id !== hairdresserId));
  }

  if (authLoading) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto px-4 pt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 pt-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-50 flex items-center justify-center mb-4">
            <Heart size={28} className="text-neutral-300" />
          </div>
          <h2 className="font-bold text-neutral-900 mb-2">Vos favoris vous attendent</h2>
          <p className="text-sm text-neutral-400 mb-6 max-w-xs">
            Connectez-vous pour sauvegarder des profils et les retrouver ici.
          </p>
          <Link
            href="/connexion"
            className="flex items-center gap-2 bg-neutral-900 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-neutral-700 transition-colors"
          >
            <LogIn size={16} />
            Se connecter
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Favoris" backHref="/" />
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-8">

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-neutral-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : saved.length > 0 ? (
          <>
            <p className="text-sm text-neutral-400 mb-5">
              {saved.length} coiffeur{saved.length > 1 ? 's' : ''} sauvegardé{saved.length > 1 ? 's' : ''}
            </p>
            <div className="space-y-3">
              {saved.map((h) => (
                <div key={h.id} className="flex items-center gap-4 bg-white border border-neutral-100 rounded-2xl p-4 hover:border-neutral-200 transition-colors">
                  <Link href={`/coiffeur/${h.slug}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-100">
                      {resolveMediaUrl(h.user.avatar) ? (
                        <Image src={resolveMediaUrl(h.user.avatar)!} alt={h.user.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-neutral-200" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="font-semibold text-neutral-900 truncate">{h.user.name}</p>
                        {h.is_verified && <BadgeCheck size={14} className="text-neutral-400 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-400">
                        {h.city && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} />
                            {h.city}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star size={11} fill="currentColor" />
                          {h.avg_rating}
                        </span>
                      </div>
                      {h.specialties.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {h.specialties.slice(0, 3).map((s) => (
                            <span key={s.slug} className="text-[10px] font-medium tracking-wide uppercase bg-neutral-50 border border-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => handleUnsave(h.id)}
                    className="p-2 text-neutral-300 hover:text-neutral-700 transition-colors flex-shrink-0"
                    aria-label="Retirer des favoris"
                  >
                    <Heart size={18} fill="currentColor" className="text-neutral-900" />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-neutral-50 flex items-center justify-center mb-4">
              <Heart size={28} className="text-neutral-300" />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Aucun favori</h3>
            <p className="text-sm text-neutral-400 mb-6 max-w-xs">
              Sauvegardez des profils de coiffeurs pour les retrouver facilement.
            </p>
            <Link
              href="/rechercher"
              className="bg-neutral-900 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-neutral-700 transition-colors"
            >
              Découvrir des coiffeurs
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
