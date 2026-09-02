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
import { acheterChairPlus, restaurerChairPlus, gererAbonnementApple, iapDisponible, prixChairPlusApple, AchatAnnule } from '@/lib/iap';
import {
  ArrowLeft, Check, Clock, AlertTriangle, ExternalLink, ArrowRight,
  BadgeCheck, TrendingUp, Heart, BarChart3, Film, Pin, X, Sparkles, BookUser,
  Unlock, Bell, CreditCard, Gift,
} from 'lucide-react';

// ── CHAIR+ — la page « carte noire » ─────────────────────────────────────
//
// Seule page 100 % sombre de CHAIR PRO — c'est voulu : l'abonnement premium
// vit dans son propre univers, il tranche avec tout le reste de l'app.
// Un seul accent : l'or (#f5b942), utilisé franchement (CTA, « + », vedette).
//
// Contenu (retours Julien 01-02/09) :
//  - stories GRATUITES (sorties de l'offre) ;
//  - carnet client = argument n°1 (25 clients sans CHAIR+, illimité avec) ;
//  - timeline d'essai transparente (J1 / J27 alerte / J30 débit) ;
//  - carte parrainage « gagne-le sans payer » (1 mois chacun).

const CARNET_LIMITE = 25; // miroir de ClientBookController::CARNET_GRATUIT_MAX

