'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { subscription } from '@/lib/api';
import type { ApiMySubscription } from '@/lib/types';
import {
  ArrowLeft, Sparkles, Check, Clock, AlertTriangle, ExternalLink,
  Camera, BadgeCheck, Pin, TrendingUp, Heart, BarChart3,
} from 'lucide-react';

const FEATURES = [
  { icon: Camera,     name: 'Stories',                 desc: '24h, réservées à vos abonnés — nouveau réflexe quotidien', live: true },
  { icon: BadgeCheck, name: 'Badge Certifié CHAIR',     desc: 'Statut visible sur votre profil public', live: true },
  { icon: Pin,        name: 'Réalisation épinglée',     desc: 'Gardez votre meilleure création en tête de portfolio', live: false },
  { icon: TrendingUp, name: 'Boost local plafonné',     desc: 'Un coup de pouce dans les recherches, sans écraser le mérite', live: false },
  { icon: Heart,      name: 'Coup de cœur CHAIR',       desc: 'Éligibilité à la sélection éditoriale CHAIR', live: false },
  { icon: BarChart3,  name: 'Analytics premium',        desc: 'Évolution abonnés, avis, réalisations dans le temps', live: false },
];

function daysLeft(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

export default function ChairPlusPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const searchParams = useSearchParams();
  const checkoutResult = searchParams.get('checkout');

  const [data, setData] = useState<ApiMySubscription | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    subscription.mine().then(setData).catch(() => {}).finally(() => setDataLoading(false));
  }, [user]);

  async function handleSubscribe() {
    setBusy(true);
    setError('');
    try {
      const res = await subscription.subscribe('chair_plus');
      window.location.href = res.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de l\'abonnement.');
      setBusy(false);
    }
  }

  async function handleManage() {
    setBusy(true);
    setError('');
    try {
      const res = await subscription.manage();
      window.location.href = res.portal_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ouverture de la gestion d\'abonnement.');
      setBusy(false);
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const sub = data?.subscription;
  const hasPlus = data?.has_chair_plus ?? false;

  return (
    <div className="min-h-screen bg-neutral-50">

      <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 h-14 flex items-center md:hidden">
        <Link href="/pro" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors mr-auto">
          <ArrowLeft size={16} />
          <span className="text-xs font-medium">Tableau de bord</span>
        </Link>
        <span className="text-sm font-bold tracking-tight text-neutral-900 absolute left-1/2 -translate-x-1/2">CHAIR+</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-5 md:pt-10 pb-28 md:pb-10 space-y-5">

        <div className="hidden md:flex items-center gap-3">
          <Link href="/pro" className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-700 transition-colors">
            <ArrowLeft size={14} /><span className="text-xs">Retour</span>
          </Link>
          <span className="text-neutral-200">/</span>
          <h1 className="text-lg font-bold text-neutral-900">CHAIR+</h1>
        </div>

        {checkoutResult === 'success' && (
          <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 text-sm text-green-700 font-semibold flex items-center gap-2">
            <Check size={15} />Abonnement en cours d&apos;activation — quelques secondes le temps que Stripe confirme.
          </div>
        )}
        {checkoutResult === 'cancel' && (
          <div className="bg-neutral-100 rounded-2xl px-4 py-3 text-sm text-neutral-600">
            Abonnement annulé — vous pouvez réessayer à tout moment.
          </div>
        )}

        {dataLoading ? (
          <div className="h-40 bg-neutral-200 rounded-2xl animate-pulse" />
        ) : (
          <>
            {/* ── Hero / état ── */}
            <div className="bg-neutral-900 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={20} className="text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/50">CHAIR+</p>
                  <h2 className="text-2xl font-black text-white">9,99€ / mois</h2>
                </div>
              </div>

              {sub?.status === 'trialing' && (
                <div className="bg-white/10 rounded-xl px-3.5 py-3 flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-white/70 flex-shrink-0" />
                  <p className="text-sm text-white">Essai gratuit — {daysLeft(sub.trial_ends_at)} jour{daysLeft(sub.trial_ends_at) > 1 ? 's' : ''} restant{daysLeft(sub.trial_ends_at) > 1 ? 's' : ''}</p>
                </div>
              )}
              {sub?.status === 'active' && (
                <div className="bg-white/10 rounded-xl px-3.5 py-3 flex items-center gap-2 mb-3">
                  <Check size={14} className="text-white/70 flex-shrink-0" />
                  <p className="text-sm text-white">Actif — renouvellement le {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('fr-FR') : '—'}</p>
                </div>
              )}
              {sub?.status === 'past_due' && (
                <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl px-3.5 py-3 flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-300 flex-shrink-0" />
                  <p className="text-sm text-amber-100">Paiement refusé — mettez à jour votre moyen de paiement pour ne pas perdre l&apos;accès.</p>
                </div>
              )}
              {!sub && hasPlus && (
                <div className="bg-white/10 rounded-xl px-3.5 py-3 flex items-center gap-2 mb-3">
                  <Check size={14} className="text-white/70 flex-shrink-0" />
                  <p className="text-sm text-white">CHAIR+ actif — offert via le programme ambassadeur</p>
                </div>
              )}

              {error && <p className="text-xs text-red-300 mb-3">{error}</p>}

              {sub ? (
                <button
                  onClick={handleManage}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 bg-white text-neutral-900 font-bold py-3 rounded-xl text-sm hover:bg-neutral-100 transition-colors disabled:opacity-50"
                >
                  <ExternalLink size={14} />{busy ? 'Chargement...' : 'Gérer mon abonnement'}
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 bg-white text-neutral-900 font-bold py-3 rounded-xl text-sm hover:bg-neutral-100 transition-colors disabled:opacity-50"
                >
                  {busy ? 'Chargement...' : hasPlus ? 'Passer en abonnement payant' : 'Commencer l\'essai gratuit — 30 jours'}
                </button>
              )}
            </div>

            {/* ── Features ── */}
            <div className="bg-white rounded-2xl border border-neutral-100 p-5">
              <p className="text-sm font-bold text-neutral-900 mb-4">Ce que CHAIR+ ajoute</p>
              <div className="space-y-3">
                {FEATURES.map(({ icon: Icon, name, desc, live }) => (
                  <div key={name} className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${live ? 'bg-neutral-900' : 'bg-neutral-100'}`}>
                      <Icon size={15} className={live ? 'text-white' : 'text-neutral-400'} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-900">{name}</p>
                        {!live && <span className="text-[9px] font-bold uppercase tracking-wide text-neutral-300">Bientôt</span>}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-neutral-300 mt-4 leading-relaxed">
                CHAIR+ ajoute — jamais ne retire. Tout ce qui est gratuit aujourd&apos;hui le reste.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
