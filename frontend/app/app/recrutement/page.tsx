import Link from 'next/link';
import Image from 'next/image';
import AppShell from '@/components/layout/AppShell';
import { MapPin, Briefcase, CheckCircle, ChevronLeft } from 'lucide-react';
import type { ApiJobOffer, ApiHairdresserProfile, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

async function getJobOffers(): Promise<ApiJobOffer[]> {
  try {
    const res = await fetch(`${API}/job-offers?per_page=50`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data: PaginatedResponse<ApiJobOffer> = await res.json();
    return data.data;
  } catch { return []; }
}

async function getLookingHairdressers(): Promise<ApiHairdresserProfile[]> {
  try {
    const res = await fetch(`${API}/hairdressers?looking=true&per_page=30`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data: PaginatedResponse<ApiHairdresserProfile> = await res.json();
    return data.data;
  } catch { return []; }
}

const JOB_TYPE_LABELS: Record<string, string> = {
  hairdresser: 'Coiffeur(se)',
  colorist:    'Coloriste',
  barber:      'Barbier',
  stylist:     'Styliste',
  apprentice:  'Apprenti(e)',
  other:       'Autre',
};

const CONTRACT_LABELS: Record<string, string> = {
  cdi:         'CDI',
  cdd:         'CDD',
  alternance:  'Alternance',
  freelance:   'Freelance',
};

const AVAILABILITY_LABELS: Record<string, string> = {
  looking_salon: 'Recherche un salon',
  looking_gig:   'Recherche des missions',
};

export default async function RecrutementPage() {
  const [offers, hairdressers] = await Promise.all([
    getJobOffers(),
    getLookingHairdressers(),
  ]);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto pb-24 px-4">

        {/* Header */}
        <div className="py-6 mb-2">
          <Link href="/" className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 mb-4 transition-colors md:hidden">
            <ChevronLeft size={14} />
            Retour
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900">Recrutement</h1>
          <p className="text-sm text-neutral-500 mt-1">Offres de salon et coiffeurs disponibles</p>
        </div>

        {/* Offres de salons */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
              Offres des salons ({offers.length})
            </h2>
          </div>

          {offers.length === 0 ? (
            <div className="bg-neutral-50 rounded-2xl p-8 text-center">
              <Briefcase size={28} className="text-neutral-300 mx-auto mb-3" />
              <p className="text-sm text-neutral-400">Aucune offre de recrutement pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => {
                const logoUrl = resolveMediaUrl((offer.salon as (typeof offer.salon & { logo?: string | null }))?.logo ?? null);
                return (
                  <div key={offer.id} className="bg-white rounded-2xl border border-neutral-100 p-4 hover:border-neutral-300 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Logo salon */}
                      <div className="w-11 h-11 rounded-xl bg-neutral-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {logoUrl ? (
                          <Image src={logoUrl} alt={offer.salon?.name ?? ''} width={44} height={44} className="object-cover" />
                        ) : (
                          <span className="text-base font-bold text-neutral-300">
                            {offer.salon?.name?.[0] ?? 'S'}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-neutral-900 truncate">{offer.title}</h3>
                        {offer.salon && (
                          <Link href={`/salon/${offer.salon.slug}`} className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors">
                            {offer.salon.name}
                          </Link>
                        )}

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide bg-neutral-900 text-white px-2 py-0.5 rounded-full">
                            {CONTRACT_LABELS[offer.contract_type] ?? offer.contract_type}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                            {JOB_TYPE_LABELS[offer.job_type] ?? offer.job_type}
                          </span>
                          {offer.city && (
                            <span className="flex items-center gap-0.5 text-[10px] text-neutral-400">
                              <MapPin size={9} />{offer.city}
                            </span>
                          )}
                        </div>

                        {offer.description && (
                          <p className="text-xs text-neutral-500 mt-2 leading-relaxed line-clamp-2">{offer.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Coiffeurs disponibles */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
              Coiffeurs disponibles ({hairdressers.length})
            </h2>
          </div>

          {hairdressers.length === 0 ? (
            <div className="bg-neutral-50 rounded-2xl p-8 text-center">
              <p className="text-sm text-neutral-400">Aucun coiffeur en recherche d'opportunités pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {hairdressers.map((h) => {
                const avatarUrl  = resolveMediaUrl(h.user?.avatar ?? null);
                const availability = AVAILABILITY_LABELS[h.work_availability ?? ''] ?? '';
                return (
                  <Link key={h.id} href={`/coiffeur/${h.slug}`}
                    className="bg-white rounded-2xl border border-neutral-100 p-3 hover:border-neutral-300 transition-colors group">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {avatarUrl ? (
                          <Image src={avatarUrl} alt="" width={40} height={40} className="object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-neutral-400">{h.user?.name?.[0]}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{h.user?.name}</p>
                        {h.city && (
                          <p className="text-[10px] text-neutral-400 flex items-center gap-0.5 truncate">
                            <MapPin size={8} />{h.city}
                          </p>
                        )}
                      </div>
                    </div>
                    {availability && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide bg-neutral-900 text-white px-2 py-0.5 rounded-full">
                        <CheckCircle size={8} />
                        {availability}
                      </span>
                    )}
                    {h.specialties?.length > 0 && (
                      <p className="text-[10px] text-neutral-400 mt-1.5 truncate">
                        {h.specialties.slice(0, 2).map((s) => s.name).join(' · ')}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
