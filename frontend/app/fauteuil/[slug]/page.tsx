import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin, ChevronLeft, Users, ShieldCheck, ShieldAlert,
  Package, DoorOpen, ExternalLink, Calendar,
} from 'lucide-react';
import { resolveMediaUrl, CHAIR_SPACE_TYPES, CHAIR_EQUIPMENT_LABELS, type ApiChairRental } from '@/lib/types';
import ChairRequestPanel from '@/components/chairSearch/ChairRequestPanel';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

const DAY_LABELS: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' };

async function getRental(slug: string): Promise<ApiChairRental | null> {
  try {
    const res = await fetch(`${API_BASE}/chair-rentals/slug/${slug}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ChairRentalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rental = await getRental(slug);

  if (!rental) notFound();

  const spaceLabel = CHAIR_SPACE_TYPES.find((t) => t.value === rental.space_type)?.label;
  const photos = rental.photos ?? [];
  const salon = rental.salon;
  const team = salon?.hairdressers ?? [];

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Galerie */}
      <div className="relative">
        {photos.length > 0 ? (
          <div className="flex overflow-x-auto snap-x snap-mandatory">
            {photos.map((url, i) => (
              <div key={url} className="relative w-full flex-shrink-0 snap-center aspect-[4/3] bg-neutral-100">
                <Image src={resolveMediaUrl(url) ?? url} alt={`${rental.title} — photo ${i + 1}`} fill className="object-cover" sizes="100vw" priority={i === 0} />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full aspect-[4/3] bg-neutral-100 flex items-center justify-center text-neutral-300 text-sm">Aucune photo</div>
        )}
        <Link
          href="/pro/fauteuils-a-louer"
          className="absolute top-4 left-4 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
        >
          <ChevronLeft size={18} className="text-white" />
        </Link>
        {photos.length > 1 && (
          <span className="absolute bottom-3 right-3 bg-black/50 text-white text-[11px] font-semibold px-2 py-1 rounded-full">
            {photos.length} photos
          </span>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-5">
        {/* En-tête */}
        <div className="mb-5">
          {spaceLabel && <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400 mb-1">{spaceLabel}</p>}
          <h1 className="text-xl font-bold text-neutral-900">{rental.title}</h1>
          {rental.city && (
            <div className="flex items-center gap-1 text-sm text-neutral-500 mt-1">
              <MapPin size={13} />{rental.city}
            </div>
          )}
        </div>

        {/* Prix */}
        <div className="flex items-baseline gap-4 mb-6 pb-6 border-b border-neutral-100">
          {rental.price_per_day != null && (
            <div><span className="text-2xl font-bold text-neutral-900">{rental.price_per_day} €</span><span className="text-sm text-neutral-400"> /jour</span></div>
          )}
          {rental.price_per_week != null && <p className="text-sm text-neutral-500">{rental.price_per_week} €/semaine</p>}
          {rental.price_per_month != null && <p className="text-sm text-neutral-500">{rental.price_per_month} €/mois</p>}
        </div>

        {/* Description */}
        {rental.description && (
          <div className="mb-6 pb-6 border-b border-neutral-100">
            <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">{rental.description}</p>
          </div>
        )}

        {/* Équipements */}
        {rental.equipment && rental.equipment.length > 0 && (
          <div className="mb-6 pb-6 border-b border-neutral-100">
            <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Équipements</h2>
            <div className="flex flex-wrap gap-2">
              {rental.equipment.map((key) => (
                <span key={key} className="text-xs font-medium bg-neutral-50 border border-neutral-100 text-neutral-700 px-3 py-1.5 rounded-full">
                  {CHAIR_EQUIPMENT_LABELS[key]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Disponibilités */}
        {rental.available_days && rental.available_days.length > 0 && (
          <div className="mb-6 pb-6 border-b border-neutral-100">
            <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3 flex items-center gap-1.5">
              <Calendar size={12} />Disponibilités
            </h2>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <span key={d} className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  rental.available_days!.includes(d) ? 'bg-neutral-900 text-white' : 'bg-neutral-50 text-neutral-300'
                }`}>
                  {DAY_LABELS[d]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Conditions */}
        {(rental.conditions || rental.insurance_required || rental.products_policy || rental.access_instructions) && (
          <div className="mb-6 pb-6 border-b border-neutral-100 space-y-3">
            <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Conditions</h2>
            <div className="flex items-start gap-2.5 text-sm text-neutral-600">
              <ShieldCheck size={15} className="text-neutral-400 flex-shrink-0 mt-0.5" />
              <span>{rental.insurance_required ? 'Assurance professionnelle exigée.' : 'Assurance non exigée.'} {rental.insurance_notes}</span>
            </div>
            {rental.products_policy && (
              <div className="flex items-start gap-2.5 text-sm text-neutral-600">
                <Package size={15} className="text-neutral-400 flex-shrink-0 mt-0.5" />
                <span>{rental.products_policy}</span>
              </div>
            )}
            {rental.access_instructions && (
              <div className="flex items-start gap-2.5 text-sm text-neutral-600">
                <DoorOpen size={15} className="text-neutral-400 flex-shrink-0 mt-0.5" />
                <span>{rental.access_instructions}</span>
              </div>
            )}
            {rental.conditions && <p className="text-sm text-neutral-600 whitespace-pre-line">{rental.conditions}</p>}
            <div className="flex items-start gap-2.5 text-xs text-neutral-400 pt-1">
              <ShieldAlert size={13} className="flex-shrink-0 mt-0.5" />
              <span>Un SIRET vérifié est requis pour envoyer une demande — vérification automatique par CHAIR.</span>
            </div>
          </div>
        )}

        {/* Salon */}
        {salon && (
          <div className="mb-6 pb-6 border-b border-neutral-100">
            <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Le salon</h2>
            <Link href={`/app/salon/${salon.slug}`} target="_blank" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-xl bg-neutral-100 overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                {salon.logo ? (
                  <Image src={resolveMediaUrl(salon.logo) ?? salon.logo} alt="" fill className="object-cover" sizes="44px" />
                ) : (
                  <span className="text-lg font-bold text-neutral-300">{salon.name[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-900 group-hover:underline">{salon.name}</p>
                {team.length > 0 && (
                  <p className="text-xs text-neutral-400 flex items-center gap-1"><Users size={11} />{team.length} coiffeur{team.length > 1 ? 's' : ''}</p>
                )}
              </div>
              <ExternalLink size={14} className="text-neutral-300" />
            </Link>
          </div>
        )}
      </div>

      {/* CTA fixe */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-4 py-3 max-w-3xl mx-auto md:rounded-t-2xl md:shadow-2xl">
        <ChairRequestPanel rentalId={rental.id} rentalTitle={rental.title} />
      </div>
    </div>
  );
}
