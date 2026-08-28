import Link from 'next/link';
import Image from 'next/image';
import LandingNav from '@/components/landing/LandingNav';
import LandingFooter from '@/components/landing/LandingFooter';
import FaqAccordion from '@/components/landing/FaqAccordion';
import MockupPhone from '@/components/landing/MockupPhone';
import Reveal from '@/components/ui/Reveal';
import HeroSearch from '@/components/ui/HeroSearch';
import { ArrowRight, Check, Minus, Search, Star } from 'lucide-react';
import type { ApiLeaderboardEntry, ApiPost, ApiHairdresserProfile, PaginatedResponse } from '@/lib/types';
import { resolveMediaUrl, getAfterImage } from '@/lib/types';
import { SPECIALTY_LABELS } from '@/lib/explore';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ISR — page statique régénérée toutes les 5 min (coiffeurs vedettes,
// classement, réalisations changent lentement, pas besoin de temps réel).
export const revalidate = 300;

interface Paged<T> { items: T[]; total: number }

async function getPaged<T>(path: string): Promise<Paged<T>> {
  try {
    const res = await fetch(`${API}${path}`);
    if (!res.ok) return { items: [], total: 0 };
    const data: PaginatedResponse<T> = await res.json();
    return { items: data.data ?? [], total: data.total ?? 0 };
  } catch { return { items: [], total: 0 }; }
}

async function getTopRanked(): Promise<ApiLeaderboardEntry[]> {
  try {
    const res = await fetch(`${API}/leaderboard?limit=5`);
    if (!res.ok) return [];
    const data: { results?: ApiLeaderboardEntry[] } = await res.json();
    return data.results ?? [];
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

   Chapitres numérotés, du blanc, de la typographie, aucun contour, et
   le sombre réservé aux deux moments qui portent le récit. Toute preuve
   affichée vient de l'API : aucune pastille ni statistique inventée.
───────────────────────────────────────────────────────────── */

const SHELL = 'max-w-5xl mx-auto px-6';

function Chapter({ id, children, dark = false }: { id?: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <section id={id} className={`py-20 md:py-32 ${dark ? 'bg-neutral-950' : ''}`}>
      {children}
    </section>
  );
}

function ChapterHead({
  n, kicker, title, lead, href, hrefLabel, dark = false,
}: {
  n: string;
  kicker: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold tracking-[0.22em] uppercase mb-5 ${dark ? 'text-white/30' : 'text-neutral-300'}`}>
          <span className={dark ? 'text-white/70' : 'text-neutral-900'}>{n}</span>
          <span className="mx-2">/</span>
          {kicker}
        </p>
        <h2 className={`text-[34px] md:text-[50px] font-bold tracking-[-0.03em] leading-[1.05] ${dark ? 'text-white' : 'text-neutral-900'}`}>
          {title}
        </h2>
        {lead && (
          <p className={`mt-6 text-[17px] md:text-[19px] leading-relaxed max-w-xl ${dark ? 'text-white/45' : 'text-neutral-500'}`}>
            {lead}
          </p>
        )}
      </div>
      {href && hrefLabel && (
        <div className="flex-shrink-0 md:pb-2">
          <TextLink href={href} dark={dark}>{hrefLabel}</TextLink>
        </div>
      )}
    </div>
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
  const [ranked, realisations, hairdressers, specialtyLabels] = await Promise.all([
    getTopRanked(),
    getPaged<ApiPost>('/feed?sort=trending&per_page=14'),
    getPaged<ApiHairdresserProfile>('/hairdressers?sort=featured&per_page=8'),
    getSpecialtyLabels(),
  ]);

  const posts = realisations.items.filter((p) => getAfterImage(p));
  const pros  = hairdressers.items;

  // Bandeau de preuve — affiché seulement quand les chiffres réels valent la
  // peine d'être montrés. Un compteur famélique fait plus de mal qu'aucun
  // compteur, et un compteur inventé est hors de question.
  const showCounts = hairdressers.total >= 20 && realisations.total >= 20;

  const specialtyEntries = Object.entries(specialtyLabels).slice(0, 8);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans overflow-x-hidden">
      <LandingNav />

      {/* ══════════ HÉRO ══════════ */}
      <section className="pt-32 md:pt-40 pb-14">
        <div className={`${SHELL} text-center`}>
          {showCounts && (
            <p className="inline-flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2 text-[13px] text-neutral-500 mb-8">
              <span className="font-semibold text-neutral-900 tabular-nums">{hairdressers.total}</span> coiffeurs
              <span className="text-neutral-300">·</span>
              <span className="font-semibold text-neutral-900 tabular-nums">{realisations.total}</span> réalisations publiées
            </p>
          )}

          <h1 className="text-[42px] sm:text-[56px] md:text-[72px] font-bold tracking-[-0.035em] leading-[1.02] text-neutral-900">
            Choisissez la personne,
            <br />
            <span className="text-neutral-300">pas l&apos;adresse.</span>
          </h1>

          <p className="mt-7 text-[17px] md:text-[20px] text-neutral-500 leading-relaxed max-w-xl mx-auto">
            CHAIR met le coiffeur au centre. Voyez son travail, ses spécialités et ses avis
            vérifiés, puis réservez directement — dans votre navigateur comme dans l&apos;app.
          </p>

          <div className="mt-10 max-w-xl mx-auto">
            <HeroSearch />
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <PillLink href="/app/recherche">Utiliser la version web</PillLink>
            <Link
              href="/download"
              className="inline-flex items-center gap-2 rounded-full bg-neutral-50 px-7 py-4 text-[15px] font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              Télécharger l&apos;application
            </Link>
          </div>
        </div>
      </section>

      {/* Bande de vraies réalisations — la preuve avant l'argumentaire.
          Aucune image inventée : si le feed est vide, la bande n'existe pas. */}
      {posts.length > 0 && (
        <div className="pb-10 md:pb-16 overflow-hidden">
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-6">
            {posts.slice(0, 10).map((post) => {
              const url = resolveMediaUrl(getAfterImage(post));
              if (!url) return null;
              return (
                <div key={post.id} className="relative flex-shrink-0 w-[190px] md:w-[250px] aspect-[3/4] rounded-[20px] overflow-hidden bg-neutral-100">
                  <Image src={url} alt="Réalisation publiée sur CHAIR" fill className="object-cover" sizes="250px" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════ 01 — La communauté ══════════ */}
      {pros.length > 0 && (
        <Chapter>
          <div className={SHELL}>
            <Reveal>
              <ChapterHead
                n="01"
                kicker="La communauté"
                title={<>Les coiffeurs les mieux notés,<br className="hidden md:block" /> près de chez vous.</>}
                lead="Des professionnels vérifiés, notés uniquement par des clients réellement venus. Salariés comme indépendants — chacun avec sa propre vitrine."
                href="/app/recherche"
                hrefLabel="Voir tous les coiffeurs"
              />
            </Reveal>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
              {pros.slice(0, 8).map((hd) => {
                const photo = resolveMediaUrl(hd.banner_image ?? hd.user.avatar);
                const specialty = hd.specialties?.[0]?.name;
                const rating = parseFloat(hd.avg_rating);
                return (
                  <Link key={hd.id} href={`/app/coiffeur/${hd.slug}`} className="group block">
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
                );
              })}
            </div>
          </div>
        </Chapter>
      )}

      {/* ══════════ 02 — Spécialités ══════════ */}
      <Chapter>
        <div className={SHELL}>
          <Reveal>
            <ChapterHead
              n="02"
              kicker="Spécialités"
              title={<>Que cherchez-vous<br className="hidden md:block" /> aujourd&apos;hui ?</>}
              lead="Choisissez une spécialité : CHAIR vous montre les coiffeurs qui l'exercent vraiment, classés par réputation dans votre ville."
            />
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 border-t border-neutral-100">
            {specialtyEntries.map(([slug, label], i) => (
              <Link
                key={slug}
                href={`/app/recherche?specialty=${slug}`}
                className="group flex items-baseline gap-5 py-6 border-b border-neutral-100"
              >
                <span className="text-[13px] font-semibold text-neutral-200 tabular-nums group-hover:text-neutral-400 transition-colors">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 text-[20px] md:text-[24px] font-bold tracking-tight text-neutral-900 truncate">
                  {label}
                </span>
                <ArrowRight size={16} className="text-neutral-200 group-hover:text-neutral-900 transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>

          <div className="mt-10">
            <TextLink href="/app/recherche">Voir toutes les spécialités</TextLink>
          </div>
        </div>
      </Chapter>

      {/* ══════════ 03 — Comment ça marche ══════════ */}
      <Chapter id="comment-ca-marche">
        <div className={SHELL}>
          <Reveal>
            <ChapterHead
              n="03"
              kicker="Comment ça marche"
              title={<>Réserver, sans appel<br className="hidden md:block" /> ni attente.</>}
            />
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">
            <div className="divide-y divide-neutral-100 border-t border-neutral-100">
              {[
                { n: '01', t: 'Cherchez', d: "Une spécialité, une ville, ou juste un nom. CHAIR affiche des coiffeurs, pas des adresses de salon." },
                { n: '02', t: 'Comparez', d: "Portfolio, spécialités, avis vérifiés, tarifs : tout est sur le profil avant que vous choisissiez." },
                { n: '03', t: 'Réservez', d: "Vous prenez un créneau directement sur le profil. Le coiffeur confirme, vous êtes notifié. Aucun appel." },
                { n: '04', t: 'Vérifiez', d: "Après la prestation, un QR code unique débloque votre avis. C'est ce qui garde le classement honnête." },
              ].map((step) => (
                <div key={step.n} className="py-7 flex gap-6">
                  <span className="text-[13px] font-semibold text-neutral-200 tabular-nums pt-1.5">{step.n}</span>
                  <div className="min-w-0">
                    <h3 className="text-[20px] font-bold tracking-tight text-neutral-900">{step.t}</h3>
                    <p className="mt-2 text-[16px] text-neutral-500 leading-relaxed">{step.d}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Aperçu de la recherche — construit avec de VRAIS profils déjà
                chargés plus haut, plutôt qu'une capture d'écran figée ou des
                noms inventés. */}
            {pros.length >= 3 && (
              <div className="bg-neutral-50 rounded-[28px] p-5 md:p-7">
                {/* Volontairement PAS de chip "spécialité + ville" ici : les
                    profils affichés dessous sont les mieux notés toutes zones
                    confondues, un filtre affiché donnerait un résultat qui ne
                    correspond pas à ce qu'on montre. */}
                <div className="flex items-center gap-2.5 bg-white rounded-full px-4 py-3 mb-4">
                  <Search size={15} className="text-neutral-300 flex-shrink-0" />
                  <span className="text-[14px] text-neutral-400">Balayage, coupe homme, une ville…</span>
                </div>
                <p className="text-[12px] font-semibold tracking-[0.16em] uppercase text-neutral-400 mb-3 px-1">
                  Les mieux notés
                </p>

                <div className="bg-white rounded-[20px] divide-y divide-neutral-100">
                  {pros.slice(0, 3).map((hd) => {
                    const avatar = resolveMediaUrl(hd.user.avatar ?? hd.banner_image);
                    const rating = parseFloat(hd.avg_rating);
                    return (
                      <div key={hd.id} className="flex items-center gap-3 px-4 py-3.5">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-100 flex-shrink-0">
                          {avatar && <Image src={avatar} alt={hd.user.name} fill className="object-cover" sizes="40px" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-neutral-900 truncate">{hd.user.name}</p>
                          <p className="text-[12px] text-neutral-400 truncate">
                            {hd.specialties?.[0]?.name ?? 'Coiffeur'}{hd.city ? ` · ${hd.city}` : ''}
                          </p>
                        </div>
                        {rating > 0 && (
                          <span className="flex items-center gap-1 text-[13px] flex-shrink-0">
                            <Star size={10} className="fill-neutral-900 stroke-none" />
                            <span className="font-semibold text-neutral-900">{rating.toFixed(1)}</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="mt-4 text-[12px] text-neutral-400 text-center">
                  Aperçu de la recherche CHAIR — profils réels
                </p>
              </div>
            )}
          </div>
        </div>
      </Chapter>

      {/* ══════════ 04 — La confiance (aplat sombre) ══════════ */}
      <Chapter dark>
        <div className={SHELL}>
          <Reveal>
            <ChapterHead
              n="04"
              kicker="La confiance"
              dark
              title={<>Un avis, une visite.<br /><span className="text-white/25">Sans exception.</span></>}
              lead={<>Sur CHAIR, un avis ne peut pas être écrit par quelqu&apos;un qui n&apos;est jamais venu. À la fin de la prestation, le coiffeur génère un QR code unique. Le client le scanne, l&apos;avis se débloque — une seule fois.</>}
            />
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
            {[
              { t: 'QR unique', d: 'Généré après la prestation, valable une seule fois.' },
              { t: 'Visite vérifiée', d: "L'avis reste attaché au rendez-vous qui a eu lieu." },
              { t: 'Aucun avis anonyme', d: 'Pas de compte fantôme, pas de note achetée.' },
            ].map((p) => (
              <div key={p.t}>
                <p className="text-[17px] font-semibold text-white">{p.t}</p>
                <p className="mt-2 text-[15px] text-white/40 leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </Chapter>

      {/* ══════════ 05 — Le classement ══════════ */}
      <Chapter>
        <div className={SHELL}>
          <Reveal>
            <ChapterHead
              n="05"
              kicker="Le classement"
              title={<>La réputation se mérite.<br /><span className="text-neutral-300">Elle ne s&apos;achète pas.</span></>}
              lead="Aucune place ne s'achète sur CHAIR. Un coiffeur monte grâce à ses avis vérifiés, à sa régularité et à la confiance réelle de ses clients — dans sa ville et dans sa spécialité."
              href="/app/classements"
              hrefLabel="Voir le classement complet"
            />
          </Reveal>

          {ranked.length > 0 && (
            <div className="divide-y divide-neutral-100 border-y border-neutral-100">
              {ranked.slice(0, 5).map((e) => {
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
          )}
        </div>
      </Chapter>

      {/* ══════════ 06 — Pourquoi CHAIR (comparatif) ══════════ */}
      <Chapter>
        <div className={SHELL}>
          <Reveal>
            <ChapterHead
              n="06"
              kicker="Pourquoi CHAIR"
              title={<>Vous avez déjà réservé sans savoir<br className="hidden md:block" /> qui allait vous coiffer.</>}
              lead="Les plateformes de réservation sont construites autour du salon : vous choisissez une adresse et un horaire, jamais une personne. CHAIR part de l'autre bout."
            />
          </Reveal>

          {/* Comparatif — colonnes génériques, aucune marque citée : la
              comparaison porte sur des modèles, pas sur des concurrents
              nommés. */}
          <div className="overflow-x-auto no-scrollbar -mx-6 px-6">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-4 pr-4" />
                  <th className="text-left py-4 px-4 text-[15px] font-bold text-neutral-900 whitespace-nowrap">CHAIR</th>
                  <th className="text-left py-4 px-4 text-[14px] font-medium text-neutral-400">Plateformes de salon</th>
                  <th className="text-left py-4 pl-4 text-[14px] font-medium text-neutral-400">Réseaux sociaux</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { l: 'Vous choisissez un coiffeur, pas une adresse', a: true,  b: false, c: true },
                  { l: 'Portfolio de réalisations par professionnel', a: true,  b: false, c: true },
                  { l: 'Avis liés à une visite vérifiée',             a: true,  b: false, c: false },
                  { l: 'Réservation directe avec confirmation',       a: true,  b: true,  c: false },
                  { l: 'Le coiffeur garde sa vitrine s’il change de salon', a: true, b: false, c: true },
                  { l: 'Classement local par spécialité',             a: true,  b: false, c: false },
                  { l: 'Gratuit pour le client',                      a: true,  b: true,  c: true },
                ].map((row) => (
                  <tr key={row.l} className="border-b border-neutral-100">
                    <td className="py-4 pr-4 text-[15px] text-neutral-700 leading-snug">{row.l}</td>
                    <td className="py-4 px-4">{row.a ? <Check size={17} className="text-neutral-900" strokeWidth={2.5} /> : <Minus size={17} className="text-neutral-200" />}</td>
                    <td className="py-4 px-4">{row.b ? <Check size={17} className="text-neutral-400" strokeWidth={2.5} /> : <Minus size={17} className="text-neutral-200" />}</td>
                    <td className="py-4 pl-4">{row.c ? <Check size={17} className="text-neutral-400" strokeWidth={2.5} /> : <Minus size={17} className="text-neutral-200" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Chapter>

      {/* ══════════ 07 — Web et app ══════════ */}
      <Chapter>
        <div className={SHELL}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-16 lg:gap-20 items-center">
            <div>
              <Reveal>
                <ChapterHead
                  n="07"
                  kicker="Web et application"
                  title={<>Tout CHAIR,<br />dans votre navigateur.</>}
                  lead="Rien à installer pour chercher un coiffeur, ouvrir son portfolio, lire ses avis et réserver : le site fait tout. L'application ajoute les notifications, la caméra pour les avis vérifiés, et l'accès en un geste depuis votre écran d'accueil."
                />

                <div className="flex flex-wrap items-center gap-4">
                  <PillLink href="/app/recherche">Rechercher un coiffeur</PillLink>
                  <TextLink href="/download">Télécharger l&apos;application</TextLink>
                </div>

                {/* Pas de badge App Store tant que l'app n'est pas publiée :
                    un lien mort vaut moins qu'une phrase honnête. */}
                <p className="mt-8 text-[14px] text-neutral-400">
                  L&apos;application arrive bientôt sur l&apos;App Store et Google Play.
                </p>
              </Reveal>
            </div>

            <Reveal>
              <div className="hidden lg:block">
                <MockupPhone src="/mockups/mockup-profil.png" label="CHAIR" placeholderBg="#f5f5f5" />
              </div>
            </Reveal>
          </div>
        </div>
      </Chapter>

      {/* ══════════ 08 — Côté coiffeur (aplat sombre) ══════════ */}
      <Chapter dark id="coiffeurs">
        <div className={SHELL}>
          <Reveal>
            <ChapterHead
              n="08"
              kicker="Côté coiffeur"
              dark
              title={<>Vous coupez ?<br />Passez côté CHAIR PRO.</>}
              lead="Un coiffeur change de salon, sa clientèle reste au salon. CHAIR PRO lui donne une marque à son nom : un profil, un portfolio, des avis vérifiés et un classement qui le suivent partout, qu'il soit salarié ou indépendant."
            />
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-10">
            {[
              { t: 'Un profil qui vous appartient', d: 'Portfolio, spécialités, abonnés et avis restent attachés à votre nom, pas à une adresse.' },
              { t: 'Agenda et réservations', d: 'Prestations, tarifs, créneaux : les clients réservent directement depuis votre profil.' },
              { t: 'Des avis impossibles à truquer', d: 'Le QR code de fin de prestation protège votre réputation autant que celle du client.' },
              { t: 'Classement et progression', d: 'Niveaux par spécialité, badges, classement local : votre travail devient visible et mesurable.' },
            ].map((f) => (
              <div key={f.t}>
                <p className="text-[17px] font-semibold text-white">{f.t}</p>
                <p className="mt-2 text-[15px] text-white/40 leading-relaxed max-w-sm">{f.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-wrap items-center gap-5">
            <PillLink href="/pro/inscription" tone="light">Rejoindre CHAIR PRO</PillLink>
            <TextLink href="/pro/connexion" dark>J&apos;ai déjà un compte</TextLink>
          </div>
        </div>
      </Chapter>

      {/* ══════════ Questions ══════════ */}
      <Chapter>
        <div className={SHELL}>
          <Reveal>
            <ChapterHead
              n="09"
              kicker="Questions"
              title="Questions fréquentes"
              lead="Tout ce qu'il faut savoir avant de réserver — ou de rejoindre CHAIR PRO."
            />
          </Reveal>
          <FaqAccordion />
        </div>
      </Chapter>

      {/* ══════════ Dernier mot ══════════ */}
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
