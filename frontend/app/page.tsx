import Link from 'next/link';
import Image from 'next/image';
import LandingNav from '@/components/landing/LandingNav';
import LandingFooter from '@/components/landing/LandingFooter';
import FaqAccordion from '@/components/landing/FaqAccordion';
import MockupPhone from '@/components/landing/MockupPhone';
import Reveal from '@/components/ui/Reveal';
import HeroSearch from '@/components/ui/HeroSearch';
import { ArrowRight, Star } from 'lucide-react';
import type { ApiLeaderboardEntry, ApiPost, ApiHairdresserProfile, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAfterImage } from '@/lib/types';
import { SPECIALTY_LABELS } from '@/lib/explore';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ISR — page statique régénérée toutes les 5 min (coiffeurs vedettes,
// classement, réalisations changent lentement, pas besoin de temps réel).
export const revalidate = 300;

async function getTopRanked(): Promise<ApiLeaderboardEntry[]> {
  try {
    const res = await fetch(`${API}/leaderboard?limit=3`);
    if (!res.ok) return [];
    const data: { results?: ApiLeaderboardEntry[] } = await res.json();
    return data.results ?? [];
  } catch { return []; }
}

async function getFeaturedHairdressers(): Promise<ApiHairdresserProfile[]> {
  try {
    const res = await fetch(`${API}/hairdressers?sort=featured&per_page=8`);
    if (!res.ok) return [];
    const data: PaginatedResponse<ApiHairdresserProfile> = await res.json();
    return data.data;
  } catch { return []; }
}

async function getRealisations(): Promise<ApiPost[]> {
  try {
    const res = await fetch(`${API}/feed?sort=trending&per_page=14`);
    if (!res.ok) return [];
    const data: PaginatedResponse<ApiPost> = await res.json();
    return data.data.filter((p) => getAfterImage(p));
  } catch { return []; }
}

// Libellés de spécialités live (renommage admin sans build, propagation
// alignée sur le revalidate ISR de 5 min ci-dessus) — repli sur
// SPECIALTY_LABELS si l'API échoue, jamais un slug brut affiché.
async function getSpecialtyLabels(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${API}/specialties`);
    if (!res.ok) return SPECIALTY_LABELS;
    const data: { slug: string; name: string }[] = await res.json();
    const map: Record<string, string> = { ...SPECIALTY_LABELS };
    data.forEach((s) => { if (s.slug && s.name) map[s.slug] = s.name; });
    return map;
  } catch { return SPECIALTY_LABELS; }
}

/* ─────────────────────────────────────────────────────────────
   Primitives de la vitrine.

   Un seul geste graphique pour toute la page : du blanc, de la
   typographie, et un aplat sombre réservé aux deux moments qui portent
   le récit (la confiance, le côté pro). Pas de carte cerclée d'un
   liseré gris — sur du blanc, un contour fabrique un formulaire, et
   l'ancienne page en avait sur presque chaque bloc.
───────────────────────────────────────────────────────────── */

const SHELL = 'max-w-5xl mx-auto px-6';

function Chapter({ children, dark = false, tight = false }: { children: React.ReactNode; dark?: boolean; tight?: boolean }) {
  return (
    <section className={`${tight ? 'py-16 md:py-24' : 'py-24 md:py-36'} ${dark ? 'bg-neutral-950' : ''}`}>
      {children}
    </section>
  );
}

function Title({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <h2 className={`text-[36px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.05] ${dark ? 'text-white' : 'text-neutral-900'}`}>
      {children}
    </h2>
  );
}

function Lead({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`text-[17px] md:text-[19px] leading-relaxed max-w-xl ${dark ? 'text-white/45' : 'text-neutral-500'}`}>
      {children}
    </p>
  );
}

function PillLink({ href, children, tone = 'dark' }: { href: string; children: React.ReactNode; tone?: 'dark' | 'light' }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-7 py-4 text-[15px] font-semibold transition-colors ${
        tone === 'dark'
          ? 'bg-neutral-900 text-white hover:bg-neutral-700'
          : 'bg-white text-neutral-900 hover:bg-neutral-200'
      }`}
    >
      {children}<ArrowRight size={15} strokeWidth={2.5} />
    </Link>
  );
}

