import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import LandingFooter from '@/components/landing/LandingFooter';
import FaqAccordion from '@/components/landing/FaqAccordion';
import PhoneStack from '@/components/landing/PhoneStack';
import MockupPhone, { FloatingBadge } from '@/components/landing/MockupPhone';
import { ArrowRight, Check, Star, BadgeCheck, Heart, Calendar, QrCode, BarChart2, Users, Scissors } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   FEATURE SECTION — texte + mockup, alternés, mobile-first
───────────────────────────────────────────────────────────── */
function FeatureSection({
  tag,
  title,
  body,
  checks,
  cta,
  mockup,
  reverse = false,
  dark = false,
}: {
  tag: string;
  title: React.ReactNode;
  body: string;
  checks?: string[];
  cta?: React.ReactNode;
  mockup: React.ReactNode;
  reverse?: boolean;
  dark?: boolean;
}) {
  const text = dark ? 'text-white' : 'text-neutral-900';
  const sub = dark ? 'text-white/35' : 'text-neutral-500';
  const tagCls = dark ? 'text-white/20' : 'text-neutral-300';
  const checkCls = dark ? 'text-emerald-400' : 'text-neutral-400';
  const checkText = dark ? 'text-white/55' : 'text-neutral-600';

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center ${reverse ? 'lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1' : ''}`}>
      {/* Texte */}
      <div className="text-center lg:text-left">
        <p className={`text-[10px] font-bold tracking-[0.28em] uppercase ${tagCls} mb-5`}>{tag}</p>
        <h2 className={`text-[38px] md:text-[44px] lg:text-[48px] font-bold ${text} leading-[1.0] tracking-[-0.02em] mb-5`}>{title}</h2>
        <p className={`text-[15px] ${sub} leading-relaxed mb-7 max-w-md mx-auto lg:mx-0`}>{body}</p>
        {checks && (
          <div className="space-y-3 mb-7 inline-flex flex-col items-start">
            {checks.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <Check size={12} className={`${checkCls} flex-shrink-0 mt-0.5`} strokeWidth={2.5} />
                <span className={`text-[13px] ${checkText} leading-snug text-left`}>{item}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-center lg:justify-start">{cta}</div>
      </div>
      {/* Mockup — centré sur mobile avec padding pour les badges, aligné sur lg */}
      <div className={`flex justify-center ${reverse ? 'lg:justify-end' : 'lg:justify-start'} items-center`}>
        <div className="relative px-14 lg:px-0">
          {mockup}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans overflow-x-hidden [&_section]:overflow-x-hidden">
      <LandingNav dark />

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden bg-[#0a0a0a]">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-1/2 left-1/4 w-[700px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.025] blur-[150px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />

        <div className="relative max-w-6xl mx-auto px-5 w-full pt-24 pb-12 lg:pt-0 lg:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 items-center w-full">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 border border-white/10 text-white/40 text-[10px] font-semibold tracking-[0.14em] uppercase px-3.5 py-2 rounded-full mb-10 bg-white/[0.04]">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Premier écosystème dédié à la coiffure
              </div>
              <h1 className="text-[58px] sm:text-[70px] lg:text-[80px] font-bold text-white leading-[0.88] tracking-[-0.035em] mb-6">
                Un coiffeur.<br />
                <span className="text-white/20">Pas un salon.</span>
              </h1>
              <p className="text-[16px] md:text-[18px] text-white/40 leading-relaxed mb-10 max-w-[400px] font-light">
                CHAIR réunit les meilleurs professionnels de la coiffure sur une plateforme unique.
                Découvrez leur univers. Choisissez votre expert. Réservez en direct.
              </p>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 mb-12">
                <Link href="/app" className="inline-flex items-center justify-center gap-2.5 bg-white text-neutral-900 font-bold text-[15px] px-7 py-4 rounded-2xl hover:bg-neutral-100 transition-all active:scale-[0.98] shadow-2xl shadow-white/10">
                  Télécharger CHAIR <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
                <Link href="/pro/inscription" className="inline-flex items-center justify-center gap-2 text-white/40 font-medium text-[15px] px-7 py-4 rounded-2xl border border-white/10 hover:border-white/25 hover:text-white/65 transition-all">
                  Je suis professionnel →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 border-t border-white/[0.07] pt-8 text-center lg:text-left">
                {[
                  { v: '+500', l: 'Professionnels' },
                  { v: '4.9', l: 'Note moyenne' },
                  { v: '100%', l: 'Avis certifiés' },
                  { v: '0€', l: 'Pour les clients' },
                ].map((s, i) => (
                  <div key={i}>
                    <p className="text-[24px] font-bold text-white mb-0.5 tracking-tight">{s.v}</p>
                    <p className="text-[11px] text-white/30">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden lg:flex justify-end items-center pr-4">
              <PhoneStack />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          LE PROBLÈME
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-32 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-5">
          <div className="max-w-3xl mb-14">
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-neutral-300 mb-6">Pourquoi CHAIR existe</p>
            <h2 className="text-[38px] sm:text-[46px] lg:text-[54px] font-bold text-neutral-900 leading-[1.0] tracking-[-0.02em] mb-6">
              Vous avez déjà réservé dans un salon sans savoir qui allait vous coiffer.
            </h2>
            <p className="text-[15px] lg:text-[17px] text-neutral-400 leading-relaxed">
              Le talent est caché derrière une adresse. Le professionnel n'existe pas en tant que personne.
              Son savoir-faire, ses spécialités, son univers — invisibles. CHAIR change ça, entièrement.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 lg:p-8 rounded-3xl bg-neutral-50 border border-neutral-100">
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-neutral-300 mb-6">Sans CHAIR</p>
              <div className="space-y-4">
                {[
                  "Vous réservez dans un salon, pas avec un coiffeur",
                  "Vous ne connaissez pas la personne qui va vous coiffer",
                  "Vous ne voyez pas son travail avant le rendez-vous",
                  "Les avis en ligne sont invérifiables",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-neutral-200 text-[16px] leading-none mt-0.5 flex-shrink-0">—</span>
                    <p className="text-[14px] text-neutral-400 leading-snug">{t}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 lg:p-8 rounded-3xl bg-neutral-900">
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/20 mb-6">Avec CHAIR</p>
              <div className="space-y-4">
                {[
                  "Vous choisissez un professionnel, pas une adresse",
                  "Vous voyez ses réalisations avant de réserver",
                  "Vous connaissez ses spécialités, son style, son univers",
                  "Chaque avis est certifié et lié à une vraie visite",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <p className="text-[14px] text-white/65 leading-snug">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          F1 — Découverte
      ══════════════════════════════════════════════════════ */}
      <section id="clients" className="py-20 lg:py-28 bg-neutral-50 border-t border-neutral-100 overflow-hidden">
        <div className="max-w-6xl mx-auto px-5">
          <FeatureSection
            tag="Découverte"
            title={<>Explorez des centaines<br />de professionnels.</>}
            body="CHAIR vous donne accès à un catalogue de professionnels classés par spécialité, ville et style. Trouvez l'expert qui correspond exactement à ce que vous cherchez."
            checks={[
              'Coupe homme, couleur, afro, mariage, extensions...',
              'Résultats par ville ou géolocalisation',
              'Filtres par spécialité et note minimale',
              'Coiffeurs salariés et indépendants',
            ]}
            cta={
              <Link href="/app" className="inline-flex items-center gap-2 bg-neutral-900 text-white font-bold text-[14px] px-6 py-3.5 rounded-2xl hover:bg-neutral-700 transition-all">
                Télécharger CHAIR <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            }
            mockup={
              <MockupPhone
                src="/mockups/mockup-profil.png"
                label="Recherche"
                placeholderBg="#f5f5f5"
                glow
                badges={
                  <>
                    <FloatingBadge className="-right-10 top-16">
                      <div className="flex items-center gap-2 mb-1">
                        <Scissors size={11} className="text-neutral-500" />
                        <span className="text-[11px] font-bold text-neutral-900">Coupe Homme</span>
                      </div>
                      <p className="text-[10px] text-neutral-400">32 coiffeurs près de vous</p>
                    </FloatingBadge>
                    <FloatingBadge className="-left-10 bottom-28">
                      <div className="flex items-center gap-1 mb-1">
                        {[1,2,3,4,5].map(i => <Star key={i} size={9} className="fill-amber-400 stroke-none" />)}
                      </div>
                      <p className="text-[11px] font-bold text-neutral-900">4.9 · Antoine B.</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Haguenau · 2.3 km</p>
                    </FloatingBadge>
                  </>
                }
              />
            }
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          F2 — Portfolio
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 bg-white border-t border-neutral-100 overflow-hidden">
        <div className="max-w-6xl mx-auto px-5">
          <FeatureSection
            reverse
            tag="Portfolio"
            title={<>Le travail<br />parle avant tout.</>}
            body="Chaque professionnel construit sa vitrine de réalisations. Avant de réserver, vous voyez son travail — pas une promesse marketing. De vraies photos, de vraies coiffures."
            checks={[
              'Photos avant / après pour chaque réalisation',
              'Classées par spécialité',
              'Directement sur le profil du coiffeur',
              'Mis à jour à chaque nouvelle création',
            ]}
            mockup={
              <MockupPhone
                src="/mockups/mockup-profil.png"
                label="Profil coiffeur"
                placeholderBg="#0f0f0f"
                glow
                badges={
                  <>
                    <FloatingBadge dark className="-left-12 top-20">
                      <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wide font-semibold">Portfolio</p>
                      <p className="text-[15px] font-bold text-white">47 réalisations</p>
                    </FloatingBadge>
                    <FloatingBadge className="-right-12 bottom-32">
                      <div className="flex items-center gap-1.5 mb-1">
                        <BadgeCheck size={12} className="text-neutral-900" />
                        <span className="text-[11px] font-bold text-neutral-900">Profil vérifié</span>
                      </div>
                      <p className="text-[10px] text-neutral-400">Coloriste · Haguenau</p>
                    </FloatingBadge>
                  </>
                }
              />
            }
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          F3 — Abonnements
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 bg-neutral-50 border-t border-neutral-100 overflow-hidden">
        <div className="max-w-6xl mx-auto px-5">
          <FeatureSection
            tag="Abonnements"
            title={<>Suivez les professionnels<br />qui vous inspirent.</>}
            body="Abonnez-vous à vos coiffeurs favoris. Recevez leurs nouvelles réalisations directement dans votre fil. Construisez une relation avec votre expert, dans la durée."
            checks={[
              'Fil personnalisé selon vos abonnements',
              'Notifications à chaque nouvelle publication',
              'Likez et partagez les réalisations',
              'Retrouvez vos coiffeurs favoris en un clic',
            ]}
            mockup={
              <MockupPhone
                src="/mockups/mockup-profil.png"
                label="Feed"
                placeholderBg="#0a0a0a"
                glow
                badges={
                  <>
                    <FloatingBadge dark className="-right-10 top-24">
                      <div className="flex items-center gap-2">
                        <Heart size={12} className="fill-white stroke-none" />
                        <span className="text-[12px] font-bold text-white">284</span>
                      </div>
                    </FloatingBadge>
                    <FloatingBadge className="-left-10 bottom-36">
                      <p className="text-[10px] text-neutral-400 mb-1">Nouveau post</p>
                      <p className="text-[12px] font-bold text-neutral-900">Marina S. · Coloriste</p>
                    </FloatingBadge>
                  </>
                }
              />
            }
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          F4 — Avis certifiés
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 bg-white border-t border-neutral-100 overflow-hidden">
        <div className="max-w-6xl mx-auto px-5">
          <FeatureSection
            reverse
            tag="Avis certifiés"
            title={<>Chaque avis est réel.<br /><span className="text-neutral-300">Sans exception.</span></>}
            body="Un avis sur CHAIR ne peut être déposé que par un client ayant réellement effectué une visite. À la fin de chaque prestation, le professionnel génère un QR code unique. Impossible de tricher."
            checks={[
              'QR code unique généré après chaque prestation',
              'Avis liés à une visite vérifiée',
              'Aucun avis anonyme non contrôlé',
              'Signalement et modération actifs',
            ]}
            mockup={
              <MockupPhone
                src="/mockups/mockup-profil.png"
                label="Dépôt d'avis"
                placeholderBg="#f9f9f9"
                glow
                badges={
                  <>
                    <FloatingBadge dark className="-left-12 top-20">
                      <p className="text-[10px] text-white/40 mb-1.5 font-semibold uppercase tracking-wide">Avis certifié</p>
                      <div className="flex gap-0.5 mb-1">
                        {[1,2,3,4,5].map(i => <Star key={i} size={11} className="fill-amber-400 stroke-none" />)}
                      </div>
                      <p className="text-[12px] font-bold text-white">5.0 · Visite vérifiée</p>
                    </FloatingBadge>
                    <FloatingBadge className="-right-10 bottom-24">
                      <div className="flex items-center gap-1.5">
                        <QrCode size={13} className="text-neutral-600" />
                        <span className="text-[11px] font-bold text-neutral-900">QR scanné</span>
                      </div>
                    </FloatingBadge>
                  </>
                }
              />
            }
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          F5 — Réservation
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 bg-neutral-50 border-t border-neutral-100 overflow-hidden">
        <div className="max-w-6xl mx-auto px-5">
          <FeatureSection
            tag="Réservation"
            title={<>Réservez directement.<br /><span className="text-neutral-300">En deux clics.</span></>}
            body="Directement sur le profil du professionnel. Choisissez votre prestation, votre créneau, confirmez. Pas d'appel, pas d'intermédiaire, pas d'attente."
            checks={[
              'Agenda disponible en temps réel',
              'Catalogue de prestations avec tarifs et durées',
              'Confirmation immédiate par notification',
              'Rappel automatique 24h et 1h avant',
            ]}
            cta={
              <Link href="/app" className="inline-flex items-center gap-2 bg-neutral-900 text-white font-bold text-[14px] px-6 py-3.5 rounded-2xl hover:bg-neutral-700 transition-all">
                Télécharger CHAIR <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            }
            mockup={
              <MockupPhone
                src="/mockups/mockup-profil.png"
                label="Réservation"
                placeholderBg="#fafafa"
                glow
                badges={
                  <>
                    <FloatingBadge dark className="-right-12 top-20">
                      <p className="text-[10px] text-white/40 mb-1">RDV confirmé</p>
                      <p className="text-[13px] font-bold text-white">Lundi · 10h00</p>
                      <p className="text-[10px] text-white/40 mt-0.5">Coupe + coloration</p>
                    </FloatingBadge>
                    <FloatingBadge className="-left-10 bottom-28">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} className="text-neutral-600" />
                        <span className="text-[11px] font-bold text-neutral-900">45 min · 55 €</span>
                      </div>
                    </FloatingBadge>
                  </>
                }
              />
            }
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CHAIR PRO — INTRO
      ══════════════════════════════════════════════════════ */}
      <section id="coiffeurs" className="py-20 lg:py-28 bg-[#0a0a0a] text-white border-t border-white/[0.04] overflow-hidden">
        <div className="max-w-6xl mx-auto px-5">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-white/20 mb-6">CHAIR PRO</p>
            <h2 className="text-[40px] sm:text-[48px] lg:text-[56px] font-bold text-white leading-[1.0] tracking-[-0.02em] mb-6">
              {"L'outil que la profession attendait."}
            </h2>
            <p className="text-[15px] lg:text-[17px] text-white/35 leading-relaxed">
              Coiffeur salarié, indépendant ou gérant de salon — chaque profil a ses propres outils,
              pensés pour sa réalité. Un seul objectif : vous donner les moyens de développer votre activité.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          F6 — Salarié
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 bg-[#0a0a0a] border-t border-white/[0.04] overflow-hidden">
        <div className="max-w-6xl mx-auto px-5">
          <FeatureSection
            dark
            tag="Coiffeur salarié"
            title={<>{"Votre identité,"}<br />{"au-delà du salon."}</>}
            body="Vous travaillez dans un salon mais votre talent vous appartient. CHAIR PRO vous donne un profil personnel, un portfolio, des abonnés. Votre réputation se construit réalisation après réalisation."
            checks={[
              'Profil professionnel entièrement personnel',
              'Portfolio de réalisations visible par tous',
              'Abonnés et avis certifiés sur votre nom',
              'Visibilité dans les résultats de recherche',
            ]}
            cta={
              <Link href="/pro/inscription" className="inline-flex items-center gap-2 bg-white text-neutral-900 font-bold text-[14px] px-6 py-3.5 rounded-2xl hover:bg-neutral-100 transition-all">
                Créer mon profil <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            }
            mockup={
              <MockupPhone
                src="/mockups/mockup-profil.png"
                label="Profil pro"
                placeholderBg="#111"
                glow
                badges={
                  <>
                    <FloatingBadge className="-right-12 top-16">
                      <p className="text-[10px] text-neutral-400 mb-1">Abonnés</p>
                      <p className="text-[18px] font-bold text-neutral-900">1 284</p>
                    </FloatingBadge>
                    <FloatingBadge dark className="-left-10 bottom-32">
                      <div className="flex items-center gap-1.5">
                        <BadgeCheck size={11} className="text-white" />
                        <span className="text-[11px] font-bold text-white">Profil vérifié</span>
                      </div>
                    </FloatingBadge>
                  </>
                }
              />
            }
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          F7 — Indépendant
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 bg-[#0a0a0a] border-t border-white/[0.04] overflow-hidden">
        <div className="max-w-6xl mx-auto px-5">
          <FeatureSection
            dark
            reverse
            tag="Coiffeur indépendant"
            title={<>Tout ce dont vous<br />avez besoin.<br /><span className="text-white/20">En un seul endroit.</span></>}
            body="Profil, portfolio, agenda, prestations, réservations, avis, statistiques. CHAIR PRO réunit tout ce qu'un indépendant doit gérer au quotidien."
            checks={[
              'Agenda et gestion des rendez-vous',
              'Catalogue de prestations avec tarifs',
              'Réservations directes depuis votre profil',
              'Statistiques : vues, abonnés, conversions',
              'Score CHAIR pour progresser dans les classements',
            ]}
            cta={
              <Link href="/pro/inscription" className="inline-flex items-center gap-2 bg-white text-neutral-900 font-bold text-[14px] px-6 py-3.5 rounded-2xl hover:bg-neutral-100 transition-all">
                Créer mon compte <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            }
            mockup={
              <MockupPhone
                src="/mockups/mockup-profil.png"
                label="Dashboard PRO"
                placeholderBg="#0d0d0d"
                glow
                badges={
                  <>
                    <FloatingBadge className="-left-12 top-20">
                      <p className="text-[10px] text-neutral-400 mb-1">Ce mois</p>
                      <p className="text-[17px] font-bold text-neutral-900">34 RDV</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">+12 vs mois dernier</p>
                    </FloatingBadge>
                    <FloatingBadge dark className="-right-10 bottom-28">
                      <div className="flex items-center gap-1.5">
                        <BarChart2 size={11} className="text-white/60" />
                        <span className="text-[11px] font-bold text-white">Score CHAIR</span>
                      </div>
                      <p className="text-[16px] font-bold text-white mt-1">847 pts</p>
                    </FloatingBadge>
                  </>
                }
              />
            }
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          F8 — Gérant de salon
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 bg-[#0a0a0a] border-t border-white/[0.04] overflow-hidden">
        <div className="max-w-6xl mx-auto px-5">
          <FeatureSection
            dark
            tag="Gérant de salon"
            title={<>Gérez, recrutez,<br />développez.</>}
            body="Créez le profil de votre établissement. Gérez votre équipe. Publiez des offres d'emploi. Louez vos fauteuils inutilisés. CHAIR PRO devient le centre de votre développement."
            checks={[
              "Profil salon avec équipe et réalisations",
              "Offres de recrutement visibles par toute la profession",
              "Location de fauteuils aux coiffeurs indépendants",
              "Visibilité de votre établissement dans les recherches",
            ]}
            cta={
              <Link href="/pro/inscription" className="inline-flex items-center gap-2 bg-white text-neutral-900 font-bold text-[14px] px-6 py-3.5 rounded-2xl hover:bg-neutral-100 transition-all">
                Créer mon salon <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            }
            mockup={
              <MockupPhone
                src="/mockups/mockup-profil.png"
                label="Dashboard salon"
                placeholderBg="#0f0f0f"
                glow
                badges={
                  <>
                    <FloatingBadge className="-right-12 top-20">
                      <p className="text-[10px] text-neutral-400 mb-1">Équipe</p>
                      <p className="text-[17px] font-bold text-neutral-900">6 coiffeurs</p>
                    </FloatingBadge>
                    <FloatingBadge dark className="-left-10 bottom-32">
                      <div className="flex items-center gap-1.5">
                        <Users size={11} className="text-white/60" />
                        <span className="text-[11px] font-bold text-white">2 candidatures</span>
                      </div>
                    </FloatingBadge>
                  </>
                }
              />
            }
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          F9 — Recrutement + Location fauteuils
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 bg-[#0a0a0a] border-t border-white/[0.04] overflow-hidden">
        <div className="max-w-6xl mx-auto px-5">
          <div className="mb-14">
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-white/20 mb-6">Nouveaux marchés</p>
            <h2 className="text-[38px] sm:text-[46px] lg:text-[54px] font-bold text-white leading-[1.0] tracking-[-0.02em] max-w-2xl">
              La profession se retrouve sur CHAIR.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12">

            {/* Recrutement */}
            <div>
              <div className="flex justify-center mb-8">
                <div className="scale-[0.82] sm:scale-90 lg:scale-100 origin-top">
                  <MockupPhone
                    src="/mockups/mockup-profil.png"
                    label="Recrutement"
                    placeholderBg="#111"
                    size="sm"
                    badges={
                      <FloatingBadge className="-right-8 bottom-16">
                        <p className="text-[10px] text-neutral-400 mb-0.5">Nouvelle offre</p>
                        <p className="text-[12px] font-bold text-neutral-900">Coloriste · Paris</p>
                      </FloatingBadge>
                    }
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/20 mb-4">Recrutement</p>
                <h3 className="text-[22px] lg:text-[26px] font-bold text-white leading-tight mb-4">
                  Les salons recrutent.<br />Les coiffeurs postulent.
                </h3>
                <p className="text-[14px] text-white/35 leading-relaxed mb-5">
                  Publiez vos offres directement sur CHAIR PRO. Les coiffeurs découvrent les opportunités et postulent avec leur profil complet en appui.
                </p>
                <div className="space-y-2.5">
                  {["Publication d'offres en quelques minutes", "Candidatures avec portfolio intégré", "Coiffeurs en recherche active identifiés"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Check size={12} className="text-emerald-400 flex-shrink-0" strokeWidth={2.5} />
                      <span className="text-[13px] text-white/40">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Location fauteuils */}
            <div>
              <div className="flex justify-center mb-8">
                <div className="scale-[0.82] sm:scale-90 lg:scale-100 origin-top">
                  <MockupPhone
                    src="/mockups/mockup-profil.png"
                    label="Location fauteuil"
                    placeholderBg="#111"
                    size="sm"
                    badges={
                      <FloatingBadge dark className="-right-8 top-16">
                        <p className="text-[10px] text-white/40 mb-0.5">Disponible</p>
                        <p className="text-[12px] font-bold text-white">Mardi · Jeudi</p>
                      </FloatingBadge>
                    }
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/20 mb-4">Location de fauteuils</p>
                <h3 className="text-[22px] lg:text-[26px] font-bold text-white leading-tight mb-4">
                  Un fauteuil vide est une opportunité manquée.
                </h3>
                <p className="text-[14px] text-white/35 leading-relaxed mb-5">
                  Un salon met à disposition ses fauteuils inutilisés. Un indépendant réserve un espace pour une journée ou une semaine. CHAIR crée ce marché.
                </p>
                <div className="space-y-2.5">
                  {["Salons : rentabilisez vos fauteuils inoccupés", "Indépendants : travaillez en salon sans contrainte", "Flexible : à la journée, à la semaine"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Check size={12} className="text-emerald-400 flex-shrink-0" strokeWidth={2.5} />
                      <span className="text-[13px] text-white/40">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA FINAL
      ══════════════════════════════════════════════════════ */}
      <section className="py-28 lg:py-40 bg-[#0a0a0a] text-white relative overflow-hidden border-t border-white/[0.04]">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-5 text-center">
          <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-white/20 mb-8">Le premier écosystème de la coiffure</p>
          <h2 className="text-[42px] sm:text-[54px] lg:text-[66px] font-bold text-white leading-[0.96] tracking-[-0.03em] mb-8">
            Les clients découvrent<br />
            les meilleurs talents.<br />
            <span className="text-white/20">Les professionnels grandissent.</span>
          </h2>
          <p className="text-[15px] lg:text-[16px] text-white/30 max-w-xl mx-auto mb-12 leading-relaxed">
            {"CHAIR n'est pas une application de réservation. C'est le premier endroit où toute la profession se retrouve — autour d'une seule conviction : le talent mérite d'être visible."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Link href="/app" className="inline-flex items-center justify-center gap-2.5 bg-white text-neutral-900 font-bold text-[15px] px-8 py-4 rounded-2xl hover:bg-neutral-100 transition-all shadow-2xl shadow-white/10">
              Télécharger CHAIR <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
            <Link href="/pro/inscription" className="inline-flex items-center justify-center gap-2 text-white/35 font-medium text-[15px] px-8 py-4 rounded-2xl border border-white/10 hover:border-white/20 hover:text-white/60 transition-all">
              Créer un compte professionnel →
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-5">
            {['Gratuit pour les clients', 'Salariés et indépendants', 'Gérants de salon', 'Avis 100% certifiés'].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[11px] text-white/25">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-32 bg-white overflow-hidden">
        <div className="max-w-3xl mx-auto px-5">
          <div className="mb-12">
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-neutral-300 mb-6">Questions fréquentes</p>
            <h2 className="text-[38px] lg:text-[40px] font-bold text-neutral-900 leading-[1.04] tracking-[-0.02em]">
              Tout ce que vous<br />devez savoir.
            </h2>
          </div>
          <FaqAccordion />
          <div className="mt-10 pt-8 border-t border-neutral-100">
            <p className="text-[14px] text-neutral-500">
              Une autre question ?{' '}
              <Link href="/contact" className="text-neutral-900 font-semibold hover:underline">Contactez-nous</Link>
            </p>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
