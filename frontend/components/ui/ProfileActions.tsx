'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { interactions } from '@/lib/api';
import { Heart, UserPlus, UserCheck, Edit2, Share2, Check } from 'lucide-react';
import { SecondaryButton, IconButton } from './Button';

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
  initialFollowersCount: number;
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
  initialFollowersCount,
}: Props) {
  const { user }  = useAuth();
  const router    = useRouter();

  const [following,      setFollowing]      = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
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
        const res = await interactions.unfollow(hairdresserId);
        setFollowing(false);
        setFollowersCount(res.followers_count);
      } else {
        const res = await interactions.follow(hairdresserId);
        setFollowing(true);
        setFollowersCount(res.followers_count);
      }
    } catch { /* silently ignore */ }
    setLoadingFollow(false);
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

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: hairdresserName, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2200);
      }
    } catch { /* user cancelled share */ }
  }

  const shareButton = (
    <IconButton
      size="lg"
      variant="outline"
      onClick={handleShare}
      aria-label="Partager ce profil"
      title="Partager ce profil"
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
      className="w-11 h-11 inline-flex items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 transition-all active:scale-90"
    >
      <InstagramIcon size={16} />
    </a>
  ) : null;

  // Profil propre → bouton édition
  const isOwnProfile = user?.hairdresser_profile?.id === hairdresserId;
  if (isOwnProfile) {
    return (
      <div className="flex items-center gap-2">
        <SecondaryButton href="/pro/profil" fullWidth icon={<Edit2 size={15} strokeWidth={2} />}>
          Modifier mon profil
        </SecondaryButton>
        {shareButton}
        {instagramButton}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">

      {/* S'abonner */}
      <SecondaryButton
        fullWidth
        onClick={handleFollow}
        loading={loadingFollow || !statusLoaded}
        icon={following ? <UserCheck size={15} strokeWidth={2} /> : <UserPlus size={15} strokeWidth={2} />}
        className={following ? 'bg-neutral-100 border-neutral-100' : ''}
      >
        {following ? 'Abonné' : "S'abonner"}
        {followersCount > 0 && (
          <span className="text-[12px] font-normal text-neutral-400">{followersCount}</span>
        )}
      </SecondaryButton>

      {/* Sauvegarder */}
      <IconButton
        size="lg"
        variant={saved ? 'filled' : 'outline'}
        onClick={handleSave}
        disabled={loadingSave || !statusLoaded}
        aria-label={saved ? 'Retirer des favoris' : 'Sauvegarder'}
        title={saved ? 'Retirer des favoris' : 'Sauvegarder'}
      >
        <Heart size={16} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} />
      </IconButton>

      {shareButton}
      {instagramButton}
    </div>
  );
}
