'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { subscription } from '@/lib/api';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { useAppContext, allowsDigitalSubscriptionUI } from '@/lib/appContext';
import type { ApiMySubscription } from '@/lib/types';
import { chairPlusState } from '@/lib/types';
import PremiumUpsellSheet from '@/components/ui/PremiumUpsellSheet';
import { PrimaryButton } from '@/components/ui/Button';
import { CARTE, CARTE_TAP, CARTE_SOMBRE, MICRO_TITRE } from '@/lib/proStyle';
import { acheterChairPlus, restaurerChairPlus, gererAbonnementApple, iapDisponible, prixChairPlusApple, AchatAnnule } from '@/lib/iap';
import {
  ArrowLeft, Check, Clock, AlertTriangle, ExternalLink, ArrowRight,
  BadgeCheck, TrendingUp, Heart, BarChart3, Film, Pin, X, Sparkles, BookUser,
  Unlock, Bell, CreditCard, Gift,
} from 'lucide-react';

// ── CHAIR+ — la page d'abonnement, dans la DA de la famille ──────────────
//
// Retour de Julien (09/09/2026) : la version « carte noire » (page 100 %
// sombre, CTA doré en dégradé) sortait de la charte — « DA de merde ». Ici,
// même langage que TOUT le reste de CHAIR PRO : fond neutral-50, cartes
// CARTE/CARTE_SOMBRE (proStyle), CTA noir (PrimaryButton), l'or (#f5b942)
// réduit à ce qu'il est partout ailleurs : un accent premium discret (le
// « + » du wordmark, un micro-titre), jamais un aplat ni un bouton.
//
// Contenu (retours Julien 01-02/09) :
//  - carnet client = argument n°1 (25 clients sans CHAIR+, illimité avec) ;
//  - timeline d'essai transparente (J1 / J27 alerte / J30 débit) ;
//  - carte parrainage « gagne-le sans payer » (1 mois chacun).

const CARNET_LIMITE = 25; // miroir de ClientBookController::CARNET_GRATUIT_MAX

const OR = '#f5b942';

const FEATURES = [
  { icon: BadgeCheck,  label: 'Badge CHAIR+',       desc: 'Partout sur votre profil.' },
  { icon: TrendingUp,  label: 'Boost local',        desc: 'Plus de visibilité.' },
  { icon: BarChart3,   label: 'Analytics avancées', desc: '12 mois d’historique.' },
  { icon: Film,        label: 'Vidéos',             desc: 'Montrez votre geste.' },
  { icon: Pin,         label: 'Posts épinglés',     desc: 'Vos 3 meilleures en tête.' },
  { icon: Heart,       label: 'Coup de cœur',       desc: 'Sélection éditoriale.' },
];

