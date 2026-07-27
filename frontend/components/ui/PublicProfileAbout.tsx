import Link from 'next/link';
import { GraduationCap, ShieldCheck, MapPin, Clock, BadgeCheck } from 'lucide-react';
import type { ApiHairdresserProfile } from '@/lib/types';

function InstagramIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.6 5.82c-1.02-.87-1.6-2.15-1.58-3.5h-3.16v13.4c0 1.6-1.3 2.9-2.9 2.9-1.6 0-2.9-1.3-2.9-2.9 0-1.6 1.3-2.9 2.9-2.9.3 0 .58.05.85.13V9.7a6.13 6.13 0 0 0-.85-.06 6.06 6.06 0 1 0 6.06 6.06V9.4a7.6 7.6 0 0 0 4.44 1.42V7.66c-1 0-1.98-.32-2.76-.94-.36-.28-.68-.6-.9-.9Z" />
    </svg>
  );
}

const AVAILABILITY_LABELS: Record<string, string> = {
  employed: 'En poste',
  looking_salon: 'Recherche un salon',
  looking_gig: 'Recherche des missions',
  not_available: 'Pas disponible',
};

interface Props {
  hairdresser: ApiHairdresserProfile;
}

export default function PublicProfileAbout({ hairdresser }: Props) {
  const bio = hairdresser.user.bio;
  const formations = (hairdresser.training_badges ?? []).filter((b) => b.category === 'formation');
  const certifications = (hairdresser.training_badges ?? []).filter((b) => b.category === 'certification');
  const availabilityLabel = hairdresser.work_availability ? AVAILABILITY_LABELS[hairdresser.work_availability] : null;

  return (
    <div className="px-4 md:px-0 space-y-6">

      {/* Bio complète */}
      {bio && (
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400 mb-2.5">À propos</p>
          <p className="text-[14px] text-neutral-600 leading-relaxed whitespace-pre-line">{bio}</p>
        </div>
      )}

      {/* Expérience */}
      {hairdresser.years_experience != null && hairdresser.years_experience > 0 && (
        <div className="flex items-center gap-2.5">
          <Clock size={15} className="text-neutral-400 flex-shrink-0" />
          <p className="text-[13px] text-neutral-600">
            <span className="font-semibold text-neutral-900">{hairdresser.years_experience} an{hairdresser.years_experience > 1 ? 's' : ''}</span> d&apos;expérience
          </p>
        </div>
      )}

      {/* Disponibilité professionnelle */}
      {availabilityLabel && (
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 flex-shrink-0" />
          <p className="text-[13px] text-neutral-600">{availabilityLabel}</p>
        </div>
      )}

      {/* Salon */}
      {hairdresser.salon && (
        <div className="flex items-center gap-2.5">
          <MapPin size={15} className="text-neutral-400 flex-shrink-0" />
          <Link href={`/app/salon/${hairdresser.salon.slug}`} className="text-[13px] text-neutral-600 hover:text-neutral-900 transition-colors">
            Chez <span className="font-semibold text-neutral-900">{hairdresser.salon.name}</span>
            {hairdresser.salon.city ? ` · ${hairdresser.salon.city}` : ''}
          </Link>
        </div>
      )}

      {/* Formations & certifications */}
      {(formations.length > 0 || certifications.length > 0) && (
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400 mb-2.5">Formations & certifications</p>
          <div className="space-y-2">
            {[...formations, ...certifications].map((b) => (
              <div key={b.id} className="flex items-center gap-2.5 bg-neutral-50 rounded-xl px-3.5 py-2.5">
                {b.category === 'certification'
                  ? <ShieldCheck size={15} className="text-neutral-400 flex-shrink-0" />
                  : <GraduationCap size={15} className="text-neutral-400 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-neutral-900 leading-tight">{b.name}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {b.institution}{b.pivot?.year ? ` · ${b.pivot.year}` : ''}
                  </p>
                </div>
                {!!b.pivot?.is_verified && (
                  <BadgeCheck size={14} className="text-neutral-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Réseaux */}
      {(hairdresser.instagram_url || hairdresser.tiktok_url) && (
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400 mb-2.5">Réseaux</p>
          <div className="flex items-center gap-2">
            {hairdresser.instagram_url && (
              <a
                href={hairdresser.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:border-neutral-400 transition-colors"
              >
                <InstagramIcon />
              </a>
            )}
            {hairdresser.tiktok_url && (
              <a
                href={hairdresser.tiktok_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:border-neutral-400 transition-colors"
              >
                <TikTokIcon />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Toutes les spécialités */}
      {hairdresser.specialties.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400 mb-2.5">Spécialités</p>
          <div className="flex flex-wrap gap-1.5">
            {hairdresser.specialties.map((s) => (
              <Link
                key={s.slug}
                href={`/app/recherche?specialty=${s.slug}`}
                className="text-[11px] font-semibold tracking-wide uppercase bg-neutral-900 text-white px-3 py-1.5 rounded-full hover:bg-neutral-700 transition-colors"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!bio && formations.length === 0 && certifications.length === 0 && !hairdresser.salon && (
        <p className="text-[13px] text-neutral-400">Profil en cours de complétion.</p>
      )}
    </div>
  );
}
