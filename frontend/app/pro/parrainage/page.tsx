'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { referral } from '@/lib/api';
import type { ApiReferral } from '@/lib/types';
import { ArrowLeft, Share2, Send, Users, Gift, Zap, Check, Copy } from 'lucide-react';
import ShareSheet from '@/components/ui/ShareSheet';
import { getSharePayload } from '@/lib/share';
import StatCard from '@/components/ui/StatCard';
import { PrimaryButton } from '@/components/ui/Button';

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
  const [loadError, setLoadError] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function loadReferral() {
    setDataLoading(true);
    setLoadError(false);
    referral.mine()
      .then(setData)
      .catch(() => setLoadError(true))
      .finally(() => setDataLoading(false));
  }

  useEffect(() => {
    if (!user) return;
    loadReferral();
  }, [user]);

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

      <div className="sticky top-0 z-20 bg-white shadow-[0_4px_20px_-8px_rgba(10,10,10,0.08)] px-4 h-14 flex items-center md:hidden">
        <Link href="/pro" className="relative before:absolute before:-inset-2.5 before:content-[''] flex items-center text-neutral-500 hover:text-neutral-900 transition-colors mr-auto p-1 -ml-1 rounded-lg">
          <ArrowLeft size={18} />
        </Link>
        <span className="text-sm font-bold tracking-tight text-neutral-900 absolute left-1/2 -translate-x-1/2">Parrainage</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-5 md:pt-10 pb-28 md:pb-10 space-y-5">

        <div className="hidden md:flex items-center gap-3">
          <Link href="/pro" className="flex items-center text-neutral-400 hover:text-neutral-700 transition-colors p-1 -ml-1 rounded-lg">
            <ArrowLeft size={16} />
          </Link>
          <span className="text-neutral-200">/</span>
          <h1 className="text-lg font-bold text-neutral-900">Programme ambassadeur</h1>
        </div>

        {dataLoading ? (
          <div className="h-48 bg-neutral-200 rounded-2xl animate-pulse" />
        ) : data ? (
          <>
            {/* ── Hero code + lien ── */}
            <div className="bg-neutral-900 bg-[radial-gradient(120%_100%_at_50%_0%,#1f1f21_0%,#0a0a0a_62%)] rounded-[28px] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_4px_-2px_rgba(10,10,10,0.4),0_16px_40px_-18px_rgba(10,10,10,0.55)]">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/50 mb-1">Votre code de parrainage</p>
              <h2 className="text-3xl font-black text-white tracking-tight mb-4">{data.code}</h2>

              <div className="bg-white/10 rounded-xl px-3.5 py-3 mb-3 flex items-center gap-2">
                <p className="text-xs text-white/70 truncate flex-1">{data.link}</p>
                <button onClick={copyLink} className="relative before:absolute before:-inset-[15px] before:content-[''] text-white/80 hover:text-white flex-shrink-0">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>

              <PrimaryButton onClick={() => setShareOpen(true)} icon={<Share2 size={15} />} fullWidth className="!bg-white !text-neutral-900 hover:!bg-neutral-100">
                Partager mon lien
              </PrimaryButton>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-3 gap-2.5">
              <StatCard icon={Send} value={data.shares_count} label="Partagés" />
              <StatCard icon={Users} value={data.referral_count} label="Comptes créés" />
              <StatCard icon={Zap} value={data.points_earned} label="Points gagnés" />
            </div>

            {(data.chair_plus_until || data.boost_until) && (
              <div className="bg-white rounded-[22px] p-4 space-y-2 shadow-[0_2px_10px_-4px_rgba(10,10,10,0.08)] ring-1 ring-neutral-100">
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
            <div className="bg-white rounded-[22px] p-5 shadow-[0_2px_10px_-4px_rgba(10,10,10,0.08)] ring-1 ring-neutral-100">
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
              Chaque inscription validée via votre lien rapporte des points — le partage seul ne suffit pas.
            </p>
          </>
        ) : (
          <div className="bg-white rounded-[22px] px-5 py-10 text-center shadow-[0_2px_10px_-4px_rgba(10,10,10,0.08)] ring-1 ring-neutral-100">
            <p className="text-sm font-semibold text-neutral-700 mb-1">
              {loadError ? 'Connexion impossible' : 'Impossible de charger votre parrainage'}
            </p>
            <p className="text-xs text-neutral-400 mb-4">
              {loadError ? 'Vérifiez votre connexion et réessayez.' : 'Une erreur est survenue de notre côté.'}
            </p>
            <button
              onClick={loadReferral}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white px-4 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>

      {data && (
        <ShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title="Partager mon lien"
          shareUrl={data.link}
          shareText={getSharePayload('referral', { url: data.link }, { audience: 'pro' }).text}
          actionType="share_profile"
        />
      )}
    </div>
  );
}
