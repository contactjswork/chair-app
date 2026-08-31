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
import { PremiumBadge } from '@/components/ui/PremiumLock';
import PremiumUpsellSheet from '@/components/ui/PremiumUpsellSheet';
import {
  ArrowLeft, Check, Clock, AlertTriangle, ExternalLink, ArrowRight,
  Camera, BadgeCheck, TrendingUp, Heart, BarChart3, Film, Pin, X, Sparkles,
} from 'lucide-react';

// ── Data ─────────────────────────────────────────────────────────────────

const BENEFIT_GROUPS = [
  {
    title: 'Créez davantage',
    items: [
      { icon: Camera, label: 'Stories',          desc: '24h, réservées à vos abonnés.' },
      { icon: Film,   label: 'Vidéos',            desc: 'Format court pour montrer votre geste.' },
      { icon: Pin,    label: 'Posts épinglés',    desc: '3 réalisations en tête de votre portfolio.' },
    ],
  },
  {
    title: 'Soyez davantage visible',
    items: [
      { icon: BadgeCheck,  label: 'Badge CHAIR+',   desc: 'Visible sur profil, recherche et portfolio.' },
      { icon: Heart,       label: 'Coup de cœur',   desc: "Éligibilité à la sélection éditoriale CHAIR." },
      { icon: TrendingUp,  label: 'Boost local',    desc: 'Un coup de pouce léger, jamais au détriment du mérite.' },
    ],
  },
  {
    title: 'Comprenez votre activité',
    items: [
      { icon: BarChart3, label: 'Analytics avancées', desc: 'Visites, favoris, conversion — 7, 30 ou 90 jours.' },
    ],
  },
];

