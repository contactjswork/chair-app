'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { referral } from '@/lib/api';
import type { ApiReferral } from '@/lib/types';
import { ArrowLeft, Share2, Users, Gift, Zap, Check, Copy } from 'lucide-react';
import ShareSheet from '@/components/ui/ShareSheet';

const MILESTONE_LABELS: Record<number, string> = {
  5:   '1 mois de CHAIR+ offert',
  20:  'Badge Ambassadeur CHAIR',
  50:  '30 jours de mise en avant locale',
  100: 'Accès anticipé aux nouveautés + badge Ambassadeur national',
};

export default function ParrainagePage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const [data, setData] = useState<ApiReferral | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    referral.mine().then(setData).catch(() => {}).finally(() => setDataLoading(false));
  }, [user]);

  function showRewardToast(points: number) {
    setToast(`+${points} points CHAIR !`);
    setTimeout(() => setToast(null), 2500);
  }

  async function copyLink() {
    if (!data) return;
    await navigator.clipboard.writeText(data.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}

      <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 h-14 flex items-center md:hidden">
        <Link href="/pro" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors mr-auto">
          <ArrowLeft size={16} />
          <span className="text-xs font-medium">Tableau de bord</span>
        </Link>
        <span className="text-sm font-bold tracking-tight text-neutral-900 absolute left-1/2 -translate-x-1/2">Parrainage</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-5 md:pt-10 pb-28 md:pb-10 space-y-5">

        <div className="hidden md:flex items-center gap-3">
          <Link href="/pro" className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-700 transition-colors">
            <ArrowLeft size={14} /><span className="text-xs">Retour</span>
          </Link>
          <span className="text-neutral-200">/</span>
          <h1 className="text-lg font-bold text-neutral-900">Programme ambassadeur</h1>
        </div>

        {dataLoading ? (
          <div className="h-48 bg-neutral-200 rounded-2xl animate-pulse" />
        ) : data ? (
          <>
            {/* ── Hero code + lien ── */}
            <div className="bg-neutral-900 rounded-2xl p-6">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/50 mb-1">Votre code de parrainage</p>
              <h2 className="text-3xl font-black text-white tracking-tight mb-4">{data.code}</h2>

              <div className="bg-white/10 rounded-xl px-3.5 py-3 mb-3 flex items-center gap-2">
                <p className="text-xs text-white/70 truncate flex-1">{data.link}</p>
                <button onClick={copyLink} className="text-white/80 hover:text-white flex-shrink-0">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>

              <button
                onClick={() => setShareOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-white text-neutral-900 font-bold py-3 rounded-xl text-sm hover:bg-neutral-100 transition-colors"
              >
                <Share2 size={15} />Partager mon profil
              </button>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white rounded-2xl border border-neutral-100 p-4 text-center">
                <Users size={16} className="text-neutral-300 mx-auto mb-1.5" />
                <p className="text-xl font-bold text-neutral-900 leading-none">{data.referral_count}</p>
                <p className="text-[10px] text-neutral-400 font-medium mt-1.5 uppercase tracking-wide">Filleuls</p>
              </div>
              <div className="bg-white rounded-2xl border border-neutral-100 p-4 text-center">
                <Zap size={16} className="text-neutral-300 mx-auto mb-1.5" />
                <p className="text-xl font-bold text-neutral-900 leading-none">{data.points_earned}</p>
                <p className="text-[10px] text-neutral-400 font-medium mt-1.5 uppercase tracking-wide">Points gagnés</p>
              </div>
            </div>

            {(data.chair_plus_until || data.boost_until) && (
              <div className="bg-white rounded-2xl border border-neutral-100 p-4 space-y-2">
                {data.chair_plus_until && (
                  <p className="text-xs text-neutral-600 flex items-center gap-2">
                    <Gift size={13} className="text-neutral-400 flex-shrink-0" />
                    CHAIR+ actif jusqu&apos;au {new Date(data.chair_plus_until).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {data.boost_until && (
                  <p className="text-xs text-neutral-600 flex items-center gap-2">
                    <Zap size={13} className="text-neutral-400 flex-shrink-0" />
                    Mise en avant locale jusqu&apos;au {new Date(data.boost_until).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            )}

            {/* ── Paliers ── */}
            <div className="bg-white rounded-2xl border border-neutral-100 p-5">
              <p className="text-sm font-bold text-neutral-900 mb-4">Paliers</p>
              <div className="space-y-4">
                {data.milestones.map((threshold) => {
                  const reached = data.referral_count >= threshold;
                  const isNext = data.next_milestone === threshold;
                  return (
                    <div key={threshold} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        reached ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'
                      }`}>
                        {reached ? <Check size={14} /> : threshold}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold ${reached ? 'text-neutral-900' : 'text-neutral-400'}`}>{MILESTONE_LABELS[threshold]}</p>
                        {isNext && (
                          <p className="text-[10px] text-neutral-400 mt-0.5">{data.referral_count}/{threshold} filleuls</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 text-center leading-relaxed">
              Points : partage de profil/réalisation, invitation d&apos;un collègue ou d&apos;un salon, publication réseaux sociaux avec votre lien.
            </p>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-100 px-5 py-10 text-center">
            <p className="text-sm font-semibold text-neutral-400">Impossible de charger votre parrainage.</p>
          </div>
        )}
      </div>

      {data && (
        <ShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title="Partager mon profil"
          shareUrl={data.link}
          shareText={`Rejoignez-moi sur CHAIR, l'app qui met en avant les coiffeurs !`}
          actionType="share_profile"
          onRewarded={showRewardToast}
        />
      )}
    </div>
  );
}
