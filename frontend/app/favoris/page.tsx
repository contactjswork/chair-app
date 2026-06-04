'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { interactions, type SavedHairdresser } from '@/lib/api';
import { Heart, MapPin, Star, BadgeCheck, LogIn, Bookmark, ImageIcon } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/types';
import PageHeader from '@/components/layout/PageHeader';

// ── Card ─────────────────────────────────────────────────────────────────────
function FavoriteCard({
  h,
  onUnsave,
}: {
  h: SavedHairdresser;
  onUnsave: (id: number) => void;
}) {
  const banner = resolveMediaUrl(h.banner_image);
  const avatar = resolveMediaUrl(h.user.avatar);
  const initial = h.user.name.charAt(0).toUpperCase();
  const rating = parseFloat(h.avg_rating);

  return (
    <div className="relative group aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900">
      {/* Bannière fond */}
      {banner ? (
        <Image
          src={banner}
          alt={h.user.name}
          fill
          className="object-cover opacity-70 group-hover:opacity-80 transition-opacity duration-300"
          sizes="(max-width: 768px) 50vw, 33vw"
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center">
          <ImageIcon size={32} className="text-white/10" />
        </div>
      )}

      {/* Gradient overlay bas */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Bouton retirer */}
      <button
        onClick={() => onUnsave(h.id)}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all"
        aria-label="Retirer des favoris"
      >
        <Bookmark size={14} fill="currentColor" />
      </button>

      {/* Badge vérifié */}
      {h.is_verified && (
        <div className="absolute top-3 left-3 z-10">
          <BadgeCheck size={16} className="text-white/90" />
        </div>
      )}

      {/* Contenu bas */}
      <Link href={`/coiffeur/${h.slug}`} className="absolute inset-0 flex flex-col justify-end p-3.5">
        {/* Avatar + nom */}
        <div className="flex items-end gap-2.5 mb-2">
          <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/60 flex-shrink-0 bg-neutral-700">
            {avatar ? (
              <Image src={avatar} alt={h.user.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                {initial}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate leading-tight">{h.user.name}</p>
            {h.tagline && (
              <p className="text-[10px] text-white/60 truncate leading-tight mt-0.5">{h.tagline}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2.5 mb-2">
          {h.reviews_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-white">
              <Star size={10} fill="currentColor" className="text-white/80" />
              {rating.toFixed(1)}
            </span>
          )}
          {h.city && (
            <span className="flex items-center gap-1 text-[11px] text-white/60 truncate">
              <MapPin size={9} />
              {h.city}
            </span>
          )}
          {h.posts_count > 0 && (
            <span className="text-[11px] text-white/50 ml-auto flex-shrink-0">
              {h.posts_count} réal.
            </span>
          )}
        </div>

        {/* Spécialités */}
        {h.specialties.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {h.specialties.slice(0, 2).map((s) => (
              <span
                key={s.slug}
                className="text-[9px] font-semibold tracking-[0.15em] uppercase bg-white/10 backdrop-blur-sm text-white/80 px-2 py-0.5 rounded-full border border-white/10"
              >
                {s.name}
              </span>
            ))}
            {h.specialties.length > 2 && (
              <span className="text-[9px] text-white/40">+{h.specialties.length - 2}</span>
            )}
          </div>
        )}
      </Link>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="aspect-[3/4] rounded-2xl bg-neutral-100 animate-pulse" />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
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

  function handleUnsave(hairdresserId: number) {
    interactions.unsave(hairdresserId).catch(() => {});
    setSaved((prev) => prev.filter((h) => h.id !== hairdresserId));
  }

  // Auth loading
  if (authLoading) {
    return (
      <AppShell>
        <PageHeader title="Favoris" backHref="/" />
        <div className="px-4 pt-6 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      </AppShell>
    );
  }

  // Non connecté
  if (!user) {
    return (
      <AppShell>
        <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-5">
            <Heart size={32} className="text-neutral-300" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 mb-2">Vos favoris vous attendent</h2>
          <p className="text-sm text-neutral-400 mb-7 max-w-xs leading-relaxed">
            Connectez-vous pour sauvegarder vos coiffeurs préférés et les retrouver en un coup d&apos;œil.
          </p>
          <Link
            href="/connexion"
            className="flex items-center gap-2 bg-neutral-900 text-white text-sm font-semibold px-6 py-3.5 rounded-xl hover:bg-neutral-700 transition-colors"
          >
            <LogIn size={15} />
            Se connecter
          </Link>
          <Link href="/inscription" className="mt-3 text-sm text-neutral-400 hover:text-neutral-600 transition-colors">
            Créer un compte
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Favoris" backHref="/" />

      <div className="px-4 md:px-6 pt-5 pb-8 max-w-2xl mx-auto">

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : saved.length > 0 ? (
          <>
            {/* Compteur */}
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-4">
              {saved.length} coiffeur{saved.length > 1 ? 's' : ''} sauvegardé{saved.length > 1 ? 's' : ''}
            </p>

            {/* Grille portrait */}
            <div className="grid grid-cols-2 gap-3">
              {saved.map((h) => (
                <FavoriteCard key={h.id} h={h} onUnsave={handleUnsave} />
              ))}
            </div>

            {/* CTA bas */}
            <div className="mt-8 text-center">
              <Link
                href="/rechercher"
                className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors underline underline-offset-4"
              >
                Découvrir d&apos;autres coiffeurs
              </Link>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-5">
              <Heart size={32} className="text-neutral-300" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 mb-2">Aucun favori pour l&apos;instant</h3>
            <p className="text-sm text-neutral-400 mb-7 max-w-xs leading-relaxed">
              Sauvegardez des profils de coiffeurs pour les retrouver facilement ici.
            </p>
            <Link
              href="/rechercher"
              className="bg-neutral-900 text-white text-sm font-semibold px-6 py-3.5 rounded-xl hover:bg-neutral-700 transition-colors"
            >
              Découvrir des coiffeurs
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