const COMPARISON: { label: string; free: boolean; plus: boolean }[] = [
  { label: 'Profil',                    free: true,  plus: true },
  { label: 'Réservations',              free: true,  plus: true },
  { label: 'Portfolio photo',           free: true,  plus: true },
  { label: 'Analytics essentielles',    free: true,  plus: true },
  { label: 'Stories 24h',               free: false, plus: true },
  { label: 'Vidéos 15s',                free: false, plus: true },
  { label: '3 posts épinglés',          free: false, plus: true },
  { label: 'Badge CHAIR+',              free: false, plus: true },
  { label: 'Boost local léger',         free: false, plus: true },
  { label: 'Coups de cœur éligibles',   free: false, plus: true },
  { label: 'Analytics avancées',        free: false, plus: true },
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
  // (contenu numérique payé hors achat intégré) s'affichent aussi dans l'app
  // CLIENT — ce que la règle App Store 3.1.1(a) interdit hors storefront US.
  // Voir lib/appContext.ts pour le détail de la politique et du cas 'unknown'.
  const { context: appContext, resolved: appContextResolved } = useAppContext();

  const [data, setData] = useState<ApiMySubscription | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flagEnabled, setFlagEnabled] = useState(true);
  const [flagLoading, setFlagLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    subscription.mine().then(setData).catch(() => {}).finally(() => setDataLoading(false));
  }, [user]);

  useEffect(() => {
    isFeatureEnabled('chair_plus_enabled').then(setFlagEnabled).finally(() => setFlagLoading(false));
  }, []);

  async function handleSubscribe() {
    setBusy(true);
    setError('');
    try {
      const res = await subscription.subscribe('chair_plus');
      window.location.href = res.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création de l'abonnement.");
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
      setError(err instanceof Error ? err.message : "Erreur lors de l'ouverture de la gestion d'abonnement.");
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
  // NOUVELLES souscriptions, jamais l'entitlement déjà acquis (voir SubscriptionController::subscribe).
  const canManage = !!sub && state !== 'expired';
  const showComingSoon = !flagLoading && !flagEnabled && !canManage;
  // Séparation CLIENT / PRO : dans le binaire CHAIR CLIENT (et dans tout
  // binaire natif non identifié, par prudence), cette page n'affiche ni
  // tarif, ni bouton de souscription, ni bouton de gestion Stripe. Elle dit
  // honnêtement où cela se passe. Identique pour tout le monde, reviewer
  // compris — aucune détection de reviewer nulle part.
  const showSubscriptionUI = allowsDigitalSubscriptionUI(appContext);

  return (
    <div className="min-h-screen bg-white">

      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_-8px_rgba(10,10,10,0.08)] px-4 h-14 flex items-center md:hidden">
        <Link href="/pro" className="relative before:absolute before:-inset-2.5 before:content-[''] flex items-center text-neutral-500 hover:text-neutral-900 transition-colors mr-auto p-1 -ml-1 rounded-lg">
          <ArrowLeft size={18} />
        </Link>
        <span className="text-sm font-bold tracking-tight text-neutral-900 absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          CHAIR+ <PremiumBadge />
        </span>
      </div>

      <div className="hidden md:flex items-center gap-3 max-w-2xl mx-auto px-6 pt-8">
        <Link href="/pro" className="flex items-center text-neutral-400 hover:text-neutral-700 transition-colors p-1 -ml-1 rounded-lg">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-neutral-200">/</span>
        <h1 className="text-lg font-bold text-neutral-900 flex items-center gap-1.5">CHAIR+ <PremiumBadge /></h1>
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
          <section className="bg-neutral-900">
            <div className="max-w-2xl mx-auto px-6 pt-12 pb-10 md:pt-16 md:pb-14 text-center">
              <h1 className="text-[32px] md:text-[40px] font-black text-white leading-[1.1] tracking-tight mb-3">
                Passez au niveau<br />supérieur.
              </h1>

              {dataLoading || flagLoading ? (
                <div className="h-24 bg-white/5 rounded-2xl animate-pulse max-w-xs mx-auto mt-6" />
              ) : (
                <>
                  <p className="text-[13px] text-white/50 font-medium mb-8">
                    30 jours gratuits, puis 15,99€/mois
                  </p>

                  {error && <p className="text-xs text-red-300 mb-3">{error}</p>}

                  <StateBanner state={state} sub={sub ?? null} isPastDue={sub?.status === 'past_due'} />

                  {/* Expiré : sub existe encore (ligne canceled en base) mais ne couvre
                      plus rien — il faut se réabonner (nouveau Checkout), pas gérer
                      une souscription Stripe déjà terminée. */}
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
                      className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-white text-neutral-900 font-bold py-4 rounded-2xl text-[15px] hover:bg-neutral-100 transition-colors disabled:opacity-50"
                    >
                      {busy ? 'Chargement...' : 'Essayer CHAIR+ gratuitement'}
                      {!busy && <ArrowRight size={15} />}
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

          <div className="max-w-2xl mx-auto px-4 md:px-6 py-14 md:py-20 space-y-14 md:space-y-16">

            {/* ── Bénéfices ── */}
            <section className="space-y-6">
              {BENEFIT_GROUPS.map((group) => (
                <div key={group.title} className="bg-neutral-50 rounded-[22px] p-5 md:p-6 ring-1 ring-neutral-100">
                  <p className="text-[13px] font-bold text-neutral-900 mb-4">{group.title}</p>
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <div key={item.label} className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
                          <item.icon size={15} className="text-white" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-neutral-900">{item.label}</p>
                          <p className="text-[12px] text-neutral-500 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* ── Comparatif ── */}
            <section>
              <h2 className="text-xl font-black text-neutral-900 text-center mb-6">Gratuit vs CHAIR+</h2>
              <div className="rounded-[22px] ring-1 ring-neutral-100 overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto] bg-neutral-50 border-b border-neutral-100">
                  <div className="px-4 py-3" />
                  <div className="px-4 py-3 w-20 text-center text-[11px] font-bold uppercase tracking-wide text-neutral-400">Gratuit</div>
                  <div className="px-4 py-3 w-20 text-center text-[11px] font-bold uppercase tracking-wide text-neutral-900 bg-neutral-100">CHAIR+</div>
                </div>
                {COMPARISON.map((row, i) => (
                  <div key={row.label} className={`grid grid-cols-[1fr_auto_auto] items-center ${i !== COMPARISON.length - 1 ? 'border-b border-neutral-50' : ''}`}>
                    <div className="px-4 py-3.5 text-[13px] font-medium text-neutral-700">{row.label}</div>
                    <div className="px-4 py-3.5 w-20 flex items-center justify-center">
                      {row.free ? <Check size={16} className="text-neutral-400" /> : <X size={14} className="text-neutral-200" />}
                    </div>
                    <div className="px-4 py-3.5 w-20 flex items-center justify-center bg-neutral-50/60">
                      {row.plus ? <Check size={16} className="text-neutral-900" strokeWidth={2.5} /> : <X size={14} className="text-neutral-200" />}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── CTA final ── */}
            {!canManage && (
              <section className="bg-neutral-900 rounded-3xl p-8 md:p-10 text-center">
                <Sparkles size={20} className="text-white/50 mx-auto mb-4" />
                <h2 className="text-xl md:text-2xl font-black text-white mb-2">Prêt à passer au niveau supérieur ?</h2>
                <p className="text-[13px] text-white/50 mb-6">30 jours gratuits, puis 15,99€/mois. Annulation à tout moment.</p>
                <button
                  onClick={handleSubscribe}
                  disabled={busy}
                  className="inline-flex items-center gap-2 bg-white text-neutral-900 font-bold px-7 py-3.5 rounded-2xl text-[14px] hover:bg-neutral-100 transition-colors disabled:opacity-50"
                >
                  {busy ? 'Chargement...' : 'Essayer CHAIR+ gratuitement'}
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

// ── Binaire CLIENT (ou binaire natif non identifié) ──────────────────────────
// CHAIR+ est une offre professionnelle numérique payée hors achat intégré.
// L'App Store Review Guideline 3.1.1(a) interdit, hors storefront américain,
// d'exposer un tarif ou un appel à l'action de paiement pour du contenu
// numérique dans une app qui ne passe pas par l'achat intégré. On ne dissimule
// rien : on explique où la gestion se fait réellement, et on y mène par une
// sortie navigateur explicite (target="_blank" → Capacitor ouvre le navigateur
// système, hors de l'app). Le lien pointe l'espace professionnel, pas un
// tunnel de paiement : c'est de la gestion de compte, pas un CTA d'achat.
//
// Rien ici n'est conditionné à l'identité de l'utilisateur : le même binaire
// affiche le même écran pour tout le monde, reviewer inclus.

// ── État "pas encore disponible" — flag désactivé, honnête, pas de CTA d'abonnement.
// Même esprit que AppDownload.tsx pour l'app pas encore publiée sur les stores.

function ComingSoonState() {
  const [notified, setNotified] = useState(false);

  return (
    <div className="max-w-sm mx-auto px-6 py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-5">
        <Sparkles size={22} className="text-neutral-400" strokeWidth={1.5} />
      </div>
      <h1 className="text-xl font-black text-neutral-900 mb-2">Bientôt disponible</h1>
      <p className="text-sm text-neutral-500 leading-relaxed mb-6">
        CHAIR+ n&apos;est pas encore disponible. Stories, vidéos, badge et analytics avancées arrivent prochainement.
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
