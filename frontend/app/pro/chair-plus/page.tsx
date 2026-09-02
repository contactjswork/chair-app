'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { subscription } from '@/lib/api';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { useAppContext, allowsDigitalSubscriptionUI } from '@/lib/appContext';
import SubscriptionElsewhereState from '@/components/pro/SubscriptionElsewhereState';
import type { ApiMySubscription } from '@/lib/types';
import { chairPlusState } from '@/lib/types';
import PremiumUpsellSheet from '@/components/ui/PremiumUpsellSheet';
import { acheterChairPlus, restaurerChairPlus, gererAbonnementApple, iapDisponible, prixChairPlusApple, AchatAnnule } from '@/lib/iap';
import {
  ArrowLeft, Check, Clock, AlertTriangle, ExternalLink, ArrowRight,
  BadgeCheck, TrendingUp, Heart, BarChart3, Film, Pin, X, Sparkles, BookUser,
} from 'lucide-react';

// ── Offre ────────────────────────────────────────────────────────────────
//
// Refonte visuelle + contenu du 01/09/2026 (retours Julien) :
//  - les STORIES sortent de CHAIR+ (gratuites pour tous — moteur viral) ;
//  - le CARNET CLIENT devient l'argument n°1 : limité à 25 clients sans
//    CHAIR+ (ClientBookController::CARNET_GRATUIT_MAX), illimité avec.

const CARNET_LIMITE = 25; // miroir de ClientBookController::CARNET_GRATUIT_MAX

/** L'avantage vedette, mis en scène à part. */
const FEATURE_HERO = {
  icon: BookUser,
  label: 'Carnet client illimité',
  desc: `Notes privées, conseils, rythme de retour, relances — sur TOUS vos clients. Sans CHAIR+, votre carnet s'arrête aux ${CARNET_LIMITE} derniers.`,
};

const FEATURES = [
  { icon: BadgeCheck,  label: 'Badge CHAIR+',       desc: 'Visible sur votre profil, la recherche et vos réalisations.' },
  { icon: TrendingUp,  label: 'Boost local',        desc: 'Un coup de pouce de visibilité, jamais au détriment du mérite.' },
  { icon: BarChart3,   label: 'Analytics avancées', desc: 'Visites, favoris, conversion — sur 90 jours et 12 mois.' },
  { icon: Film,        label: 'Vidéos',             desc: 'Le format court qui montre votre geste.' },
  { icon: Pin,         label: 'Posts épinglés',     desc: 'Vos 3 meilleures réalisations en tête de portfolio.' },
  { icon: Heart,       label: 'Coup de cœur',       desc: 'Éligibilité à la sélection éditoriale CHAIR.' },
];

// Comparatif : une valeur peut être un booléen (✓/✗) ou un texte (« 25 clients »).
const COMPARISON: { label: string; free: boolean | string; plus: boolean | string }[] = [
  { label: 'Profil, réservations, agenda', free: true,          plus: true },
  { label: 'Portfolio photo',              free: true,          plus: true },
  { label: 'Stories',                      free: true,          plus: true },
  { label: 'Carnet client',                free: `${CARNET_LIMITE} clients`, plus: 'Illimité' },
  { label: 'Analytics',                    free: '30 jours',    plus: '12 mois' },
  { label: 'Vidéos 15s',                   free: false,         plus: true },
  { label: 'Posts épinglés',               free: false,         plus: true },
  { label: 'Badge CHAIR+',                 free: false,         plus: true },
  { label: 'Boost local',                  free: false,         plus: true },
  { label: 'Coups de cœur éligibles',      free: false,         plus: true },
];

// ── Helpers état ─────────────────────────────────────────────────────────

