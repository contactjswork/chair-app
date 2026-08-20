'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { interactions } from '@/lib/api';
import { getSharePayload } from '@/lib/share';
import { Heart, UserPlus, UserCheck, Edit2, Share2, Check } from 'lucide-react';
import { PrimaryButton, SecondaryButton, IconButton } from './Button';

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface Props {
  hairdresserId: number;
  hairdresserName?: string;
  instagramUrl?: string | null;
  /** Tagline du coiffeur — personnalise le partage "own-profile" du propriétaire. */
  tagline?: string | null;
  city?: string | null;
}

// Rangée d'actions du profil public.
//
// Deux corrections de fond ici :
//  1. Plus aucun style ad hoc — tout passe par SecondaryButton / IconButton.
//     Avant, cette rangée inventait ses propres cotes (py-3 → ~42px, icônes
//     44px, rounded-xl) alors que le CTA de réservation juste en dessous est
//     en rounded-2xl 46px : deux barres d'actions du même écran qui ne
//     partageaient ni hauteur ni rayon.
//  2. "S'abonner" n'est plus un aplat noir. Le noir plein est réservé à la
//     réservation, qui est l'action qui compte sur une fiche coiffeur. Deux
//     boutons noirs de poids identique sur le même écran, c'est une absence
//     de hiérarchie, pas un choix.
export default function ProfileActions({
  hairdresserId,
  hairdresserName = 'Ce coiffeur',
  instagramUrl,
  tagline,
  city,
}: Props) {
  const { user }  = useAuth();
  const router    = useRouter();

  const [following,      setFollowing]      = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [loadingFollow,  setLoadingFollow]  = useState(false);
  const [loadingSave,    setLoadingSave]    = useState(false);
  const [statusLoaded,   setStatusLoaded]   = useState(false);
  const [shared,         setShared]         = useState(false);

  useEffect(() => {
    if (!user) { setStatusLoaded(true); return; }
    interactions.status(hairdresserId)
      .then((s) => { setFollowing(s.following); setSaved(s.saved); })
      .catch(() => {})
      .finally(() => setStatusLoaded(true));
  }, [user, hairdresserId]);

  async function handleFollow() {
    if (!user) { router.push('/connexion'); return; }
    setLoadingFollow(true);
    try {
      if (following) {
        await interactions.unfollow(hairdresserId);
        setFollowing(false);
        emitFollowChange(-1);
      } else {
        await interactions.follow(hairdresserId);
        setFollowing(true);
        emitFollowChange(+1);
      }
    } catch { /* silently ignore */ }
    setLoadingFollow(false);
  }

  // Prévient le bandeau de stats du profil (PublicProfileIdentity) — le
  // compteur d'abonnés se met à jour en direct, sans rechargement.
  function emitFollowChange(delta: number) {
    window.dispatchEvent(new CustomEvent('chair:follow-change', { detail: { hairdresserId, delta } }));
  }

  async function handleSave() {
    if (!user) { router.push('/connexion'); return; }
    setLoadingSave(true);
    try {
      if (saved) {
        await interactions.unsave(hairdresserId);
        setSaved(false);
      } else {
        await interactions.save(hairdresserId);
        setSaved(true);
      }
    } catch { /* silently ignore */ }
    setLoadingSave(false);
  }

  // Profil propre → bouton édition + partage "own-profile" (ton pro)
  const isOwnProfile = user?.hairdresser_profile?.id === hairdresserId;

  async function handleShare() {
    // Le propriétaire partage SON profil (ton pro), un client recommande
    // le coiffeur (incitation à découvrir/réserver).
    const payload = getSharePayload(
      isOwnProfile ? 'own-profile' : 'hairdresser-profile',
      {
        url: window.location.href,
        name: hairdresserName,
        tagline: tagline ?? undefined,
        city: city ?? undefined,
      },
    );
    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else {
        await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
        setShared(true);
        setTimeout(() => setShared(false), 2200);
      }
    } catch { /* user cancelled share */ }
  }

  // `outline` par défaut (fond blanc + bordure) — annulé ici car ces icônes
  // vivent maintenant dans un bloc groupé qui porte déjà son propre fond.
  const groupedIconCls = '!bg-transparent !border-0 hover:!bg-white';

  const shareButton = (
    <IconButton
      size="lg"
      variant="outline"
      onClick={handleShare}
      aria-label="Partager ce profil"
      title="Partager ce profil"
      className={groupedIconCls}
    >
      {shared ? <Check size={16} className="text-neutral-900" /> : <Share2 size={16} />}
    </IconButton>
  );

  const instagramButton = instagramUrl ? (
    <a
      href={instagramUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Instagram"
      aria-label="Instagram"
      className="w-11 h-11 inline-flex items-center justify-center rounded-full text-neutral-600 hover:bg-white transition-all active:scale-90"
    >
      <InstagramIcon size={16} />
    </a>
  ) : null;

  if (isOwnProfile) {
    return (
      <div className="flex items-center gap-2">
        <SecondaryButton href="/pro/profil" fullWidth icon={<Edit2 size={15} strokeWidth={2} />}>
          Modifier mon profil
        </SecondaryButton>
        {/* Actions secondaires groupées dans un même bloc — plutôt que deux
            cercles isolés flottant à côté du bouton principal. */}
        <div className="flex items-center gap-1 shrink-0 bg-neutral-50 rounded-full p-1">
          {shareButton}
          {instagramButton}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">

      {/* S'abonner = noir plein (l'action à faire) ; Abonné = gris neutre
          (état acquis) — retour Julien : les deux états en blanc étaient
          indistinguables. Même contraste que Instagram (Suivre/Suivi). */}
      {following ? (
        <SecondaryButton
          fullWidth
          onClick={handleFollow}
          loading={loadingFollow || !statusLoaded}
          icon={<UserCheck size={15} strokeWidth={2} />}
          className="bg-neutral-100 border-neutral-100 text-neutral-600"
        >
          Abonné
        </SecondaryButton>
      ) : (
        <PrimaryButton
          fullWidth
          onClick={handleFollow}
          loading={loadingFollow || !statusLoaded}
          icon={<UserPlus size={15} strokeWidth={2} />}
        >
          S&apos;abonner
        </PrimaryButton>
      )}

      {/* Sauvegarder / Partager / Instagram — un seul bloc groupé plutôt que
          trois cercles isolés au même poids visuel que le CTA principal. */}
      <div className="flex items-center gap-1 shrink-0 bg-neutral-50 rounded-full p-1">
        <IconButton
          size="lg"
          variant={saved ? 'filled' : 'outline'}
          onClick={handleSave}
          disabled={loadingSave || !statusLoaded}
          aria-label={saved ? 'Retirer des favoris' : 'Sauvegarder'}
          title={saved ? 'Retirer des favoris' : 'Sauvegarder'}
          className={saved ? '' : groupedIconCls}
        >
          <Heart size={16} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} />
        </IconButton>
        {shareButton}
        {instagramButton}
      </div>
    </div>
  );
}