const OR = '#f5b942';

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
  { label: 'Portfolio et stories',         free: true,          plus: true },
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
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/10 border-t-white rounded-full animate-spin" />
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
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-[#f5b942] selection:text-black">

      {/* En-tête — même univers sombre que la page. */}
      <div className="sticky top-0 z-20 bg-[#0a0a0b]/85 backdrop-blur-md border-b border-white/[0.06] px-4 h-14 flex items-center md:hidden">
        <Link href="/pro" className="relative before:absolute before:-inset-2.5 before:content-[''] flex items-center text-white/50 hover:text-white transition-colors mr-auto p-1 -ml-1 rounded-lg">
          <ArrowLeft size={18} />
        </Link>
        <span className="text-sm font-black tracking-tight absolute left-1/2 -translate-x-1/2">
          CHAIR<span style={{ color: OR }}>+</span>
        </span>
      </div>

      <div className="hidden md:flex items-center gap-3 max-w-2xl mx-auto px-6 pt-8">
        <Link href="/pro" className="flex items-center text-white/40 hover:text-white/80 transition-colors p-1 -ml-1 rounded-lg">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-white/15">/</span>
        <h1 className="text-lg font-black tracking-tight">CHAIR<span style={{ color: OR }}>+</span></h1>
      </div>

      {showComingSoon ? (
        <ComingSoonState />
      ) : (
        <>
          {checkoutResult === 'success' && (
            <div className="max-w-2xl mx-auto px-4 md:px-6 pt-4">
              <div className="bg-white text-black rounded-2xl px-4 py-3 text-sm font-semibold flex items-center gap-2">
                <Check size={15} />Abonnement en cours d&apos;activation — quelques secondes le temps que Stripe confirme.
              </div>
            </div>
          )}
          {checkoutResult === 'cancel' && (
            <div className="max-w-2xl mx-auto px-4 md:px-6 pt-4">
              <div className="bg-white/[0.06] rounded-2xl px-4 py-3 text-sm text-white/70">
                Abonnement annulé — vous pouvez réessayer à tout moment.
              </div>
            </div>
          )}

          {/* ══ HERO ══ */}
          <section className="relative overflow-hidden">
            {/* Halo doré derrière le wordmark — la seule lumière de la page. */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[720px] h-[420px]"
              style={{ background: `radial-gradient(closest-side, ${OR}26 0%, ${OR}0d 45%, transparent 75%)` }}
            />

            <div className="relative max-w-2xl mx-auto px-6 pt-14 pb-12 md:pt-20 md:pb-16 text-center">
              <p className="text-[34px] md:text-[40px] font-black tracking-tight leading-none mb-7">
                CHAIR<span style={{ color: OR }}>+</span>
              </p>

              <h2 className="text-[40px] md:text-[54px] font-black leading-[0.98] tracking-tight mb-4">
                Passez<br />devant.
              </h2>
              <p className="text-[14px] md:text-[15px] text-white/50 font-medium max-w-sm mx-auto mb-9 leading-relaxed">
                La visibilité, le badge, le carnet illimité — tout ce qui
                sépare un bon coiffeur d&apos;un coiffeur qu&apos;on remarque.
              </p>

              {dataLoading || flagLoading ? (
                <div className="h-24 bg-white/5 rounded-2xl animate-pulse max-w-xs mx-auto" />
              ) : !showSubscriptionUI ? (
                // Binaire CLIENT ou build non identifié : la page s'affiche,
                // mais ni tarif ni bouton d'achat (App Store 3.1.1(a)).
                <div className="max-w-xs mx-auto">
                  <StateBanner state={state} sub={sub ?? null} isPastDue={sub?.status === 'past_due'} />
                  <div className="bg-white/[0.06] ring-1 ring-white/[0.08] rounded-2xl px-4 py-4 text-left">
                    <p className="text-[13px] font-semibold mb-1">CHAIR+ se gère dans l&apos;espace professionnel</p>
                    <p className="text-[12px] text-white/50 leading-relaxed">
                      La souscription et la résiliation se trouvent dans CHAIR PRO.
                      Déjà abonné ? Votre accès reste actif ici.
                    </p>
                    {appContext === 'unknown' && (
                      <p className="text-[11px] text-white/35 leading-relaxed mt-2 pt-2 border-t border-white/10">
                        Si vous utilisez CHAIR PRO, installez la dernière mise à jour
                        pour gérer l&apos;abonnement directement dans l&apos;app.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {error && <p className="text-xs text-red-300 mb-3 max-w-xs mx-auto">{error}</p>}
                  {iapNotice && <p className="text-xs text-white/80 mb-3 font-semibold">{iapNotice}</p>}

                  <StateBanner state={state} sub={sub ?? null} isPastDue={sub?.status === 'past_due'} />

                  {canManage ? (
                    <button
                      onClick={handleManage}
                      disabled={busy}
                      className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-white text-black font-bold py-4 rounded-2xl text-[15px] hover:bg-neutral-200 transition-colors disabled:opacity-50"
                    >
                      <ExternalLink size={15} />{busy ? 'Chargement...' : 'Gérer mon abonnement'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSubscribe}
                        disabled={busy}
                        className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 font-black py-4 rounded-2xl text-[15px] text-black active:scale-[0.99] transition-all disabled:opacity-60"
                        style={{
                          background: `linear-gradient(180deg, #f9cf6b 0%, ${OR} 55%, #e3a52e 100%)`,
                          boxShadow: `0 14px 38px -12px ${OR}66, inset 0 1px 0 rgba(255,255,255,0.45)`,
                        }}
                      >
                        {busy ? 'Chargement...' : 'Essayer 30 jours gratuits'}
                        {!busy && <ArrowRight size={16} strokeWidth={2.5} />}
                      </button>
                      <p className="text-[12px] text-white/40 font-medium mt-3">
                        Puis {prixLabel}/mois. Sans engagement, annulable en deux taps.
                      </p>
                    </>
                  )}

                  {appContext === 'pro' && !canManage && (
                    <button
                      onClick={handleRestore}
                      disabled={busy}
                      className="relative before:absolute before:-inset-y-[10px] before:inset-x-0 before:content-[''] mt-4 text-[12px] font-semibold text-white/45 hover:text-white/80 transition-colors disabled:opacity-50 block mx-auto"
                    >
                      Déjà abonné via l&apos;App Store ? Restaurer mes achats
                    </button>
                  )}

                  <button
                    onClick={() => setSheetOpen(true)}
                    className="relative before:absolute before:-inset-y-[13px] before:inset-x-0 before:content-[''] mt-3 text-[12px] font-semibold text-white/35 underline underline-offset-4 decoration-white/15 hover:text-white/70 transition-colors"
                  >
                    Aperçu rapide des avantages
                  </button>
                </>
              )}
            </div>
          </section>

          <div className="max-w-2xl mx-auto px-4 md:px-6 pb-16 space-y-12 md:space-y-16">

            {/* ══ TIMELINE DE L'ESSAI — la transparence qui rassure ══ */}
            {showSubscriptionUI && !canManage && (
              <section className="max-w-md mx-auto w-full">
                <div className="relative pl-10">
                  {/* Le fil. */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-[#f5b942] via-white/20 to-white/10" />
                  {[
                    { icon: Unlock,     t: "Aujourd'hui",  d: 'Accès complet à tout CHAIR+, gratuitement.', or: true },
                    { icon: Bell,       t: 'Jour 27',      d: "On vous prévient avant la fin de l'essai — pas de surprise." },
                    { icon: CreditCard, t: 'Jour 30',      d: `${prixLabel}/mois. Ou vous annulez, et tout s'arrête là.` },
                  ].map((e) => (
                    <div key={e.t} className="relative flex items-start gap-4 pb-6 last:pb-0">
                      <div
                        className="absolute -left-10 w-8 h-8 rounded-full flex items-center justify-center ring-1"
                        style={e.or
                          ? { background: `${OR}1f`, borderColor: `${OR}55`, boxShadow: `0 0 18px -4px ${OR}59` }
                          : { background: 'rgba(255,255,255,0.05)' }}
                      >
                        <e.icon size={13} style={{ color: e.or ? OR : 'rgba(255,255,255,0.55)' }} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 pt-1">
                        <p className="text-[13px] font-bold">{e.t}</p>
                        <p className="text-[12px] text-white/45 leading-relaxed">{e.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ══ VEDETTE — le carnet client, bordure dorée ══ */}
            <section>
              <div
                className="rounded-[28px] p-[1.5px]"
                style={{ background: `linear-gradient(135deg, ${OR}99 0%, ${OR}22 35%, rgba(255,255,255,0.06) 100%)` }}
              >
                <div className="rounded-[26.5px] bg-[#111113] p-6 md:p-7">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${OR}1a` }}
                    >
                      <BookUser size={21} style={{ color: OR }} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: `${OR}cc` }}>
                        L&apos;outil qui fidélise
                      </p>
                      <p className="text-[18px] font-black leading-tight mb-1.5">Carnet client illimité</p>
                      <p className="text-[13px] text-white/55 leading-relaxed">
                        Notes privées, conseils, rythme de retour, relances — sur TOUS vos
                        clients. Sans CHAIR+, votre carnet s&apos;arrête aux {CARNET_LIMITE} derniers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ══ AVANTAGES ══ */}
            <section>
              <h2 className="text-[22px] font-black tracking-tight mb-5">Et tout le reste</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURES.map((f) => (
                  <div key={f.label} className="flex items-start gap-3.5 bg-white/[0.04] rounded-[20px] p-4 ring-1 ring-white/[0.06] hover:ring-white/[0.12] transition-shadow">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.07] flex items-center justify-center flex-shrink-0">
                      <f.icon size={16} className="text-white/80" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold">{f.label}</p>
                      <p className="text-[12px] text-white/45 leading-relaxed mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ══ COMPARATIF ══ */}
            <section>
              <h2 className="text-[22px] font-black tracking-tight text-center mb-6">Gratuit vs CHAIR<span style={{ color: OR }}>+</span></h2>
              <div className="rounded-[22px] ring-1 ring-white/[0.08] overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto] bg-white/[0.03] border-b border-white/[0.06]">
                  <div className="px-4 py-3" />
                  <div className="px-2 py-3 w-24 text-center text-[11px] font-bold uppercase tracking-wide text-white/35">Gratuit</div>
                  <div className="px-2 py-3 w-24 text-center text-[11px] font-black uppercase tracking-wide text-black" style={{ background: OR }}>CHAIR+</div>
                </div>
                {COMPARISON.map((row, i) => (
                  <div key={row.label} className={`grid grid-cols-[1fr_auto_auto] items-center ${i !== COMPARISON.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
                    <div className="px-4 py-3.5 text-[13px] font-medium text-white/75">{row.label}</div>
                    <div className="px-2 py-3.5 w-24 flex items-center justify-center">
                      <CellValue value={row.free} muted />
                    </div>
                    <div className="px-2 py-3.5 w-24 flex items-center justify-center" style={{ background: `${OR}0f` }}>
                      <CellValue value={row.plus} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ══ PARRAINAGE — l'autre chemin vers CHAIR+ ══ */}
            <section>
              <Link
                href="/pro/parrainage"
                className="flex items-center gap-4 bg-white/[0.04] hover:bg-white/[0.07] ring-1 ring-white/[0.06] rounded-[24px] p-5 transition-colors group"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${OR}1a` }}
                >
                  <Gift size={18} style={{ color: OR }} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-black leading-tight">Ou gagnez-le sans payer</p>
                  <p className="text-[12px] text-white/45 leading-relaxed mt-0.5">
                    Parrainez un coiffeur : <span className="text-white/80 font-semibold">1 mois de CHAIR+ offert</span> pour
                    vous, 1 mois pour lui.
                  </p>
                </div>
                <ArrowRight size={16} className="text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            </section>

            {/* ══ CTA FINAL — uniquement là où l'achat est autorisé ══ */}
            {showSubscriptionUI && !canManage && (
              <section className="relative overflow-hidden rounded-[28px] ring-1 ring-white/[0.07] p-8 md:p-10 text-center">
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 -top-24 -translate-x-1/2 w-[520px] h-[300px]"
                  style={{ background: `radial-gradient(closest-side, ${OR}21 0%, transparent 72%)` }}
                />
                <Sparkles size={20} className="mx-auto mb-4" style={{ color: OR }} />
                <h2 className="text-[22px] md:text-[26px] font-black tracking-tight mb-2">Essayez. C&apos;est offert.</h2>
                <p className="text-[13px] text-white/45 mb-7">30 jours complets, sans engagement. Vous jugez sur pièces.</p>
                <button
                  onClick={handleSubscribe}
                  disabled={busy}
                  className="inline-flex items-center gap-2 font-black px-8 py-4 rounded-2xl text-[14px] text-black transition-all active:scale-[0.99] disabled:opacity-60"
                  style={{
                    background: `linear-gradient(180deg, #f9cf6b 0%, ${OR} 55%, #e3a52e 100%)`,
                    boxShadow: `0 14px 38px -12px ${OR}66, inset 0 1px 0 rgba(255,255,255,0.45)`,
                  }}
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
    return <span className={`text-[11px] font-bold tabular-nums ${muted ? 'text-white/40' : 'text-white'}`}>{value}</span>;
  }
  if (value) {
    return <Check size={16} className={muted ? 'text-white/35' : 'text-white'} strokeWidth={muted ? 2 : 2.5} />;
  }
  return <X size={14} className="text-white/15" />;
}

// ── État "pas encore disponible" — flag désactivé, honnête, pas de CTA. ──

function ComingSoonState() {
  const [notified, setNotified] = useState(false);

  return (
    <div className="max-w-sm mx-auto px-6 py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-5">
        <Sparkles size={22} className="text-white/40" strokeWidth={1.5} />
      </div>
      <h1 className="text-xl font-black mb-2">Bientôt disponible</h1>
      <p className="text-sm text-white/45 leading-relaxed mb-6">
        CHAIR+ n&apos;est pas encore disponible. Carnet client illimité, badge,
        boost et analytics avancées arrivent prochainement.
      </p>
      {!notified ? (
        <button
          onClick={() => setNotified(true)}
          className="text-sm font-semibold underline underline-offset-4 decoration-white/25 hover:decoration-white transition-colors"
        >
          Me prévenir de la sortie
        </button>
      ) : (
        <p className="text-sm text-white/40">Merci — on vous tient au courant.</p>
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
  return null;
}