function daysLeft(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '—';
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function ChairPlusPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const searchParams = useSearchParams();
  const checkoutResult = searchParams.get('checkout');
  // Quel binaire affiche cette page ? CHAIR CLIENT et CHAIR PRO chargent le
  // même site : sans ce test, le tarif et le bouton de souscription CHAIR+
  // s'afficheraient aussi dans l'app CLIENT — interdit par l'App Store
  // Review Guideline 3.1.1(a) hors achat intégré. Voir lib/appContext.ts.
  const { context: appContext, resolved: appContextResolved } = useAppContext();

  const [data, setData] = useState<ApiMySubscription | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flagEnabled, setFlagEnabled] = useState(true);
  const [flagLoading, setFlagLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Achat intégré Apple (binaire PRO uniquement) : la feuille de paiement
  // est-elle utilisable dans ce build, et à quel prix l'App Store vend-il
  // réellement CHAIR+ ici (devise du storefront) ?
  const [iapOk, setIapOk] = useState(false);
  const [prixApple, setPrixApple] = useState<string | null>(null);
  const [iapNotice, setIapNotice] = useState('');

  useEffect(() => {
    if (!user) return;
    subscription.mine().then(setData).catch(() => {}).finally(() => setDataLoading(false));
  }, [user]);

  useEffect(() => {
    isFeatureEnabled('chair_plus_enabled').then(setFlagEnabled).finally(() => setFlagLoading(false));
  }, []);

  useEffect(() => {
    if (appContext !== 'pro') return;
    iapDisponible().then(setIapOk).catch(() => {});
    prixChairPlusApple().then(setPrixApple).catch(() => {});
  }, [appContext]);

  async function refreshSubscription() {
    try { setData(await subscription.mine()); } catch { /* le bandeau d'état restera sur l'ancien état, sans casser la page */ }
  }

  async function handleSubscribe() {
    setBusy(true);
    setError('');
    setIapNotice('');
    try {
      if (appContext === 'pro') {
        // Binaire iOS : la vente passe par la feuille de paiement Apple
        // (règle App Store 3.1.1) — jamais par Stripe Checkout dans l'app.
        if (!iapOk) {
          setError("L'achat intégré n'est pas disponible dans cette version de l'app. Mets à jour CHAIR PRO depuis l'App Store.");
          return;
        }
        await acheterChairPlus();
        await refreshSubscription();
        setIapNotice('CHAIR+ est actif — bienvenue ! 🎉');
      } else {
        // Web : Stripe Checkout (30 jours d'essai gérés par Stripe).
        const res = await subscription.subscribe('chair_plus');
        window.location.href = res.checkout_url;
        return; // on quitte la page, ne pas réactiver le bouton
      }
    } catch (err) {
      if (!(err instanceof AchatAnnule)) {
        setError(err instanceof Error ? err.message : "Erreur lors de la création de l'abonnement.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    setBusy(true);
    setError('');
    setIapNotice('');
    try {
      const trouve = await restaurerChairPlus();
      if (trouve) {
        await refreshSubscription();
        setIapNotice('Abonnement retrouvé — CHAIR+ est de nouveau actif.');
      } else {
        setIapNotice('Aucun abonnement CHAIR+ trouvé sur ce compte App Store.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La restauration a échoué. Réessaie dans un instant.');
    } finally {
      setBusy(false);
    }
  }

  async function handleManage() {
    setBusy(true);
    setError('');
    try {
      if (sub?.provider === 'apple') {
        // Un abonnement Apple s'annule dans les réglages App Store — le
        // portail Stripe ne le connaît pas.
        await gererAbonnementApple();
        await refreshSubscription();
        return;
      }
      const res = await subscription.manage();
      window.location.href = res.portal_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ouverture de la gestion d'abonnement.");
    } finally {
      setBusy(false);
    }
  }

  // `!appContextResolved` inclus dans l'état de chargement : la détection du
  // binaire lit `navigator`, donc rien n'est décidé avant l'hydratation. On
  // affiche le spinner plutôt qu'une UI d'abonnement qu'il faudrait retirer
  // juste après — aucun tarif n'est jamais peint puis rétracté.
  if (isLoading || !user || !appContextResolved) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const sub = data?.subscription;
  const hasPlus = data?.has_chair_plus ?? false;
  const state = chairPlusState(hasPlus, sub ?? null);
  // Un abonnement déjà existant (actif, en essai, ou en annulation programmée)
  // reste gérable même si le flag est désactivé — le flag ne bloque que les
  // NOUVELLES souscriptions, jamais l'entitlement déjà acquis.
  const canManage = !!sub && state !== 'expired';
  const showComingSoon = !flagLoading && !flagEnabled && !canManage;
  const showSubscriptionUI = allowsDigitalSubscriptionUI(appContext);
  // Dans le binaire PRO le prix affiché est celui que l'App Store vend
  // réellement (devise du storefront) ; repli sur le tarif France sinon.
  const prixLabel = appContext === 'pro' && prixApple ? prixApple : '15,99 €';

  return (
    <div className="min-h-screen bg-white">

      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_-8px_rgba(10,10,10,0.08)] px-4 h-14 flex items-center md:hidden">
        <Link href="/pro" className="relative before:absolute before:-inset-2.5 before:content-[''] flex items-center text-neutral-500 hover:text-neutral-900 transition-colors mr-auto p-1 -ml-1 rounded-lg">
          <ArrowLeft size={18} />
        </Link>
        <span className="text-sm font-bold tracking-tight text-neutral-900 absolute left-1/2 -translate-x-1/2">
          CHAIR+
        </span>
      </div>

      <div className="hidden md:flex items-center gap-3 max-w-2xl mx-auto px-6 pt-8">
        <Link href="/pro" className="flex items-center text-neutral-400 hover:text-neutral-700 transition-colors p-1 -ml-1 rounded-lg">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-neutral-200">/</span>
        <h1 className="text-lg font-bold text-neutral-900">CHAIR+</h1>
      </div>

      {showComingSoon ? (
        <ComingSoonState />
      ) : !showSubscriptionUI ? (
        <SubscriptionElsewhereState planName="CHAIR+" context={appContext} />
      ) : (
        <>
          {checkoutResult === 'success' && (
            <div className="max-w-2xl mx-auto px-4 md:px-6 pt-4">
              <div className="bg-neutral-900 rounded-2xl px-4 py-3 text-sm text-white font-semibold flex items-center gap-2">
                <Check size={15} />Abonnement en cours d&apos;activation — quelques secondes le temps que Stripe confirme.
              </div>
            </div>
          )}
          {checkoutResult === 'cancel' && (
            <div className="max-w-2xl mx-auto px-4 md:px-6 pt-4">
              <div className="bg-neutral-100 rounded-2xl px-4 py-3 text-sm text-neutral-600">
                Abonnement annulé — vous pouvez réessayer à tout moment.
              </div>
            </div>
          )}

          {/* ── Hero ─────────────────────────────────────────────────── */}
          <section className="bg-neutral-900 bg-[radial-gradient(130%_100%_at_50%_0%,#26262a_0%,#0a0a0a_65%)] md:mx-auto md:max-w-2xl md:mt-6 md:rounded-[32px] md:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_-24px_rgba(10,10,10,0.6)] overflow-hidden">
            <div className="px-6 pt-12 pb-10 md:pt-14 md:pb-12 text-center relative">

              {/* Wordmark CHAIR+ : le « + » en or — seul accent coloré de la page. */}
              <p className="text-[26px] font-black tracking-tight text-white mb-6">
                CHAIR<span className="text-[#f5b942]">+</span>
              </p>

              <h1 className="text-[34px] md:text-[42px] font-black text-white leading-[1.05] tracking-tight mb-3">
                Votre métier mérite<br />d&apos;être vu.
              </h1>

              {dataLoading || flagLoading ? (
                <div className="h-24 bg-white/5 rounded-2xl animate-pulse max-w-xs mx-auto mt-6" />
              ) : (
                <>
                  <p className="text-[13px] text-white/50 font-medium mb-8">
                    30 jours gratuits, puis {prixLabel}/mois. Sans engagement.
                  </p>

                  {error && <p className="text-xs text-red-300 mb-3">{error}</p>}
                  {iapNotice && <p className="text-xs text-white/80 mb-3 font-semibold">{iapNotice}</p>}

                  <StateBanner state={state} sub={sub ?? null} isPastDue={sub?.status === 'past_due'} />

                  {canManage ? (
                    <button
                      onClick={handleManage}
                      disabled={busy}
                      className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-white text-neutral-900 font-bold py-4 rounded-2xl text-[15px] hover:bg-neutral-100 transition-colors disabled:opacity-50"
                    >
                      <ExternalLink size={15} />{busy ? 'Chargement...' : 'Gérer mon abonnement'}
                    </button>
                  ) : (
                    <button
                      onClick={handleSubscribe}
                      disabled={busy}
                      className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-white text-neutral-900 font-bold py-4 rounded-2xl text-[15px] hover:bg-neutral-100 active:scale-[0.99] transition-all disabled:opacity-50 shadow-[0_12px_30px_-10px_rgba(255,255,255,0.25)]"
                    >
                      {busy ? 'Chargement...' : 'Essayer 30 jours gratuits'}
                      {!busy && <ArrowRight size={15} />}
                    </button>
                  )}

                  {/* Restauration : obligatoire côté Apple (nouvel iPhone, app
                      réinstallée, validation interrompue après paiement). */}
                  {appContext === 'pro' && !canManage && (
                    <button
                      onClick={handleRestore}
                      disabled={busy}
                      className="relative before:absolute before:-inset-y-[10px] before:inset-x-0 before:content-[''] mt-4 text-[12px] font-semibold text-white/50 hover:text-white/80 transition-colors disabled:opacity-50 block mx-auto"
                    >
                      Déjà abonné via l&apos;App Store ? Restaurer mes achats
                    </button>
                  )}

                  <button
                    onClick={() => setSheetOpen(true)}
                    className="relative before:absolute before:-inset-y-[13px] before:inset-x-0 before:content-[''] mt-4 text-[12px] font-semibold text-white/40 underline underline-offset-4 decoration-white/20 hover:text-white/70 transition-colors"
                  >
                    Aperçu rapide des avantages
                  </button>
                </>
              )}
            </div>
          </section>

          <div className="max-w-2xl mx-auto px-4 md:px-6 py-12 md:py-16 space-y-12 md:space-y-16">

            {/* ── Avantage vedette : le carnet client ── */}
            <section>
              <div className="bg-neutral-900 bg-[radial-gradient(120%_120%_at_0%_0%,#26262a_0%,#0a0a0a_70%)] rounded-[26px] p-6 md:p-7 shadow-[0_20px_44px_-20px_rgba(10,10,10,0.5)]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#f5b942]/15 flex items-center justify-center flex-shrink-0">
                    <FEATURE_HERO.icon size={21} className="text-[#f5b942]" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/40 mb-1">L&apos;outil qui fidélise</p>
                    <p className="text-[17px] font-black text-white leading-tight mb-1.5">{FEATURE_HERO.label}</p>
                    <p className="text-[13px] text-white/60 leading-relaxed">{FEATURE_HERO.desc}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Les autres avantages ── */}
            <section>
              <h2 className="text-xl font-black text-neutral-900 mb-5">Et tout le reste</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURES.map((f) => (
                  <div key={f.label} className="flex items-start gap-3.5 bg-neutral-50 rounded-[20px] p-4 ring-1 ring-neutral-100 hover:ring-neutral-200 transition-shadow">
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
                      <f.icon size={16} className="text-white" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-neutral-900">{f.label}</p>
                      <p className="text-[12px] text-neutral-500 leading-relaxed mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Comparatif ── */}
            <section>
              <h2 className="text-xl font-black text-neutral-900 text-center mb-6">Gratuit vs CHAIR+</h2>
              <div className="rounded-[22px] ring-1 ring-neutral-100 overflow-hidden shadow-[0_2px_12px_-6px_rgba(10,10,10,0.08)]">
                <div className="grid grid-cols-[1fr_auto_auto] bg-neutral-50 border-b border-neutral-100">
                  <div className="px-4 py-3" />
                  <div className="px-2 py-3 w-24 text-center text-[11px] font-bold uppercase tracking-wide text-neutral-400">Gratuit</div>
                  <div className="px-2 py-3 w-24 text-center text-[11px] font-bold uppercase tracking-wide text-white bg-neutral-900">CHAIR+</div>
                </div>
                {COMPARISON.map((row, i) => (
                  <div key={row.label} className={`grid grid-cols-[1fr_auto_auto] items-center ${i !== COMPARISON.length - 1 ? 'border-b border-neutral-50' : ''}`}>
                    <div className="px-4 py-3.5 text-[13px] font-medium text-neutral-700">{row.label}</div>
                    <div className="px-2 py-3.5 w-24 flex items-center justify-center">
                      <CellValue value={row.free} muted />
                    </div>
                    <div className="px-2 py-3.5 w-24 flex items-center justify-center bg-neutral-50/70">
                      <CellValue value={row.plus} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── CTA final ── */}
            {!canManage && (
              <section className="bg-neutral-900 bg-[radial-gradient(130%_120%_at_50%_0%,#26262a_0%,#0a0a0a_70%)] rounded-[28px] p-8 md:p-10 text-center shadow-[0_24px_50px_-24px_rgba(10,10,10,0.55)]">
                <Sparkles size={20} className="text-[#f5b942] mx-auto mb-4" />
                <h2 className="text-xl md:text-2xl font-black text-white mb-2">Essayez, c&apos;est offert.</h2>
                <p className="text-[13px] text-white/50 mb-6">30 jours gratuits, puis {prixLabel}/mois. Annulation en deux taps, à tout moment.</p>
                <button
                  onClick={handleSubscribe}
                  disabled={busy}
                  className="inline-flex items-center gap-2 bg-white text-neutral-900 font-bold px-7 py-3.5 rounded-2xl text-[14px] hover:bg-neutral-100 transition-colors disabled:opacity-50"
                >
                  {busy ? 'Chargement...' : 'Essayer 30 jours gratuits'}
                  {!busy && <ArrowRight size={15} />}
                </button>
              </section>
            )}
          </div>
        </>
      )}

      {/* Le sheet d'upsell porte un CTA de souscription : il ne doit pas être
          monté là où l'UI d'abonnement est retirée. */}
      {showSubscriptionUI && <PremiumUpsellSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />}
    </div>
  );
}

/** Cellule du comparatif : ✓ / ✗ / texte (« 25 clients », « Illimité »). */
function CellValue({ value, muted = false }: { value: boolean | string; muted?: boolean }) {
  if (typeof value === 'string') {
    return <span className={`text-[11px] font-bold tabular-nums ${muted ? 'text-neutral-400' : 'text-neutral-900'}`}>{value}</span>;
  }
  if (value) {
    return <Check size={16} className={muted ? 'text-neutral-400' : 'text-neutral-900'} strokeWidth={muted ? 2 : 2.5} />;
  }
  return <X size={14} className="text-neutral-200" />;
}

// ── État "pas encore disponible" — flag désactivé, honnête, pas de CTA. ──

function ComingSoonState() {
  const [notified, setNotified] = useState(false);

  return (
    <div className="max-w-sm mx-auto px-6 py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-5">
        <Sparkles size={22} className="text-neutral-400" strokeWidth={1.5} />
      </div>
      <h1 className="text-xl font-black text-neutral-900 mb-2">Bientôt disponible</h1>
      <p className="text-sm text-neutral-500 leading-relaxed mb-6">
        CHAIR+ n&apos;est pas encore disponible. Carnet client illimité, badge, boost et analytics avancées arrivent prochainement.
      </p>
      {!notified ? (
        <button
          onClick={() => setNotified(true)}
          className="text-sm font-semibold text-neutral-900 underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-900 transition-colors"
        >
          Me prévenir de la sortie
        </button>
      ) : (
        <p className="text-sm text-neutral-400">Merci — on vous tient au courant.</p>
      )}
    </div>
  );
}

// ── Bandeau d'état — un seul par état, jamais deux messages contradictoires ──

function StateBanner({ state, sub, isPastDue }: {
  state: ReturnType<typeof chairPlusState>;
  sub: { trial_ends_at: string | null; current_period_end: string | null } | null;
  isPastDue: boolean;
}) {
  const base = 'rounded-xl px-3.5 py-3 flex items-center justify-center gap-2 mb-4 max-w-xs mx-auto text-[13px] font-semibold';

  // Paiement refusé — cas prioritaire même si l'accès est encore techniquement
  // "premium" (Stripe retente automatiquement) : sans cette alerte, l'abonné
  // ne saurait pas qu'une action de sa part est nécessaire.
  if (isPastDue) {
    return (
      <div className={`${base} bg-white/10 text-white`}>
        <AlertTriangle size={14} className="flex-shrink-0" />
        Paiement refusé — mettez à jour votre moyen de paiement
      </div>
    );
  }

  if (state === 'trial') {
    const d = daysLeft(sub?.trial_ends_at ?? null);
    return (
      <div className={`${base} bg-white/10 text-white`}>
        <Clock size={14} className="text-white/70 flex-shrink-0" />
        Essai gratuit — {d} jour{d > 1 ? 's' : ''} restant{d > 1 ? 's' : ''}
      </div>
    );
  }
  if (state === 'premium') {
    return (
      <div className={`${base} bg-white/10 text-white`}>
        <Check size={14} className="text-white/70 flex-shrink-0" />
        {sub ? `Actif — renouvellement le ${fmtDate(sub.current_period_end)}` : 'CHAIR+ actif'}
      </div>
    );
  }
  if (state === 'cancel_scheduled') {
    return (
      <div className={`${base} bg-white/10 text-white`}>
        <AlertTriangle size={14} className="flex-shrink-0" />
        Annulation programmée — accès conservé jusqu&apos;au {fmtDate(sub?.current_period_end ?? null)}
      </div>
    );
  }
  if (state === 'expired') {
    return (
      <div className={`${base} bg-white/10 text-white/70`}>
        <AlertTriangle size={14} className="flex-shrink-0" />
        Abonnement expiré — réactivez pour retrouver l&apos;accès
      </div>
    );
  }
  return null; // free : rien à afficher, le CTA principal suffit
}
