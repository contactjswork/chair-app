'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { interactions } from '@/lib/api';
import { Heart, UserPlus, UserCheck, ExternalLink, Edit2 } from 'lucide-react';
import Link from 'next/link';

interface Props {
  hairdresserId: number;
  instagramUrl?: string | null;
  initialFollowersCount: number;
}

export default function ProfileActions({ hairdresserId, instagramUrl, initialFollowersCount }: Props) {
  const { user } = useAuth();
  const router = useRouter();

  const [following, setFollowing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);

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

  // Si c'est son propre profil, afficher un bouton "Modifier"
  const isOwnProfile = user?.hairdresser_profile?.id === hairdresserId;
  if (isOwnProfile) {
    return (
      <div className="flex gap-2">
        <Link
          href="/dashboard/profil"
          className="flex-1 flex items-center justify-center gap-2 bg-neutral-100 text-neutral-700 font-semibold py-3 rounded-xl text-sm hover:bg-neutral-200 transition-colors"
        >
          <Edit2 size={16} strokeWidth={2} />
          Modifier mon profil
        </Link>
        {instagramUrl && (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 border border-neutral-200 text-neutral-700 rounded-xl hover:border-neutral-400 transition-colors"
          >
            <ExternalLink size={18} />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleFollow}
        disabled={loadingFollow || !statusLoaded}
        className={`flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 ${
          following
            ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            : 'bg-neutral-900 text-white hover:bg-neutral-700'
        }`}
      >
        {following ? <UserCheck size={16} strokeWidth={2} /> : <UserPlus size={16} strokeWidth={2} />}
        {following ? 'Abonné' : 'Suivre'}
        {followersCount > 0 && (
          <span className={`text-xs font-normal ${following ? 'text-neutral-400' : 'text-white/70'}`}>
            {followersCount}
          </span>
        )}
      </button>

      <button
        onClick={handleSave}
        disabled={loadingSave || !statusLoaded}
        className={`flex-1 flex items-center justify-center gap-2 border font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 ${
          saved
            ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700'
            : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
        }`}
      >
        <Heart size={16} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} />
        {saved ? 'Sauvegardé' : 'Sauvegarder'}
      </button>

      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 border border-neutral-200 text-neutral-700 rounded-xl hover:border-neutral-400 transition-colors"
        >
          <ExternalLink size={18} />
        </a>
      )}
    </div>
  );
}
