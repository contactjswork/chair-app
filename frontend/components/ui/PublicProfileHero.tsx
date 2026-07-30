'use client';

import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import BackButton from './BackButton';
import PublicProfileOwnerActions from './PublicProfileOwnerActions';

interface Props {
  hairdresserId: number;
  bannerUrl: string | null;
}

// Bannière compacte — elle ne porte aucune information, elle ne doit donc pas
// coûter un quart de l'écran. À 168px (au lieu de 200), le nom, la ville, la
// note et le premier signal de réputation tiennent au-dessus de la ligne de
// flottaison sur un iPhone standard : c'est la hiérarchie demandée.
//
// Il y avait ici un mini-header pleine largeur qui répétait le nom au scroll,
// piloté par un IntersectionObserver. Il était fixé exactement au même
// `top-content-mobile` avec le même `z-40` que la barre d'onglets sticky de
// PublicProfileTabs : dès que celle-ci se collait (elles occupent toutes deux
// la bande 60→109px), les deux se superposaient. Et même sans la collision,
// cela empilait un troisième bandeau sous la TopNav globale et le nom qu'on
// venait de lire 20px plus haut. Supprimé : la barre d'onglets est le seul
// élément qui mérite d'être collé en haut sur cet écran.
export default function PublicProfileHero({ hairdresserId, bannerUrl }: Props) {
  const { user } = useAuth();
  const isOwnProfile = user?.hairdresser_profile?.id === hairdresserId;

  return (
    <div className="relative w-full overflow-hidden bg-neutral-900" style={{ height: '168px' }}>
      {bannerUrl ? (
        <Image src={bannerUrl} alt="" fill priority className="object-cover" sizes="(max-width: 768px) 100vw, 672px" />
      ) : (
        <div className="absolute inset-0 bg-neutral-900" />
      )}
      {/* Fondu bas uniquement : il fait exister le chevauchement de l'avatar.
          Le voile noir en haut n'apportait rien et grisait la photo. */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
      <BackButton fallbackHref="/app/recherche" />
      {isOwnProfile && <PublicProfileOwnerActions variant="banner" />}
    </div>
  );
}
