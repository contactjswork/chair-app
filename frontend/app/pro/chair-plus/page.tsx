'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { subscription } from '@/lib/api';
import type { ApiMySubscription } from '@/lib/types';
import { chairPlusState } from '@/lib/types';
import {
  ArrowLeft, Sparkles, Check, Clock, AlertTriangle, ExternalLink, ArrowRight,
  Camera, BadgeCheck, TrendingUp, Heart, BarChart3, Film, Headphones,
  ChevronDown, CalendarCheck, Repeat, Euro, Star, X,
  Bot, Download, LayoutTemplate, AtSign, FlaskConical,
} from 'lucide-react';

// ── Reveal — fondu discret au scroll, sans dépendance externe ──────────────

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────

const VALUE_PROPS = [
  {
    icon: TrendingUp, title: 'Plus de visibilité',
    desc: "Un léger boost dans les recherches locales et le badge Certifié CHAIR visible partout — recherche, profil, portfolio. Le mérite reste toujours le premier facteur de classement.",
  },
  {
    icon: CalendarCheck, title: 'Plus de réservations',
    desc: "Les vidéos courtes et les stories captent l'attention là où les photos seules ne suffisent plus — plus d'engagement, plus de clics vers votre profil.",
  },
  {
    icon: Repeat, title: 'Plus de fidélisation',
    desc: "Les stories créent un rendez-vous quotidien avec vos abonnés — un réflexe que les clients gardent, pas juste une visite ponctuelle.",
  },
  {
    icon: Euro, title: 'Plus de revenus',
    desc: "Les analytics premium vous montrent précisément ce qui convertit — visites, réalisations, avis — pour investir votre temps là où ça rapporte.",
  },
];

const FEATURES = [
  { icon: Camera,      name: 'Stories',                  desc: "24h, réservées à vos abonnés — un nouveau réflexe quotidien.", live: true },
  { icon: Film,        name: 'Vidéos courtes',            desc: "30s max, format portrait — montrez votre geste, pas juste le résultat.", live: true },
  { icon: BadgeCheck,  name: 'Badge Certifié CHAIR',      desc: "Visible sur votre profil, dans la recherche et le portfolio.", live: true },
  { icon: TrendingUp,  name: 'Boost local plafonné',      desc: "Un coup de pouce dans les recherches, sans jamais écraser le mérite.", live: true },
  { icon: Heart,       name: 'Coup de cœur CHAIR',        desc: "Éligibilité à la sélection éditoriale de l'équipe CHAIR.", live: true },
  { icon: BarChart3,   name: 'Analytics premium',         desc: "Visites, favoris, conversion — sur 7, 30 ou 90 jours.", live: true },
  { icon: Headphones,  name: 'Support prioritaire',       desc: "Vos demandes remontent en tête de file.", live: true },
];

const COMING_SOON = [
  { icon: Bot,            name: 'IA Premium',                     desc: 'Suggestions de contenu et de description automatiques.' },
  { icon: Download,       name: 'Export statistiques',             desc: 'Vos analytics en PDF ou Excel, prêtes à partager.' },
  { icon: LayoutTemplate, name: 'Page personnalisée',              desc: 'Mise en page de profil sur-mesure.' },
  { icon: AtSign,         name: "Nom d'utilisateur personnalisé",  desc: 'Un lien CHAIR à votre image.' },
  { icon: FlaskConical,   name: 'Bêta privée',                     desc: 'Testez les prochaines fonctionnalités en avant-première.' },
];

const COMPARISON: { label: string; free: boolean | string; plus: boolean | string }[] = [
  { label: 'Profil public + réservations en ligne', free: true, plus: true },
  { label: 'Portfolio (photos illimitées)',          free: true, plus: true },
  { label: 'Réalisation épinglée en tête',           free: true, plus: true },
  { label: 'Badges & classement CHAIR',              free: true, plus: true },
  { label: 'Stories (24h)',                          free: false, plus: true },
  { label: 'Vidéos courtes',                         free: false, plus: true },
  { label: 'Badge Certifié CHAIR',                   free: false, plus: true },
  { label: 'Boost local plafonné',                   free: false, plus: true },
  { label: 'Éligibilité Coup de cœur CHAIR',          free: false, plus: true },
  { label: 'Analytics',                              free: '7 jours', plus: 'Jusqu\'à 90 jours + conversion' },
  { label: 'Support',                                 free: 'Standard', plus: 'Prioritaire' },
];

