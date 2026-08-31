import Link from 'next/link';
import Image from 'next/image';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { MapPin, Briefcase, CheckCircle, Users } from 'lucide-react';
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

// ── Card offre de salon ─────────────────────────────────────────────────────
function OfferCard({ offer }: { offer: ApiJobOffer }) {
  const logoUrl = resolveMediaUrl((offer.salon as (typeof offer.salon & { logo?: string | null }))?.logo ?? null);
  const content = (
    <div className="flex items-start gap-3">
      {/* Logo salon */}
      <div className="w-11 h-11 rounded-xl bg-neutral-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {logoUrl ? (
          <Image src={logoUrl} alt={offer.salon?.name ?? ''} width={44} height={44} className="object-cover" />
        ) : (
          <span className="text-base font-bold text-neutral-500">
            {offer.salon?.name?.[0] ?? 'S'}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-[14px] font-bold text-neutral-900 truncate">{offer.title}</h3>
        {offer.salon && (
          <p className="text-[12px] text-neutral-500 truncate">{offer.salon.name}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <Badge tone="dark">{CONTRACT_LABELS[offer.contract_type] ?? offer.contract_type}</Badge>
          <Badge tone="neutral">{JOB_TYPE_LABELS[offer.job_type] ?? offer.job_type}</Badge>
          {offer.city && (
            <span className="flex items-center gap-0.5 text-[11px] text-neutral-400">
              <MapPin size={10} />{offer.city}
            </span>
          )}
        </div>

        {offer.description && (
          <p className="text-[12.5px] text-neutral-500 mt-2 leading-relaxed line-clamp-2">{offer.description}</p>
        )}
      </div>
    </div>
  );

  if (offer.salon?.slug) {
    return (
      <Link
        href={`/app/salon/${offer.salon.slug}`}
        className="block bg-white rounded-2xl border border-neutral-100 p-4 hover:border-neutral-300 active:scale-[0.98] transition-all"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-4">
      {content}
    </div>
  );
}

// ── Card coiffeur disponible ─────────────────────────────────────────────────
function HairdresserCard({ h }: { h: ApiHairdresserProfile }) {
  const avatarUrl = resolveMediaUrl(h.user?.avatar ?? null);
  const availability = AVAILABILITY_LABELS[h.work_availability ?? ''] ?? '';

  return (
    <Link
      href={`/app/coiffeur/${h.slug}`}
      className="bg-white rounded-2xl border border-neutral-100 p-3 hover:border-neutral-300 active:scale-[0.98] transition-all"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={40} height={40} className="object-cover" />
          ) : (
            <span className="text-sm font-bold text-neutral-400">{h.user?.name?.[0]}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-neutral-900 truncate">{h.user?.name}</p>
          {h.city && (
            <p className="text-[10px] text-neutral-400 flex items-center gap-0.5 truncate">
              <MapPin size={8} />{h.city}
            </p>
          )}
        </div>
      </div>
      {availability && (
        <Badge tone="dark">
          <CheckCircle size={8} className="mr-1" />
          {availability}
        </Badge>
      )}
      {h.specialties?.length > 0 && (
        <p className="text-[10px] text-neutral-400 mt-1.5 truncate">
          {h.specialties.slice(0, 2).map((s) => s.name).join(' · ')}
        </p>
      )}
    </Link>
  );
}

export default async function RecrutementPage() {
  const [offers, hairdressers] = await Promise.all([
    getJobOffers(),
    getLookingHairdressers(),
  ]);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto pb-24 px-4">

        {/* Header */}
        <div className="pt-4">
          <PageHeader title="Recrutement" backHref="/app" />
          <p className="text-[13px] text-neutral-400 -mt-1 mb-4">
            Offres de salon et coiffeurs disponibles
          </p>
        </div>

        {/* Offres de salons */}
        <section className="mb-8">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-neutral-400 mb-3">
            Offres des salons ({offers.length})
          </p>

          {offers.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="Aucune offre pour le moment"
              subtitle="Les nouvelles offres de recrutement des salons apparaîtront ici."
              compact
            />
          ) : (
            <div className="space-y-2.5">
              {offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          )}
        </section>

        {/* Coiffeurs disponibles */}
        <section>
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-neutral-400 mb-3">
            Coiffeurs disponibles ({hairdressers.length})
          </p>

          {hairdressers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucun coiffeur disponible"
              subtitle="Les coiffeurs en recherche d'opportunités apparaîtront ici."
              compact
            />
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {hairdressers.map((h) => (
                <HairdresserCard key={h.id} h={h} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