function TextLink({ href, children, dark = false }: { href: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 text-[15px] font-medium transition-colors ${
        dark ? 'text-white/50 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'
      }`}
    >
      {children}<ArrowRight size={14} strokeWidth={2.5} />
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default async function HomePage() {
  const [topRanked, realisations, featuredHairdressers, specialtyLabels] = await Promise.all([
    getTopRanked(),
    getRealisations(),
    getFeaturedHairdressers(),
    getSpecialtyLabels(),
  ]);

  const heroStrip = realisations.slice(0, 10);
  const gridPosts = realisations.slice(0, 6);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans overflow-x-hidden">
      <LandingNav />

      {/* ══════════ HÉRO — une phrase, un champ de recherche ══════════ */}
      <section className="pt-36 md:pt-44 pb-16 md:pb-20">
        <div className={`${SHELL} text-center`}>
          <h1 className="text-[42px] sm:text-[56px] md:text-[72px] font-bold tracking-[-0.035em] leading-[1.02] text-neutral-900">
            Choisissez la personne,
            <br />
            <span className="text-neutral-300">pas l&apos;adresse.</span>
          </h1>

          <p className="mt-7 text-[17px] md:text-[20px] text-neutral-500 leading-relaxed max-w-xl mx-auto">
            CHAIR met le coiffeur au centre. Voyez son travail, ses spécialités et ses avis
            certifiés, puis réservez directement — dans votre navigateur comme dans l&apos;app.
          </p>

          <div className="mt-10 max-w-xl mx-auto">
            <HeroSearch />
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
            <TextLink href="/app/recherche">Voir les coiffeurs près de moi</TextLink>
            <span className="hidden sm:inline text-neutral-200">·</span>
            <TextLink href="/pro/inscription">Je suis coiffeur</TextLink>
          </div>
        </div>
      </section>

      {/* Bande de vraies réalisations, pleine largeur — la preuve avant
          l'argumentaire. Aucune image inventée : si le feed est vide, la
          bande n'existe pas. */}
      {heroStrip.length > 0 && (
        <div className="pb-8 md:pb-16 overflow-hidden">
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-6">
            {heroStrip.map((post) => {
              const url = resolveMediaUrl(getAfterImage(post));
              if (!url) return null;
              return (
                <div key={post.id} className="relative flex-shrink-0 w-[200px] md:w-[260px] aspect-[3/4] rounded-[20px] overflow-hidden bg-neutral-100">
                  <Image src={url} alt="Réalisation publiée sur CHAIR" fill className="object-cover" sizes="260px" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════ 1 — Le problème ══════════ */}
      <Chapter>
        <div className={SHELL}>
          <Reveal>
            <Title>
              Vous avez déjà réservé sans savoir
              <br className="hidden md:block" /> qui allait vous coiffer.
            </Title>
            <div className="mt-7">
              <Lead>
                Le talent est caché derrière une adresse. Ses spécialités, son style, son travail
                restent invisibles jusqu&apos;au fauteuil. C&apos;est à peu près le seul métier où
                l&apos;on confie son apparence à quelqu&apos;un qu&apos;on n&apos;a jamais vu travailler.
              </Lead>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
              <div>
                <p className="text-[13px] font-semibold text-neutral-300 mb-6">Aujourd&apos;hui</p>
                <ul className="space-y-4">
                  {[
                    'Vous réservez dans un salon, pas avec un coiffeur',
                    'Vous découvrez la personne en arrivant',
                    'Vous ne voyez pas son travail avant le rendez-vous',
                    'Les avis en ligne sont invérifiables',
                  ].map((t) => (
                    <li key={t} className="text-[16px] text-neutral-400 leading-snug">{t}</li>
                  ))}
                </ul>
              </div>
              <div className="md:border-l md:border-neutral-100 md:pl-16">
                <p className="text-[13px] font-semibold text-neutral-900 mb-6">Sur CHAIR</p>
                <ul className="space-y-4">
                  {[
                    'Vous choisissez un professionnel, avec un nom',
                    'Vous voyez ses réalisations avant de réserver',
                    'Vous connaissez ses spécialités et son style',
                    'Chaque avis est lié à une visite réelle',
                  ].map((t) => (
                    <li key={t} className="text-[16px] text-neutral-900 leading-snug">{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </Chapter>

      {/* ══════════ 2 — Comment ça marche ══════════ */}
      <Chapter tight>
        <div className={SHELL} id="comment-ca-marche">
          <Reveal>
            <Title>Trois étapes.</Title>
          </Reveal>

          <div className="mt-14 divide-y divide-neutral-100 border-t border-neutral-100">
            {[
              { n: '01', t: 'Découvrez', d: "Parcourez les coiffeurs par spécialité, par ville ou par style. Chaque profil montre un univers de travail, pas une vitrine de salon." },
              { n: '02', t: 'Réservez', d: "Choisissez votre créneau directement sur le profil du coiffeur. Confirmation en direct, aucun appel, aucune attente." },
              { n: '03', t: 'Vérifiez', d: "Après la prestation, un QR code unique débloque l'avis. Chaque note publiée vient d'une visite qui a réellement eu lieu." },
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 100}>
                <div className="py-8 md:py-10 grid grid-cols-1 md:grid-cols-[64px_200px_1fr] gap-2 md:gap-8 md:items-baseline">
                  <p className="text-[15px] font-semibold text-neutral-300 tabular-nums">{step.n}</p>
                  <h3 className="text-[22px] md:text-[26px] font-bold tracking-tight text-neutral-900">{step.t}</h3>
                  <p className="text-[16px] text-neutral-500 leading-relaxed max-w-lg">{step.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Chapter>

      {/* ══════════ 3 — Le travail parle ══════════ */}
      {gridPosts.length > 0 && (
        <Chapter>
          <div className={SHELL}>
            <Reveal>
              <Title>Le travail parle<br />avant tout.</Title>
              <div className="mt-7">
                <Lead>
                  Chaque coiffeur construit sa vitrine de réalisations. Vous voyez ce qu&apos;il
                  fait — pas ce qu&apos;il promet. Ces photos ont été publiées par de vrais
                  professionnels sur CHAIR.
                </Lead>
              </div>
            </Reveal>

            <div className="mt-14 grid grid-cols-2 md:grid-cols-3 gap-3">
              {gridPosts.map((post, i) => {
                const url = resolveMediaUrl(getAfterImage(post));
                const hdName = (post.hairdresser as { user?: { name?: string } } | undefined)?.user?.name;
                return (
                  <Reveal key={post.id} delay={(i % 3) * 90}>
                    <div className="relative aspect-square overflow-hidden rounded-[20px] bg-neutral-100">
                      {url && <Image src={url} alt={post.description ?? 'Réalisation CHAIR'} fill className="object-cover" sizes="33vw" />}
                      {hdName && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-4 py-3">
                          <p className="text-white text-[12px] font-medium truncate">{hdName}</p>
                        </div>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </Chapter>
      )}

      {/* ══════════ 4 — La confiance (premier aplat sombre) ══════════ */}
      <Chapter dark>
        <div className={SHELL}>
          <Reveal>
            <Title dark>Un avis, une visite.<br /><span className="text-white/25">Sans exception.</span></Title>
            <div className="mt-7">
              <Lead dark>
                Sur CHAIR, un avis ne peut pas être écrit par quelqu&apos;un qui n&apos;est jamais
                venu. À la fin de la prestation, le coiffeur génère un QR code unique. Le client le
                scanne, l&apos;avis se débloque — une seule fois.
              </Lead>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
              {[
                { t: 'QR unique', d: "Généré après la prestation, valable une fois." },
                { t: 'Visite vérifiée', d: "L'avis reste attaché au rendez-vous qui a eu lieu." },
                { t: 'Aucun avis anonyme', d: 'Pas de compte fantôme, pas de note achetée.' },
              ].map((p) => (
                <div key={p.t}>
                  <p className="text-[17px] font-semibold text-white">{p.t}</p>
                  <p className="mt-2 text-[15px] text-white/40 leading-relaxed">{p.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </Chapter>

      {/* ══════════ 5 — Les coiffeurs (vraies fiches) ══════════ */}
      {featuredHairdressers.length > 0 && (
        <Chapter>
          <div className={SHELL}>
            <Reveal>
              <div className="flex items-end justify-between gap-6">
                <Title>Ils sont déjà<br />sur CHAIR.</Title>
                <div className="hidden sm:block flex-shrink-0 pb-2">
                  <TextLink href="/app/recherche">Tout voir</TextLink>
                </div>
              </div>
            </Reveal>

            <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
              {featuredHairdressers.slice(0, 8).map((hd, i) => {
                const photo = resolveMediaUrl(hd.banner_image ?? hd.user.avatar);
                const specialty = hd.specialties?.[0]?.name;
                const rating = parseFloat(hd.avg_rating);
                return (
                  <Reveal key={hd.id} delay={(i % 4) * 80}>
                    <Link href={`/app/coiffeur/${hd.slug}`} className="group block">
                      <div className="relative aspect-[4/5] rounded-[20px] overflow-hidden bg-neutral-100">
                        {photo && (
                          <Image
                            src={photo}
                            alt={hd.user.name}
                            fill
                            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                            sizes="(min-width: 768px) 25vw, 50vw"
                          />
                        )}
                      </div>
                      <p className="mt-3 text-[15px] font-semibold text-neutral-900 truncate">{hd.user.name}</p>
                      <p className="mt-0.5 text-[13px] text-neutral-400 truncate">
                        {specialty ?? 'Coiffeur'}{hd.city ? ` · ${hd.city}` : ''}
                      </p>
                      {rating > 0 && (
                        <p className="mt-1 flex items-center gap-1 text-[13px] text-neutral-500">
                          <Star size={11} className="fill-neutral-900 stroke-none" />
                          <span className="font-semibold text-neutral-900">{rating.toFixed(1)}</span>
                          <span className="text-neutral-400">({hd.reviews_count})</span>
                        </p>
                      )}
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </Chapter>
      )}

      {/* ══════════ 6 — Le classement ══════════ */}
      <Chapter tight>
        <div className={SHELL}>
          <Reveal>
            <Title>La réputation se mérite.<br /><span className="text-neutral-300">Elle ne s&apos;achète pas.</span></Title>
            <div className="mt-7">
              <Lead>
                Aucune place ne s&apos;achète sur CHAIR. Un coiffeur monte grâce à ses avis
                certifiés, à sa régularité et à la confiance réelle de ses clients — dans sa ville
                et dans sa spécialité.
              </Lead>
            </div>
          </Reveal>

          {topRanked.length > 0 && (
            <Reveal delay={120}>
              <div className="mt-12 divide-y divide-neutral-100 border-y border-neutral-100">
                {topRanked.slice(0, 3).map((e) => {
                  const avatar = resolveMediaUrl(e.avatar);
                  return (
                    <Link key={e.id} href={`/app/coiffeur/${e.slug}`} className="flex items-center gap-4 py-4 group">
                      <span className="w-6 text-[15px] font-bold text-neutral-900 tabular-nums">{e.rank}</span>
                      <div className="relative w-11 h-11 rounded-full overflow-hidden bg-neutral-100 flex-shrink-0">
                        {avatar && <Image src={avatar} alt={e.name} fill className="object-cover" sizes="44px" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] text-neutral-900 truncate group-hover:underline">{e.name}</p>
                        <p className="text-[13px] text-neutral-400 truncate">
                          {e.specialty ?? 'Coiffeur'}{e.city ? ` · ${e.city}` : ''}
                        </p>
                      </div>
                      {e.avg_rating > 0 && (
                        <p className="flex items-center gap-1 text-[14px] flex-shrink-0">
                          <Star size={11} className="fill-neutral-900 stroke-none" />
                          <span className="font-semibold text-neutral-900">{e.avg_rating.toFixed(1)}</span>
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </Reveal>
          )}

          <div className="mt-10">
            <TextLink href="/app/classements">Voir le classement complet</TextLink>
          </div>
        </div>
      </Chapter>

      {/* ══════════ 7 — Tout marche sur le web ══════════ */}
      <Chapter>
        <div className={SHELL}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-16 lg:gap-20 items-center">
            <div>
              <Reveal>
                <Title>Tout CHAIR,<br />dans votre navigateur.</Title>
                <div className="mt-7">
                  <Lead>
                    Rien à installer pour chercher un coiffeur, ouvrir son portfolio, lire ses avis
                    et réserver : le site fait tout. L&apos;application ajoute les notifications, la
                    caméra pour les avis certifiés, et l&apos;accès en un geste depuis votre écran
                    d&apos;accueil.
                  </Lead>
                </div>

                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <PillLink href="/app/recherche">Rechercher un coiffeur</PillLink>
                  <TextLink href="/download">Télécharger l&apos;application</TextLink>
                </div>

                {/* Pas de badge App Store tant que l'app n'est pas publiée :
                    AppDownload est écrit pour un fond sombre (texte blanc) et
                    disparaissait purement et simplement sur ce fond clair. */}
                <p className="mt-8 text-[14px] text-neutral-400">
                  L&apos;application arrive bientôt sur l&apos;App Store et Google Play.
                </p>
              </Reveal>
            </div>

            <Reveal delay={140}>
              <div className="hidden lg:block">
                <MockupPhone src="/mockups/mockup-profil.png" label="CHAIR" placeholderBg="#f5f5f5" />
              </div>
            </Reveal>
          </div>

          {/* Spécialités — points d'entrée réels de la recherche web */}
          <Reveal delay={80}>
            <div className="mt-20 pt-12 border-t border-neutral-100">
              <p className="text-[16px] text-neutral-500 mb-6">Commencez par ce que vous cherchez :</p>
              <div className="flex flex-wrap gap-2.5">
                {Object.entries(specialtyLabels).map(([slug, label]) => (
                  <Link
                    key={slug}
                    href={`/app/recherche?specialty=${slug}`}
                    className="rounded-full bg-neutral-50 px-5 py-3 text-[15px] text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </Chapter>

      {/* ══════════ 8 — CHAIR PRO (second aplat sombre) ══════════ */}
      <Chapter dark>
        <div className={SHELL} id="coiffeurs">
          <Reveal>
            <p className="text-[13px] font-semibold text-white/30 mb-6">CHAIR PRO</p>
            <Title dark>De l&apos;autre côté<br />du fauteuil.</Title>
            <div className="mt-7">
              <Lead dark>
                Un coiffeur change de salon, sa clientèle reste au salon. CHAIR PRO lui donne une
                marque à son nom : un profil, un portfolio, des avis certifiés et un classement qui
                le suivent partout, qu&apos;il soit salarié ou indépendant.
              </Lead>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-10">
              {[
                { t: 'Un profil qui vous appartient', d: "Portfolio, spécialités, abonnés et avis restent attachés à votre nom, pas à une adresse." },
                { t: 'Agenda et réservations', d: "Prestations, tarifs, créneaux : les clients réservent directement depuis votre profil." },
                { t: 'Des avis impossibles à truquer', d: "Le QR code de fin de prestation protège votre réputation autant que celle du client." },
                { t: 'Classement et progression', d: "Niveaux par spécialité, badges, classement local : votre travail devient visible et mesurable." },
              ].map((f) => (
                <div key={f.t}>
                  <p className="text-[17px] font-semibold text-white">{f.t}</p>
                  <p className="mt-2 text-[15px] text-white/40 leading-relaxed max-w-sm">{f.d}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-14 flex flex-wrap items-center gap-5">
              <PillLink href="/pro/inscription" tone="light">Rejoindre CHAIR PRO</PillLink>
              <TextLink href="/pro/connexion" dark>J&apos;ai déjà un compte</TextLink>
            </div>
          </Reveal>
        </div>
      </Chapter>

      {/* ══════════ 9 — Questions ══════════ */}
      <Chapter tight>
        <div className={SHELL}>
          <Reveal>
            <Title>Questions fréquentes</Title>
          </Reveal>
          <div className="mt-10">
            <FaqAccordion />
          </div>
        </div>
      </Chapter>

      {/* ══════════ 10 — Dernier mot ══════════ */}
      <Chapter>
        <div className={`${SHELL} text-center`}>
          <Reveal>
            <h2 className="text-[36px] md:text-[56px] font-bold tracking-[-0.03em] leading-[1.05] text-neutral-900">
              Votre prochain coiffeur
              <br />
              <span className="text-neutral-300">est déjà sur CHAIR.</span>
            </h2>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
              <PillLink href="/app/recherche">Trouver mon coiffeur</PillLink>
              <TextLink href="/pro/inscription">Je suis professionnel</TextLink>
            </div>
          </Reveal>
        </div>
      </Chapter>

      <LandingFooter />
    </div>
  );
}