const FAQ = [
  { q: "Comment fonctionne l'essai gratuit ?", a: "30 jours d'accès complet à CHAIR+ dès l'activation, sans engagement. Aucun prélèvement avant la fin de l'essai." },
  { q: 'Puis-je annuler à tout moment ?', a: "Oui, en un clic depuis \"Gérer mon abonnement\". Vous gardez l'accès jusqu'à la fin de la période déjà payée — jamais coupé en cours de route." },
  { q: 'Le paiement est-il sécurisé ?', a: 'Le paiement est géré entièrement par Stripe, leader mondial du paiement en ligne — CHAIR ne stocke jamais vos coordonnées bancaires.' },
  { q: 'Le boost local, est-ce du "pay to win" ?', a: "Non. Le boost CHAIR+ est un bonus léger et plafonné, toujours inférieur aux facteurs de mérite (avis, activité, complétion du profil). Un profil excellent et gratuit reste devant un profil boosté mais faible." },
  { q: 'Que se passe-t-il si mon paiement échoue ?', a: "Stripe retente automatiquement le prélèvement pendant quelques jours — vous gardez l'accès pendant cette fenêtre. L'accès n'est coupé qu'après un échec définitif ou une annulation." },
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

  const [data, setData] = useState<ApiMySubscription | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const sub = data?.subscription;
  const hasPlus = data?.has_chair_plus ?? false;
  const state = chairPlusState(hasPlus, sub ?? null);

  return (
    <div className="min-h-screen bg-white">

      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-neutral-100 px-4 h-14 flex items-center md:hidden">
        <Link href="/pro" className="flex items-center text-neutral-500 hover:text-neutral-900 transition-colors mr-auto p-1 -ml-1 rounded-lg">
          <ArrowLeft size={18} />
        </Link>
        <span className="text-sm font-bold tracking-tight text-neutral-900 absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
          <Sparkles size={13} /> CHAIR+
        </span>
      </div>

      <div className="hidden md:flex items-center gap-3 max-w-3xl mx-auto px-6 pt-8">
        <Link href="/pro" className="flex items-center text-neutral-400 hover:text-neutral-700 transition-colors p-1 -ml-1 rounded-lg">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-neutral-200">/</span>
        <h1 className="text-lg font-bold text-neutral-900">CHAIR+</h1>
      </div>

      {checkoutResult === 'success' && (
        <div className="max-w-3xl mx-auto px-4 md:px-6 pt-4">
          <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 text-sm text-green-700 font-semibold flex items-center gap-2">
            <Check size={15} />Abonnement en cours d&apos;activation — quelques secondes le temps que Stripe confirme.
          </div>
        </div>
      )}
      {checkoutResult === 'cancel' && (
        <div className="max-w-3xl mx-auto px-4 md:px-6 pt-4">
          <div className="bg-neutral-100 rounded-2xl px-4 py-3 text-sm text-neutral-600">
            Abonnement annulé — vous pouvez réessayer à tout moment.
          </div>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-neutral-900">
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{
          background: 'radial-gradient(600px circle at 50% -10%, rgba(255,255,255,0.12), transparent 60%)',
        }} />
        <div className="relative max-w-3xl mx-auto px-6 pt-12 pb-10 md:pt-16 md:pb-14 text-center">
          <div className="inline-flex items-center gap-1.5 bg-white/10 text-white text-[11px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-6">
            <Sparkles size={12} /> Premium
          </div>
          <h1 className="text-[32px] md:text-[44px] font-black text-white leading-[1.08] tracking-tight mb-4">
            Passe au niveau<br />supérieur.
          </h1>
          <p className="text-[15px] md:text-base text-white/60 max-w-md mx-auto leading-relaxed mb-8">
            Développe ton activité, améliore ton référencement et fidélise tes clients.
          </p>

          {dataLoading ? (
            <div className="h-32 bg-white/5 rounded-2xl animate-pulse max-w-xs mx-auto" />
          ) : (
            <>
              <div className="flex items-end justify-center gap-1 mb-1">
                <span className="text-[15px] text-white/50 font-semibold mb-1.5">€</span>
                <span className="text-5xl font-black text-white tracking-tight">9,99</span>
                <span className="text-[15px] text-white/50 font-semibold mb-1.5">/mois</span>
              </div>
              <p className="text-xs text-white/40 font-medium mb-7">
                30 jours d&apos;essai gratuit · sans engagement · annulation à tout moment
              </p>

              {error && <p className="text-xs text-red-300 mb-3">{error}</p>}

              <StateBanner state={state} sub={sub ?? null} isPastDue={sub?.status === 'past_due'} />

              {/* Expiré : sub existe encore (ligne canceled en base) mais ne couvre
                  plus rien — il faut se réabonner (nouveau Checkout), pas gérer
                  une souscription Stripe déjà terminée. */}
              {sub && state !== 'expired' ? (
                <button
                  onClick={handleManage}
                  disabled={busy}
                  className="group relative w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-white text-neutral-900 font-bold py-4 rounded-2xl text-[15px] hover:bg-neutral-100 transition-all disabled:opacity-50 shadow-[0_0_0_0_rgba(255,255,255,0.3)] hover:shadow-[0_0_0_8px_rgba(255,255,255,0.08)]"
                >
                  <ExternalLink size={15} />{busy ? 'Chargement...' : 'Gérer mon abonnement'}
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={busy}
                  className="group relative w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-white text-neutral-900 font-bold py-4 rounded-2xl text-[15px] hover:bg-neutral-100 transition-all disabled:opacity-50 shadow-[0_0_0_0_rgba(255,255,255,0.3)] hover:shadow-[0_0_0_8px_rgba(255,255,255,0.08)] animate-[pulse-glow_2.4s_ease-in-out_infinite]"
                >
                  {busy ? 'Chargement...' : state === 'expired' ? 'Réactiver CHAIR+' : 'Commencer gratuitement'}
                  {!busy && <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
                </button>
              )}
            </>
          )}
        </div>
        <style>{`
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.25); }
            50% { box-shadow: 0 0 0 10px rgba(255,255,255,0); }
          }
        `}</style>
      </section>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-14 md:py-20 space-y-16 md:space-y-24">

        {/* ── Pourquoi CHAIR+ ── */}
        <section>
          <Reveal><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 text-center mb-2">Pourquoi CHAIR+</p></Reveal>
          <Reveal><h2 className="text-2xl md:text-3xl font-black text-neutral-900 text-center mb-10 md:mb-14">Ce que ça change vraiment</h2></Reveal>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
            {VALUE_PROPS.map((v, i) => (
              <Reveal key={v.title} delay={i * 80}>
                <div className="h-full bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
                  <div className="flex items-center gap-0.5 mb-4 text-neutral-900">
                    {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={13} fill="currentColor" />)}
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-neutral-900 flex items-center justify-center mb-4">
                    <v.icon size={19} className="text-white" strokeWidth={1.5} />
                  </div>
                  <p className="font-bold text-neutral-900 mb-1.5">{v.title}</p>
                  <p className="text-[13px] text-neutral-500 leading-relaxed">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Comparatif ── */}
        <section>
          <Reveal><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 text-center mb-2">Comparer</p></Reveal>
          <Reveal><h2 className="text-2xl md:text-3xl font-black text-neutral-900 text-center mb-10 md:mb-14">Gratuit vs CHAIR+</h2></Reveal>
          <Reveal>
            <div className="rounded-2xl border border-neutral-100 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] bg-neutral-50 border-b border-neutral-100">
                <div className="px-4 py-3" />
                <div className="px-4 py-3 w-20 text-center text-[11px] font-bold uppercase tracking-wide text-neutral-400">Gratuit</div>
                <div className="px-4 py-3 w-28 text-center text-[11px] font-bold uppercase tracking-wide text-neutral-900 bg-neutral-100">CHAIR+</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div key={row.label} className={`grid grid-cols-[1fr_auto_auto] items-center ${i !== COMPARISON.length - 1 ? 'border-b border-neutral-50' : ''}`}>
                  <div className="px-4 py-3.5 text-[13px] font-medium text-neutral-700">{row.label}</div>
                  <div className="px-4 py-3.5 w-20 flex items-center justify-center">
                    {typeof row.free === 'boolean'
                      ? (row.free ? <Check size={16} className="text-neutral-400" /> : <X size={14} className="text-neutral-200" />)
                      : <span className="text-[11px] font-semibold text-neutral-400">{row.free}</span>}
                  </div>
                  <div className="px-4 py-3.5 w-28 flex items-center justify-center bg-neutral-50/60">
                    {typeof row.plus === 'boolean'
                      ? (row.plus ? <Check size={16} className="text-neutral-900" strokeWidth={2.5} /> : <X size={14} className="text-neutral-200" />)
                      : <span className="text-[11px] font-bold text-neutral-900 text-center">{row.plus}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── Ce que les membres utilisent le plus ── */}
        <section>
          <Reveal><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 text-center mb-2">Populaire</p></Reveal>
          <Reveal><h2 className="text-2xl md:text-3xl font-black text-neutral-900 text-center mb-10 md:mb-14">Ce que les membres CHAIR+ utilisent le plus</h2></Reveal>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.name} delay={i * 60}>
                <div className="h-full bg-white rounded-2xl border border-neutral-100 p-4 hover:border-neutral-300 hover:shadow-sm transition-all">
                  <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center mb-3">
                    <f.icon size={15} className="text-white" strokeWidth={1.5} />
                  </div>
                  <p className="text-[13px] font-bold text-neutral-900 mb-1">{f.name}</p>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── À venir ── */}
        <section>
          <Reveal><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 text-center mb-2">Feuille de route</p></Reveal>
          <Reveal><h2 className="text-2xl md:text-3xl font-black text-neutral-900 text-center mb-10 md:mb-14">Bientôt disponible</h2></Reveal>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {COMING_SOON.map((f, i) => (
              <Reveal key={f.name} delay={i * 60}>
                <div className="h-full bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 p-4 opacity-70">
                  <div className="w-9 h-9 rounded-xl bg-neutral-200 flex items-center justify-center mb-3">
                    <f.icon size={15} className="text-neutral-500" strokeWidth={1.5} />
                  </div>
                  <p className="text-[13px] font-bold text-neutral-600 mb-1">{f.name}</p>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section>
          <Reveal><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 text-center mb-2">Questions</p></Reveal>
          <Reveal><h2 className="text-2xl md:text-3xl font-black text-neutral-900 text-center mb-10 md:mb-14">Foire aux questions</h2></Reveal>
          <div className="space-y-2 max-w-xl mx-auto">
            {FAQ.map((item, i) => {
              const open = openFaq === i;
              return (
                <Reveal key={item.q} delay={i * 50}>
                  <div className="border border-neutral-100 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-neutral-50 transition-colors"
                    >
                      <span className="text-[13px] font-bold text-neutral-900">{item.q}</span>
                      <ChevronDown size={16} className={`text-neutral-400 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                        <p className="px-5 pb-4 text-[13px] text-neutral-500 leading-relaxed">{item.a}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ── CTA final ── */}
        {!hasPlus && (
          <Reveal>
            <section className="bg-neutral-900 rounded-3xl p-8 md:p-12 text-center">
              <Sparkles size={22} className="text-white/50 mx-auto mb-4" />
              <h2 className="text-2xl md:text-3xl font-black text-white mb-3">Prêt à passer au niveau supérieur ?</h2>
              <p className="text-sm text-white/50 mb-7 max-w-sm mx-auto">30 jours d&apos;essai gratuit. Sans engagement. Annulation à tout moment.</p>
              <button
                onClick={handleSubscribe}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-white text-neutral-900 font-bold px-8 py-4 rounded-2xl text-[15px] hover:bg-neutral-100 transition-colors disabled:opacity-50"
              >
                {busy ? 'Chargement...' : 'Commencer gratuitement'}
                {!busy && <ArrowRight size={15} />}
              </button>
            </section>
          </Reveal>
        )}
      </div>
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
      <div className={`${base} bg-amber-500/15 text-amber-200`}>
        <AlertTriangle size={14} className="flex-shrink-0" />
        Paiement refusé — mettez à jour votre moyen de paiement pour ne pas perdre l&apos;accès
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
      <div className={`${base} bg-amber-500/15 text-amber-200`}>
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
