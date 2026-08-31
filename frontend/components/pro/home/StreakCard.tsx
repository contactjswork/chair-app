'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { streak as streakApi } from '@/lib/api';
import type { ApiStreak } from '@/lib/types';

/**
 * La série d'activité.
 *
 * La flamme marchait déjà : c'est le signe le plus lisible qui soit, et tout
 * le monde le comprend sans notice. Ce qui manquait, c'est ce que la flamme
 * ne peut pas dire à elle seule — où on en est dans la semaine, et ce qu'on
 * risque de perdre.
 *
 * D'où la bande des sept jours. Voir six points remplis et un vide un
 * dimanche soir fait plus pour ramener quelqu'un demain qu'un compteur nu.
 * C'est le seul endroit de l'écran où l'on force un peu — et encore, en
 * disant la vérité : la série est réellement en jeu aujourd'hui.
 *
 * On ne culpabilise pas une série cassée. Repartir de zéro est déjà assez
 * désagréable ; l'app dit simplement comment la relancer.
 */

const INITIALES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/** Rail creuse : le jour non tenu se lit comme un sillon vide, pas comme une barre grise. */
const CREUX_RAIL = 'shadow-[inset_0_1px_2px_rgba(10,10,10,0.08)]';

export default function StreakCard() {
  const [data, setData] = useState<ApiStreak | null>(null);
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    let annule = false;
    streakApi
      .get()
      .then((d) => { if (!annule) setData(d as ApiStreak); })
      .catch(() => { if (!annule) setEchec(true); });
    return () => { annule = true; };
  }, []);

  // Une carte qui n'a rien à dire ne prend pas de place.
  if (echec || !data) return null;

  const courante = data.current_streak;
  const record = data.longest_streak;
  const actifAujourdhui = data.is_active_today;

  // Les sept derniers jours, du plus ancien a aujourd'hui.
  const aujourdhui = new Date();
  const fenetre = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(aujourdhui);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  return (
    <Link
      href="/pro/badges"
      className="block rounded-[28px] bg-white ring-1 ring-neutral-100 shadow-[0_1px_2px_rgba(10,10,10,0.04),0_10px_26px_-14px_rgba(10,10,10,0.14)] p-5 active:scale-[0.985] transition-transform duration-200"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Série</p>

      <div className="flex items-baseline gap-2.5 mt-3">
        <Flame
          size={30}
          className={
            actifAujourdhui
              ? 'text-orange-500 fill-orange-500 drop-shadow-[0_2px_8px_rgba(249,115,22,0.45)]'
              : 'text-neutral-300'
          }
          strokeWidth={2}
        />
        <span className="text-[44px] font-bold leading-none tracking-[-0.03em] tabular-nums text-neutral-900">
          {courante}
        </span>
        <span className="text-[15px] text-neutral-500">{courante > 1 ? 'jours' : 'jour'}</span>
      </div>

      {/* Les sept jours de la semaine. Le jour courant est cerclé : on voit
          immédiatement s'il reste quelque chose à faire avant ce soir. */}
      <div className="flex items-center gap-1.5 mt-4">
        {fenetre.map((jour, i) => {
          // La série se termine aujourd'hui si le coiffeur a déjà été actif,
          // sinon hier. Un jour de la fenêtre est tenu s'il tombe dans les
          // `courante` jours qui précèdent cette fin, bornes comprises.
          const finSerie = actifAujourdhui ? 6 : 5;
          const recul = finSerie - i;
          const tenu = recul >= 0 && recul < courante;
          const estAujourdhui = i === 6;
          const lettre = INITIALES[jour.getDay()];
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full h-2 rounded-full ${tenu ? 'bg-orange-500 shadow-[0_1px_4px_rgba(249,115,22,0.5)]' : 'bg-neutral-100 ' + CREUX_RAIL}`}
              />
              <span
                className={`text-[10px] font-semibold tabular-nums ${
                  estAujourdhui ? 'text-neutral-900' : 'text-neutral-400'
                }`}
              >
                {lettre}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[13px] text-neutral-500 mt-3.5 leading-relaxed">
        {courante === 0
          ? 'Publiez une réalisation ou confirmez un passage pour lancer une série.'
          : actifAujourdhui
            ? record > courante
              ? `Record : ${record} jours. Il reste ${record - courante} ${record - courante > 1 ? 'jours' : 'jour'} pour l'égaler.`
              : 'Vous êtes à votre record. Chaque jour compte double.'
            : 'La série est en jeu aujourd’hui.'}
      </p>
    </Link>
  );
}
