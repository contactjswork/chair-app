'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { interactions } from '@/lib/api';
import { Heart, UserPlus, UserCheck, Edit2, Share2, Check } from 'lucide-react';
import Link from 'next/link';

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

  // Profil propre → bouton édition
  const isOwnProfile = user?.hairdresser_profile?.id === hairdresserId;
  if (isOwnProfile) {
    return (
      <div className="flex gap-2">
        <Link
          href="/dashboard/profil"
          className="flex-1 flex items-center justify-center gap-2 bg-neutral-100 text-neutral-700 font-semibold py-3 rounded-xl text-[13px] hover:bg-neutral-200 transition-colors"
        >
          <Edit2 size={15} strokeWidth={2} />
          Modifier mon profil
        </Link>
        <button
          onClick={handleShare}
          title="Partager mon profil"
          className="w-11 h-11 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:border-neutral-400 transition-colors"
        >
          {shared
            ? <Check size={15} className="text-neutral-900" />
            : <Share2 size={15} />
          }
        </button>
        {instagramUrl && (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram"
            className="w-11 h-11 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:border-neutral-400 transition-colors"
          >
            <InstagramIcon size={16} />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2">

      {/* S'abonner — bouton principal */}
      <button
        onClick={handleFollow}
        disabled={loadingFollow || !statusLoaded}
        className={`flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-[13px] transition-all disabled:opacity-50 ${
          following
            ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            : 'bg-neutral-900 text-white hover:bg-neutral-700'
        }`}
      >
        {following
          ? <UserCheck size={15} strokeWidth={2} />
          : <UserPlus size={15} strokeWidth={2} />
        }
        {following ? 'Abonné' : "S'abonner"}
        {followersCount > 0 && (
          <span className={`text-[11px] font-normal ${following ? 'text-neutral-400' : 'text-white/55'}`}>
            {followersCount}
          </span>
        )}
      </button>

      {/* Sauvegarder — icône */}
      <button
        onClick={handleSave}
        disabled={loadingSave || !statusLoaded}
        title={saved ? 'Retirer des favoris' : 'Sauvegarder'}
        className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all disabled:opacity-50 ${
          saved
            ? 'border-neutral-900 bg-neutral-900 text-white'
            : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
        }`}
      >
        <Heart size={16} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} />
      </button>

      {/* Partager — icône */}
      <button
        onClick={handleShare}
        title="Partager ce profil"
        className="w-11 h-11 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:border-neutral-400 transition-colors"
      >
        {shared
          ? <Check size={15} className="text-neutral-900" />
          : <Share2 size={15} />
        }
      </button>

      {/* Instagram — icône */}
      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Instagram"
          className="w-11 h-11 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:border-neutral-400 transition-colors"
        >
          <InstagramIcon size={16} />
        </a>
      )}
    </div>
  );
}