// Comparatif : une valeur peut être un booléen (✓/✗) ou un texte (« 25 clients »).
const COMPARISON: { label: string; free: boolean | string; plus: boolean | string }[] = [
  { label: 'Profil, réservations, agenda', free: true,          plus: true },
  { label: 'Portfolio',                    free: true,          plus: true },
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

/** Le wordmark CHAIR+ — le « + » doré est LE seul or autorisé hors premium. */
function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight ${className}`}>
      CHAIR<span style={{ color: OR }}>+</span>
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function ChairPlusPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const searchParams = useSearchParams();
  const checkoutResult = searchParams.get('checkout');
  // Quel binaire affiche cette page ? Sans ce test, tarif et bouton de
  // souscription s'afficheraient aussi dans l'app CLIENT — interdit par
  // l'App Store Review Guideline 3.1.1(a). Voir lib/appContext.ts.
  const { context: appContext, resolved: appContextResolved } = useAppContext();

  const [data, setData] = useState<ApiMySubscription | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flagEnabled, setFlagEnabled] = useState(true);
  const [flagLoading, setFlagLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Achat intégré Apple (binaire PRO uniquement).
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
    try { setData(await subscription.mine()); } catch { /* le bandeau d'état restera sur l'ancien état */ }
  }

  async function handleSubscribe() {
    setBusy(true);
    setError('');
    setIapNotice('');
    try {
      if (appContext === 'pro') {
        // Binaire iOS : feuille de paiement Apple (App Store 3.1.1) — jamais
        // Stripe Checkout dans l'app.
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
        // Un abonnement Apple s'annule dans les réglages App Store.
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

  if (isLoading || !user || !appContextResolved) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const sub = data?.subscription;
  const hasPlus = data?.has_chair_plus ?? false;
  const state = chairPlusState(hasPlus, sub ?? null);
  const canManage = !!sub && state !== 'expired';
  const showComingSoon = !flagLoading && !flagEnabled && !canManage;
  const showSubscriptionUI = allowsDigitalSubscriptionUI(appContext);
  const prixLabel = appContext === 'pro' && prixApple ? prixApple : '15,99 €';

  return (
    <div className="min-h-screen bg-neutral-50">

      {/* En-tête — même barre que toute page secondaire de CHAIR PRO. */}
      <div className="sticky top-0 z-20 bg-white shadow-[0_4px_20px_-8px_rgba(10,10,10,0.08)] px-4 h-14 flex items-center md:hidden">
        <Link href="/pro" className="relative before:absolute before:-inset-2.5 before:content-[''] flex items-center text-neutral-500 hover:text-neutral-900 transition-colors mr-auto p-1 -ml-1 rounded-lg">
          <ArrowLeft size={18} />
        </Link>
        <Wordmark className="text-sm text-neutral-900 absolute left-1/2 -translate-x-1/2" />
      </div>

      <div className="hidden md:flex items-center gap-3 max-w-2xl mx-auto px-6 pt-8">
        <Link href="/pro" className="flex items-center text-neutral-400 hover:text-neutral-700 transition-colors p-1 -ml-1 rounded-lg">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-neutral-200">/</span>
        <h1 className="text-lg text-neutral-900"><Wordmark /></h1>
      </div>

      {showComingSoon ? (
        <ComingSoonState />
      ) : (
        <>
          {checkoutResult === 'success' && (
            <div className="max-w-2xl mx-auto px-4 md:px-6 pt-4">
              <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 text-sm text-green-700 font-semibold flex items-center gap-2">
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

          {/* ══ HERO — clair, sobre, CTA noir comme partout ══ */}
          <section className="max-w-2xl mx-auto px-6 pt-10 pb-10 md:pt-14 md:pb-12 text-center">
            <p className={`${MICRO_TITRE} mb-3`}>Pour les coiffeurs</p>
            <Wordmark className="block text-[30px] md:text-[36px] text-neutral-900 leading-none mb-5" />

            <h2 className="text-[32px] md:text-[42px] font-black text-neutral-900 leading-[1.02] tracking-tight mb-3">
              Passez devant.
            </h2>
            <p className="text-[14px] md:text-[15px] text-neutral-500 font-medium max-w-sm mx-auto mb-8 leading-relaxed">
              La visibilité, le badge, le carnet illimité — tout ce qui
              sépare un bon coiffeur d&apos;un coiffeur qu&apos;on remarque.
            </p>

            {dataLoading || flagLoading ? (
              <div className="h-24 bg-neutral-100 rounded-2xl animate-pulse max-w-xs mx-auto" />
            ) : !showSubscriptionUI ? (
              // Binaire CLIENT ou build non identifié : la page s'affiche,
              // mais ni tarif ni bouton d'achat (App Store 3.1.1(a)).
              <div className="max-w-xs mx-auto">
                <StateBanner state={state} sub={sub ?? null} isPastDue={sub?.status === 'past_due'} />
                <div className={`${CARTE} px-4 py-4 text-left`}>
                  <p className="text-[13px] font-semibold text-neutral-900 mb-1">CHAIR+ se gère dans l&apos;espace professionnel</p>
                  <p className="text-[12px] text-neutral-500 leading-relaxed">
                    La souscription et la résiliation se trouvent dans CHAIR PRO.
                    Déjà abonné ? Votre accès reste actif ici.
                  </p>
                  {appContext === 'unknown' && (
                    <p className="text-[11px] text-neutral-400 leading-relaxed mt-2 pt-2 border-t border-neutral-100">
                      Si vous utilisez CHAIR PRO, installez la dernière mise à jour
                      pour gérer l&apos;abonnement directement dans l&apos;app.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {error && <p className="text-xs text-red-500 mb-3 max-w-xs mx-auto">{error}</p>}
                {iapNotice && <p className="text-xs text-neutral-700 mb-3 font-semibold">{iapNotice}</p>}

                <StateBanner state={state} sub={sub ?? null} isPastDue={sub?.status === 'past_due'} />

                {canManage ? (
                  <PrimaryButton
                    onClick={handleManage}
                    loading={busy}
                    icon={<ExternalLink size={15} />}
                    className="w-full max-w-xs mx-auto"
                  >
                    Gérer mon abonnement
                  </PrimaryButton>
                ) : (
                  <>
                    <PrimaryButton
                      onClick={handleSubscribe}
                      loading={busy}
                      className="w-full max-w-xs mx-auto"
                    >
                      Essayer 30 jours gratuits
                      {!busy && <ArrowRight size={15} strokeWidth={2.5} />}
                    </PrimaryButton>
                    <p className="text-[12px] text-neutral-400 font-medium mt-3">
                      Puis {prixLabel}/mois. Sans engagement, annulable en deux taps.
                    </p>
                  </>
                )}

                {appContext === 'pro' && !canManage && (
                  <button
                    onClick={handleRestore}
                    disabled={busy}
                    className="relative before:absolute before:-inset-y-[10px] before:inset-x-0 before:content-[''] mt-4 text-[12px] font-semibold text-neutral-400 hover:text-neutral-700 transition-colors disabled:opacity-50 block mx-auto"
                  >
                    Déjà abonné via l&apos;App Store ? Restaurer mes achats
                  </button>
                )}

                <button
                  onClick={() => setSheetOpen(true)}
                  className="relative before:absolute before:-inset-y-[13px] before:inset-x-0 before:content-[''] mt-3 text-[12px] font-semibold text-neutral-400 underline underline-offset-4 decoration-neutral-200 hover:text-neutral-700 transition-colors"
                >
                  Aperçu rapide des avantages
                </button>
              </>
            )}
          </section>

          <div className="max-w-2xl mx-auto px-4 md:px-6 pb-16 space-y-8 md:space-y-10">

            {/* ══ TIMELINE DE L'ESSAI — la transparence qui rassure ══ */}
            {showSubscriptionUI && !canManage && (
              <section className={`${CARTE} p-6 md:p-7 max-w-md mx-auto w-full`}>
                <p className={`${MICRO_TITRE} mb-5`}>Comment marche l&apos;essai</p>
                <div className="relative pl-10">
                  {/* Le fil. */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-neutral-200" />
                  {[
                    { icon: Unlock,     t: "Aujourd'hui",  d: 'Accès complet à tout CHAIR+, gratuitement.', fort: true },
                    { icon: Bell,       t: 'Jour 27',      d: "On vous prévient avant la fin de l'essai — pas de surprise." },
                    { icon: CreditCard, t: 'Jour 30',      d: `${prixLabel}/mois. Ou vous annulez, et tout s'arrête là.` },
                  ].map((e) => (
                    <div key={e.t} className="relative flex items-start gap-4 pb-6 last:pb-0">
                      <div
                        className={`absolute -left-10 w-8 h-8 rounded-full flex items-center justify-center ${
                          e.fort ? 'bg-neutral-900' : 'bg-neutral-100'
                        }`}
                      >
                        <e.icon size={13} className={e.fort ? 'text-white' : 'text-neutral-500'} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 pt-1">
                        <p className="text-[13px] font-bold text-neutral-900">{e.t}</p>
                        <p className="text-[12px] text-neutral-500 leading-relaxed">{e.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ══ VEDETTE — le carnet client, LA carte sombre de la page ══ */}
            <section>
              <div className={`${CARTE_SOMBRE} p-6 md:p-7`}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <BookUser size={21} style={{ color: OR }} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-1" style={{ color: OR }}>
                      L&apos;outil qui fidélise
                    </p>
                    <p className="text-[18px] font-black leading-tight mb-1.5">Carnet client illimité</p>
                    <p className="text-[13px] text-white/55">
                      Notes, relances, rythme de retour — tous vos clients, plus seulement {CARNET_LIMITE}.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ══ AVANTAGES ══ */}
            <section>
              <p className={`${MICRO_TITRE} mb-2`}>Inclus dans CHAIR+</p>
              <h2 className="text-[22px] font-black text-neutral-900 tracking-tight mb-5">Et tout le reste</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURES.map((f) => (
                  <div key={f.label} className={`${CARTE} flex items-start gap-3.5 p-4`}>
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                      <f.icon size={16} className="text-neutral-700" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-neutral-900">{f.label}</p>
                      <p className="text-[12px] text-neutral-500 leading-relaxed mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ══ COMPARATIF ══ */}
            <section>
              <h2 className="text-[22px] font-black text-neutral-900 tracking-tight text-center mb-6">
                Gratuit vs <Wordmark />
              </h2>
              <div className={`${CARTE} overflow-hidden`}>
                <div className="grid grid-cols-[1fr_auto_auto] bg-neutral-50 border-b border-neutral-100">
                  <div className="px-4 py-3" />
                  <div className="px-2 py-3 w-24 text-center text-[11px] font-bold uppercase tracking-wide text-neutral-400">Gratuit</div>
                  <div className="px-2 py-3 w-24 text-center text-[11px] font-black uppercase tracking-wide bg-neutral-900 text-white">CHAIR+</div>
                </div>
                {COMPARISON.map((row, i) => (
                  <div key={row.label} className={`grid grid-cols-[1fr_auto_auto] items-center ${i !== COMPARISON.length - 1 ? 'border-b border-neutral-100' : ''}`}>
                    <div className="px-4 py-3.5 text-[13px] font-medium text-neutral-700">{row.label}</div>
                    <div className="px-2 py-3.5 w-24 flex items-center justify-center">
                      <CellValue value={row.free} muted />
                    </div>
                    <div className="px-2 py-3.5 w-24 flex items-center justify-center bg-neutral-50">
                      <CellValue value={row.plus} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ══ PARRAINAGE — l'autre chemin vers CHAIR+ ══ */}
            <section>
              <Link href="/pro/parrainage" className={`${CARTE_TAP} flex items-center gap-4 p-5 group`}>
                <div className="w-11 h-11 rounded-2xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <Gift size={18} className="text-neutral-700" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-black text-neutral-900 leading-tight">Ou gagnez-le sans payer</p>
                  <p className="text-[12px] text-neutral-500 leading-relaxed mt-0.5">
                    Parrainez un coiffeur : <span className="text-neutral-900 font-semibold">1 mois de CHAIR+ offert</span> pour
                    vous, 1 mois pour lui.
                  </p>
                </div>
                <ArrowRight size={16} className="text-neutral-300 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            </section>

            {/* ══ CTA FINAL — uniquement là où l'achat est autorisé ══ */}
            {showSubscriptionUI && !canManage && (
              <section className={`${CARTE_SOMBRE} p-8 md:p-10 text-center`}>
                <Sparkles size={20} className="mx-auto mb-4 text-white/50" />
                <h2 className="text-[22px] md:text-[26px] font-black tracking-tight mb-2">Essayez. C&apos;est offert.</h2>
                <p className="text-[13px] text-white/50 mb-7">30 jours complets, sans engagement. Vous jugez sur pièces.</p>
                <button
                  onClick={handleSubscribe}
                  disabled={busy}
                  className="inline-flex items-center gap-2 bg-white text-neutral-900 font-bold px-8 py-4 rounded-2xl text-[14px] hover:bg-neutral-100 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {busy ? 'Chargement...' : 'Essayer 30 jours gratuits'}
                  {!busy && <ArrowRight size={15} strokeWidth={2.5} />}
                </button>
              </section>
            )}
          </div>
        </>
      )}

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
    return <Check size={16} className={muted ? 'text-neutral-300' : 'text-neutral-900'} strokeWidth={muted ? 2 : 2.5} />;
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
        CHAIR+ n&apos;est pas encore disponible. Carnet client illimité, badge,
        boost et analytics avancées arrivent prochainement.
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

  if (isPastDue) {
    return (
      <div className={`${base} bg-amber-50 text-amber-700`}>
        <AlertTriangle size={14} className="flex-shrink-0" />
        Paiement refusé — mettez à jour votre moyen de paiement
      </div>
    );
  }

  if (state === 'trial') {
    const d = daysLeft(sub?.trial_ends_at ?? null);
    return (
      <div className={`${base} bg-neutral-100 text-neutral-900`}>
        <Clock size={14} className="text-neutral-500 flex-shrink-0" />
        Essai gratuit — {d} jour{d > 1 ? 's' : ''} restant{d > 1 ? 's' : ''}
      </div>
    );
  }
  if (state === 'premium') {
    return (
      <div className={`${base} bg-neutral-900 text-white`}>
        <Check size={14} className="text-white/70 flex-shrink-0" />
        {sub ? `Actif — renouvellement le ${fmtDate(sub.current_period_end)}` : 'CHAIR+ actif'}
      </div>
    );
  }
  if (state === 'cancel_scheduled') {
    return (
      <div className={`${base} bg-amber-50 text-amber-700`}>
        <AlertTriangle size={14} className="flex-shrink-0" />
        Annulation programmée — accès conservé jusqu&apos;au {fmtDate(sub?.current_period_end ?? null)}
      </div>
    );
  }
  if (state === 'expired') {
    return (
      <div className={`${base} bg-neutral-100 text-neutral-500`}>
        <AlertTriangle size={14} className="flex-shrink-0" />
        Abonnement expiré — réactivez pour retrouver l&apos;accès
      </div>
    );
  }
  return null;
}
