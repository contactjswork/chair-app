import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, Globe, ChevronLeft, Users, Star, CheckCircle } from 'lucide-react';
import { resolveMediaUrl, type ApiSalonFull } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

async function getSalon(slug: string): Promise<ApiSalonFull | null> {
  try {
    const res = await fetch(`${API_BASE}/salons/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function SalonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salon = await getSalon(slug);

  if (!salon) notFound();

  const coverUrl = resolveMediaUrl(salon.cover_image);
  const logoUrl  = resolveMediaUrl(salon.logo);
  const hairdressers = salon.hairdressers ?? [];

  return (
    <div className="min-h-screen bg-white">
      {/* Bannière */}
      <div className="relative h-48 md:h-64 bg-neutral-800 overflow-hidden">
        {coverUrl ? (
          <Image src={coverUrl} alt={salon.name} fill className="object-cover" sizes="100vw" priority />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 to-neutral-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Back */}
        <Link
          href="/"
          className="absolute top-4 left-4 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center md:hidden"
        >
          <ChevronLeft size={18} className="text-white" />
        </Link>
      </div>

      {/* Header identité */}
      <div className="max-w-3xl mx-auto px-4">
        <div className="relative -mt-10 mb-4 flex items-end gap-4">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl border-4 border-white bg-neutral-100 overflow-hidden flex-shrink-0 shadow-sm">
            {logoUrl ? (
              <Image src={logoUrl} alt={salon.name} width={80} height={80} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
                <span className="text-2xl font-bold text-neutral-400">{salon.name[0]}</span>
              </div>
            )}
          </div>
          <div className="pb-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900">{salon.name}</h1>
              {salon.is_verified && (
                <CheckCircle size={16} className="text-neutral-900 fill-neutral-900" />
              )}
            </div>
            {salon.city && (
              <div className="flex items-center gap-1 text-sm text-neutral-500 mt-0.5">
                <MapPin size={12} />
                {salon.city}
              </div>
            )}
          </div>
        </div>

        {/* Stats rapides */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-neutral-100">
          <div className="text-center">
            <p className="text-xl font-bold text-neutral-900">{hairdressers.length}</p>
            <p className="text-[11px] text-neutral-400 uppercase tracking-wide">Coiffeur{hairdressers.length > 1 ? 's' : ''}</p>
          </div>
          {hairdressers.length > 0 && (() => {
            const totalRating = hairdressers.reduce((sum, h) => sum + parseFloat(h.avg_rating ?? '0'), 0);
            const avgRating = hairdressers.length > 0 ? (totalRating / hairdressers.length).toFixed(1) : '—';
            const totalReviews = hairdressers.reduce((sum, h) => sum + (h.reviews_count ?? 0), 0);
            return (
              <>
                <div className="w-px h-8 bg-neutral-100" />
                <div className="text-center">
                  <p className="text-xl font-bold text-neutral-900">{avgRating}</p>
                  <p className="text-[11px] text-neutral-400 uppercase tracking-wide">Note</p>
                </div>
                <div className="w-px h-8 bg-neutral-100" />
                <div className="text-center">
                  <p className="text-xl font-bold text-neutral-900">{totalReviews}</p>
                  <p className="text-[11px] text-neutral-400 uppercase tracking-wide">Avis</p>
                </div>
              </>
            );
          })()}
        </div>

        {/* Description */}
        {salon.description && (
          <div className="mb-5">
            <p className="text-sm text-neutral-600 leading-relaxed">{salon.description}</p>
          </div>
        )}

        {/* Infos pratiques */}
        <div className="bg-neutral-50 rounded-2xl p-4 mb-6 space-y-2.5">
          {salon.address && (
            <div className="flex items-start gap-3">
              <MapPin size={15} className="text-neutral-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-neutral-700">{salon.address}{salon.city ? `, ${salon.city}` : ''}{salon.postal_code ? ` ${salon.postal_code}` : ''}</span>
            </div>
          )}
          {salon.phone && (
            <a href={`tel:${salon.phone}`} className="flex items-center gap-3 hover:text-neutral-900 transition-colors group">
              <Phone size={15} className="text-neutral-400 flex-shrink-0" />
              <span className="text-sm text-neutral-700 group-hover:underline">{salon.phone}</span>
            </a>
          )}
          {salon.website && (
            <a href={salon.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-neutral-900 transition-colors group">
              <Globe size={15} className="text-neutral-400 flex-shrink-0" />
              <span className="text-sm text-neutral-700 truncate group-hover:underline">{salon.website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
          {salon.instagram_url && (
            <a href={salon.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-neutral-900 transition-colors group">
              <Globe size={15} className="text-neutral-400 flex-shrink-0" />
              <span className="text-sm text-neutral-700 group-hover:underline">Instagram</span>
            </a>
          )}
        </div>

        {/* Équipe */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-neutral-400" />
            <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Notre équipe</h2>
          </div>

          {hairdressers.length === 0 ? (
            <div className="text-center py-10 text-neutral-400 text-sm">
              Aucun coiffeur dans ce salon pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {hairdressers.map((h) => {
                const avatarUrl = resolveMediaUrl(h.user?.avatar);
                const bannerUrl = resolveMediaUrl(h.banner_image);
                const firstName = h.user?.name?.split(' ')[0] ?? '';

                return (
                  <Link
                    key={h.id}
                    href={`/coiffeur/${h.slug}`}
                    className="group block rounded-2xl overflow-hidden border border-neutral-100 hover:border-neutral-300 transition-all hover:shadow-sm"
                  >
                    {/* Photo */}
                    <div className="relative aspect-square bg-neutral-100 overflow-hidden">
                      {bannerUrl ? (
                        <Image src={bannerUrl} alt={h.user?.name ?? ''} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="200px" />
                      ) : (
                        <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
                          <span className="text-3xl font-bold text-neutral-300">{firstName[0]}</span>
                        </div>
                      )}
                      {/* Avatar overlay */}
                      {avatarUrl && (
                        <div className="absolute bottom-2 left-2 w-8 h-8 rounded-full border-2 border-white overflow-hidden shadow-sm">
                          <Image src={avatarUrl} alt="" fill className="object-cover" sizes="32px" />
                        </div>
                      )}
                    </div>
                    {/* Infos */}
                    <div className="p-3">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{h.user?.name}</p>
                      {h.reviews_count > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star size={10} className="text-neutral-400 fill-neutral-400" />
                          <span className="text-[11px] text-neutral-500">{parseFloat(h.avg_rating).toFixed(1)}</span>
                          <span className="text-[11px] text-neutral-400">({h.reviews_count})</span>
                        </div>
                      )}
                      {h.specialties && h.specialties.length > 0 && (
                        <p className="text-[10px] text-neutral-400 mt-1 truncate">
                          {h.specialties.slice(0, 2).map((s) => s.name).join(', ')}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
