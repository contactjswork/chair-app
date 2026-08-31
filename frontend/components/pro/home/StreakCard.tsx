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

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

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

  // Position du jour dans la semaine, lundi = 0.
  const jourSemaine = (new Date().getDay() + 6) % 7;

  return (
    <Link
      href="/pro/badges"
      className="block rounded-[24px] border border-neutral-100 p-5 active:bg-neutral-50 transition-colors"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Série</p>

      <div className="flex items-baseline gap-2.5 mt-3">
        <Flame
          size={30}
          className={actifAujourdhui ? 'text-orange-500 fill-orange-500' : 'text-neutral-300'}
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
        {JOURS.map((lettre, i) => {
          // La série se termine aujourd'hui si le coiffeur a déjà été actif,
          // sinon hier. Un jour de la semaine est tenu s'il tombe dans les
          // `courante` jours qui précèdent cette fin, bornes comprises.
          // On ne remonte pas avant lundi : cette bande montre la semaine en
          // cours, pas tout l'historique.
          const dernierActif = actifAujourdhui ? jourSemaine : jourSemaine - 1;
          const recul = dernierActif - i;
          const tenu = recul >= 0 && recul < courante;
          const estAujourdhui = i === jourSemaine;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full h-1.5 rounded-full ${tenu ? 'bg-orange-500' : 'bg-neutral-100'}`}
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
