'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Eye, Share2 } from 'lucide-react';
import ShareSheet from '@/components/ui/ShareSheet';
import { getSharePayload } from '@/lib/share';
import type { ApiStats } from '@/lib/types';
import { CARTE, MICRO_TITRE } from '@/lib/proStyle';

/**
 * Ce que CHAIR lui rapporte, mesuré honnêtement.
 *
 * La carte précédente affichait « 0 · 0 · 0 € » — trois zéros alignés en
 * gros, juste après « Profil complété à 80 % ». Le message était double, et
 * mauvais : tu n'as rien fait, et tu ne gagnes rien.
 *
 * Le « 0 € estimé » était en plus FAUX. CHAIR ne voit que les rendez-vous
 * pris dans l'app : un coiffeur qui fait 3 000 € par mois en salon lisait
 * « 0 € » sur son écran d'accueil. Le chiffre d'affaires revient à
 * /pro/business, où il peut être expliqué ; il n'a rien à faire ici sans
 * son contexte.
 *
 * À la place, les signaux qui bougent réellement pour un débutant : combien
 * de personnes ont vu son profil, combien le suivent, ce qu'on a pensé de
 * lui. Ce sont aussi les seuls que CHAIR mesure de bout en bout, donc les
 * seuls qu'on puisse afficher sans mentir.
 *
 * Quand tout est à zéro, on ne montre pas trois zéros : on dit quoi faire.
 */

interface Props {
  stats: ApiStats;
  /** Slug du profil public — pour aller voir ce que le client voit. */
  slug?: string | null;
  /** Prénom du coiffeur, pour personnaliser le message d'invitation. */
  name?: string | null;
}

export default function VisibilityCard({ stats, slug, name }: Props) {
  const [inviteOuvert, setInviteOuvert] = useState(false);
  const vues = stats.profile_views_count ?? 0;
  const abonnes = stats.followers_count ?? 0;
  const avis = stats.reviews_count ?? 0;
  const note = parseFloat(stats.avg_rating ?? '0');

  const rienEncore = vues === 0 && abonnes === 0 && avis === 0;

  return (
    <div className={`${CARTE} overflow-hidden`}>
      <Link href="/pro/business" className="block p-5 active:bg-neutral-50 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <p className={MICRO_TITRE}>Ma visibilité</p>
          <ChevronRight size={16} className="text-neutral-300 shrink-0" />
        </div>

        {rienEncore ? (
          <p className="text-[15px] text-neutral-500 mt-3 leading-relaxed">
            Personne n&apos;a encore vu votre profil. Partagez-le à vos clients :
            c&apos;est ce qui lance les avis, les abonnés et le classement.
          </p>
        ) : (
          <div className="flex items-start gap-6 mt-4">
            <Chiffre valeur={vues} libelle={vues > 1 ? 'vues du profil' : 'vue du profil'} />
            <Chiffre valeur={abonnes} libelle={abonnes > 1 ? 'abonnés' : 'abonné'} />
            <Chiffre
              valeur={avis}
              libelle={avis > 1 ? 'avis' : 'avis'}
              detail={avis > 0 && note > 0 ? `${note.toFixed(1)} de moyenne` : undefined}
            />
          </div>
        )}
      </Link>

      {/* Le profil public est la seule chose qu'un client voit de lui. Il
          était reléqué en bas de page, en gris. Il vit maintenant ici, au
          contact direct du chiffre de vues. */}
      {slug && (
        <Link
          href={`/app/coiffeur/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-5 min-h-[52px] border-t border-neutral-50 active:bg-neutral-50 transition-colors"
        >
          <Eye size={16} className="text-neutral-400 shrink-0" />
          <span className="flex-1 text-[14px] font-semibold text-neutral-900">Voir mon profil public</span>
          <ChevronRight size={16} className="text-neutral-300 shrink-0" />
        </Link>
      )}

      {/* Le coiffeur est le meilleur canal d'acquisition de l'app : chaque
          client invité arrive avec un coiffeur déjà choisi. L'invitation vit
          au contact du compteur de vues — c'est la même question, « qui me
          voit ? », avec la réponse actionnable juste dessous. */}
      {slug && (
        <button
          onClick={() => setInviteOuvert(true)}
          className="w-full flex items-center gap-3 px-5 min-h-[52px] border-t border-neutral-50 active:bg-neutral-50 transition-colors text-left"
        >
          <Share2 size={16} className="text-neutral-400 shrink-0" />
          <span className="flex-1 text-[14px] font-semibold text-neutral-900">Inviter vos clients sur CHAIR</span>
          <ChevronRight size={16} className="text-neutral-300 shrink-0" />
        </button>
      )}

      {slug && (
        <ShareSheet
          open={inviteOuvert}
          onClose={() => setInviteOuvert(false)}
          title="Inviter vos clients"
          shareUrl={`https://www.getchair.app/app/coiffeur/${slug}`}
          shareText={getSharePayload('own-profile', {
            url: `https://www.getchair.app/app/coiffeur/${slug}`,
            name: name ?? undefined,
          }).text}
          actionType="share_profile"
        />
      )}
    </div>
  );
}

function Chiffre({ valeur, libelle, detail }: { valeur: number; libelle: string; detail?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums text-neutral-900">
        {valeur}
      </p>
      <p className="text-[12px] text-neutral-500 mt-1.5 leading-tight">{libelle}</p>
      {detail && <p className="text-[11px] text-neutral-400 mt-0.5 tabular-nums">{detail}</p>}
    </div>
  );
}
