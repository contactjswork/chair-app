'use client';

import Link from 'next/link';
import { ChevronRight, TrendingUp } from 'lucide-react';
import type { ApiSpecialtyHighlight } from '@/lib/types';

/**
 * « Où je me situe » — la première chose que voit un coiffeur en ouvrant l'app.
 *
 * Auparavant il lisait « Novice ». Un mot qui ne dit rien : ni où il en est,
 * ni par rapport à qui, ni ce qui le ferait progresser. Un coiffeur ne se
 * compare pas à une échelle abstraite, il se compare aux confrères de sa
 * ville sur le métier qu'il fait.
 *
 * D'où le chiffre unique et dominant : son rang, dans sa spécialité, dans sa
 * ville. « 3e sur 12 en Coupe Homme à Haguenau » se comprend d'un coup d'œil.
 *
 * Deux règles d'honnêteté, sans lesquelles ce genre d'écran se retourne
 * contre celui qui le regarde :
 *
 * 1. Le total est TOUJOURS affiché. « Top 3 » sans son « sur 4 » impressionne
 *    une seconde et décrédibilise pour longtemps, le jour où le coiffeur
 *    comprend qu'ils n'étaient que quatre.
 * 2. Quand il est déjà premier, on ne fabrique pas un objectif qui n'existe
 *    pas. On dit ce qu'il en est, et le cap devient de tenir la place.
 */

interface Props {
  highlights: ApiSpecialtyHighlight[];
  city: string | null;
}

export default function RankCard({ highlights, city }: Props) {
  const classees = highlights.filter((h) => h.local_rank != null && h.local_total != null);

  // Rien à montrer : on n'affiche pas une carte vide, mais on ne laisse pas
  // non plus le coiffeur sans direction — il faut des visites vérifiées pour
  // entrer dans un classement, autant le dire.
  if (classees.length === 0) {
    return (
      <Link
        href="/pro/mon-qr"
        className="block rounded-[28px] bg-neutral-900 bg-[radial-gradient(120%_100%_at_50%_0%,#1f1f21_0%,#0a0a0a_62%)] text-white p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_4px_-2px_rgba(10,10,10,0.4),0_16px_40px_-18px_rgba(10,10,10,0.55)] active:scale-[0.985] transition-transform duration-200"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Classement</p>
        <p className="text-[19px] font-bold leading-snug mt-3">
          Pas encore classé{city ? ` à ${city}` : ''}
        </p>
        <p className="text-[13px] text-white/50 leading-relaxed mt-2">
          Le classement se construit sur les passages confirmés par vos clients.
          Faites scanner votre QR code en fin de prestation pour y entrer.
        </p>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-white mt-4">
          Voir mon QR code <ChevronRight size={15} />
        </span>
      </Link>
    );
  }

  const [premier, ...autres] = classees;

  return (
    <div className="space-y-2">
      <Link
        href="/pro/classements"
        className="block rounded-[28px] bg-neutral-900 bg-[radial-gradient(120%_100%_at_50%_0%,#1f1f21_0%,#0a0a0a_62%)] text-white p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_4px_-2px_rgba(10,10,10,0.4),0_16px_40px_-18px_rgba(10,10,10,0.55)] active:scale-[0.985] transition-transform duration-200"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            {city ? `Votre place à ${city}` : 'Votre place'}
          </p>
          {premier.fast_progress && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/70">
              <TrendingUp size={12} />En progression
            </span>
          )}
        </div>

        {/* Le rang porte tout l'écran. Chiffres tabulaires : la ligne ne doit
            pas bouger d'un pixel quand on passe de 9e à 10e. */}
        <p className="text-[68px] font-bold leading-[0.9] tracking-[-0.045em] tabular-nums mt-3">
          {premier.local_rank}
          <span className="text-[26px] align-super">{suffixe(premier.local_rank!)}</span>
        </p>

        <p className="text-[17px] font-semibold mt-1">{premier.specialty_name}</p>
        <p className="text-[13px] text-white/45 tabular-nums mt-0.5">
          sur {premier.local_total} coiffeur{premier.local_total! > 1 ? 's' : ''} classé{premier.local_total! > 1 ? 's' : ''}
        </p>

        <Ecart rank={premier.local_rank!} pointsToNext={premier.points_to_next ?? null} />
      </Link>

      {/* Les autres spécialités, en lignes serrées : on ne répète pas la
          grosse carte cinq fois, sinon plus rien ne domine. */}
      {autres.length > 0 && (
        <div className="rounded-[22px] bg-white ring-1 ring-neutral-100 shadow-[0_1px_2px_rgba(10,10,10,0.04),0_10px_26px_-14px_rgba(10,10,10,0.14)] divide-y divide-neutral-50 overflow-hidden">
          {autres.map((h) => (
            <Link
              key={h.specialty_id}
              href="/pro/classements"
              className="flex items-center gap-3 px-4 min-h-[52px] py-2.5 active:bg-neutral-50 transition-colors"
            >
              <span className="text-[17px] font-bold text-neutral-900 tabular-nums w-9 shrink-0">
                {h.local_rank}
                <span className="text-[11px] align-super">{suffixe(h.local_rank!)}</span>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-semibold text-neutral-900 truncate">{h.specialty_name}</span>
                <span className="block text-[12px] text-neutral-500 tabular-nums">
                  sur {h.local_total}
                  {h.points_to_next != null && h.points_to_next > 0 && ` · ${h.points_to_next} pts du rang au-dessus`}
                </span>
              </span>
              <ChevronRight size={16} className="text-neutral-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * L'écart au rang supérieur : c'est lui qui donne envie de revenir.
 * Mais on ne l'invente pas — quand il n'y a personne devant, on le dit.
 */
function Ecart({ rank, pointsToNext }: { rank: number; pointsToNext: number | null }) {
  if (rank === 1) {
    return (
      <p className="text-[13px] text-white/50 mt-4 leading-relaxed">
        Vous êtes en tête. Chaque passage confirmé consolide la place.
      </p>
    );
  }
  if (pointsToNext == null || pointsToNext <= 0) {
    return (
      <p className="text-[13px] text-white/50 mt-4 leading-relaxed">
        Chaque passage confirmé et chaque avis vous rapprochent du rang au-dessus.
      </p>
    );
  }
  return (
    <p className="text-[13px] text-white/70 mt-4 leading-relaxed">
      <span className="font-bold text-white tabular-nums">{pointsToNext} points</span> pour passer{' '}
      {rank - 1}
      {suffixe(rank - 1)}
    </p>
  );
}

function suffixe(rang: number): string {
  return rang === 1 ? 'er' : 'e';
}
