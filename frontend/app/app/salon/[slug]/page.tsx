import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Globe, Users, Star, BadgeCheck, ChevronRight, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { resolveMediaUrl, getAfterImage, type ApiSalonFull } from '@/lib/types';
import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/ui/BackButton';
import { ContentMenu } from '@/components/ui/ReportSheet';
import LocationMapCard from '@/components/ui/LocationMapCard';
import { PrimaryButton } from '@/components/ui/Button';

// Pas d'export "Instagram" dans cette version de lucide-react — même icône
// maison que PublicProfileAbout.tsx (fiche publique coiffeur).
function InstagramIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

async function getSalon(slug: string): Promise<ApiSalonFull | null> {
  try {
    const res = await fetch(`${API_BASE}/salons/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Ligne d'info pratique — icône en pastille + texte, cliquable quand ça a
// un sens (tel/site/Instagram), jamais un simple bloc gris plat. ────────────
function InfoRow({ icon, children, href }: { icon: React.ReactNode; children: React.ReactNode; href?: string }) {
  const content = (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0 text-neutral-500">
        {icon}
      </div>
      <span className="text-[13.5px] text-neutral-700 truncate">{children}</span>
    </div>
  );
  if (!href) return content;
  return (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="block hover:opacity-70 active:scale-[0.99] transition-all">
      {content}
    </a>
  );
}

// ── Fiche membre d'équipe — même langage visuel que RecommendationCard sur
// la home (retour Julien : DA Apple/minimaliste à étendre partout) : photo
// nette en pleine carte, panneau blanc en dessous, médaillon avatar à la
// jonction plutôt qu'une pastille noyée au centre. ──────────────────────────
function TeamMemberCard({ h }: { h: ApiSalonFull['hairdressers'][number] }) {
  const avatarUrl = resolveMediaUrl(h.user?.avatar);
  const bannerUrl = resolveMediaUrl(h.banner_image);
  const photo = avatarUrl ?? bannerUrl;
  const firstName = h.user?.name?.split(' ')[0] ?? '';
  const hasRating = h.reviews_count > 0;
  const spec = h.specialties?.[0]?.name;

  // Le "…" est un FRÈRE du lien, jamais un enfant : un <button> imbriqué dans
  // un <a> est invalide et le clic serait avalé par la navigation.
  return (
    <div className="relative">
      <Link
        href={`/app/coiffeur/${h.slug}`}
        className="group block rounded-[22px] overflow-hidden bg-white shadow-[0_6px_20px_-8px_rgba(10,10,10,0.16)] hover:shadow-[0_12px_28px_-10px_rgba(10,10,10,0.24)] active:scale-[0.97] transition-all"
      >
        <div className="relative aspect-square bg-neutral-200 overflow-hidden">
          {photo ? (
            <Image src={photo} alt={h.user?.name ?? ''} fill className="object-cover group-hover:scale-[1.05] transition-transform duration-500" sizes="200px" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-300 to-neutral-400 flex items-center justify-center">
              <span className="text-3xl font-bold text-white/70">{firstName[0]}</span>
            </div>
          )}
          {/* Dégradé léger pour garder le "…" lisible sur une photo claire. */}
          <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/35 to-transparent pointer-events-none" />
        </div>
        <div className="p-3">
          {spec && <p className="text-[8.5px] font-bold text-neutral-400 tracking-[0.1em] uppercase mb-0.5 truncate">{spec}</p>}
          <p className="text-[13px] font-bold text-neutral-900 truncate">{h.user?.name}</p>
          {hasRating && (
            <div className="flex items-center gap-1 mt-0.5">
              <Star size={9} className="fill-neutral-900 stroke-none" />
              <span className="text-[11px] font-semibold text-neutral-500">{parseFloat(h.avg_rating).toFixed(1)}</span>
              <span className="text-[11px] text-neutral-400">({h.reviews_count})</span>
            </div>
          )}
        </div>
      </Link>

      {/* Signalement / blocage du professionnel (App Store 1.2). La cible du
          signalement 'profile' est l'id du PROFIL coiffeur (voir
          ReportController::resolveReportedUserId), celle du blocage l'id
          UTILISATEUR — les deux sont disponibles ici. */}
      <ContentMenu
        type="profile"
        contentId={h.id}
        authorUserId={h.user?.id ?? null}
        authorName={h.user?.name ?? null}
        tone="dark"
        label={`Options pour ${h.user?.name ?? 'ce coiffeur'}`}
        className="absolute top-0.5 right-0.5"
      />
    </div>
  );
}

export default async function SalonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salon = await getSalon(slug);

  if (!salon) notFound();

  const coverUrl = resolveMediaUrl(salon.cover_image);
  const logoUrl  = resolveMediaUrl(salon.logo);
  const hairdressers = salon.hairdressers ?? [];

  // Signalement de la fiche salon (App Store Review Guideline 1.2). La file de
  // modération ne connaît que trois cibles — 'post', 'review', 'user' (voir
  // ReportController) — et un salon n'en est aucune. Le contenu éditorial d'un
  // salon (nom, description, photos) est publié par son GÉRANT : c'est donc lui
  // qu'on signale, via l'id de sa fiche coiffeur (content_id =
  // hairdresser_profiles.id, exigé par resolveReportedUserId pour le type
  // 'user'). Si le gérant n'a pas de fiche coiffeur, aucune cible honnête
  // n'existe : on n'affiche alors pas de "…" au niveau du salon plutôt que de
  // faire porter le signalement à quelqu'un d'autre. Chaque membre de l'équipe
  // garde de toute façon son propre "…" sur sa carte.
  const ownerId = salon.owner?.id ?? null;
  const ownerProfile = ownerId !== null
    ? hairdressers.find((h) => h.user?.id === ownerId) ?? null
    : null;

  // Note calculée par le serveur sur les AVIS eux-mêmes.
  //
  // Le calcul se faisait ici, en moyennant les moyennes de chaque coiffeur.
  // C'était faux deux fois : un coiffeur avec 1 avis pesait autant qu'un
  // autre avec 100, et surtout les coiffeurs SANS avis comptaient comme des
  // zéros. Un salon avec un coiffeur à 5,0 et un nouveau sans avis affichait
  // 2,5 — vérifié en base sur un cas réel. La note d'un salon, c'est la
  // moyenne de tous les avis reçus par son équipe, rien d'autre.
  const ratingSummary = salon.rating_summary ?? null;
  const avgRating = ratingSummary?.avg_rating != null ? ratingSummary.avg_rating.toFixed(1) : null;
  const totalReviews = ratingSummary?.reviews_count ?? 0;
  const teamPosts = (salon.team_posts ?? []).filter((p) => getAfterImage(p));

  return (
    <AppShell>
      {/* Bannière — plus haute, dégradé haut ET bas (lisibilité du bouton
          retour ET de la carte d'identité qui vient chevaucher en dessous). */}
      <div className="relative h-60 md:h-80 bg-neutral-900 overflow-hidden">
        {coverUrl ? (
          <Image src={coverUrl} alt={salon.name} fill className="object-cover" sizes="100vw" priority />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 to-neutral-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/50" />
        <BackButton fallbackHref="/app/recherche" />
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Carte d'identité — flotte au-dessus de la bannière (relief franc,
            façon fiche listing) plutôt qu'un simple bandeau posé à plat sur
            fond blanc comme avant. */}
        <div className="relative -mt-16 mb-6">
          {ownerProfile && (
            <ContentMenu
              type="profile"
              contentId={ownerProfile.id}
              authorUserId={ownerProfile.user?.id ?? null}
              authorName={ownerProfile.user?.name ?? null}
              tone="light"
              label="Signaler ce salon"
              className="absolute top-2 right-2 z-10 bg-white/80 backdrop-blur-sm"
            />
          )}
          <div className="bg-white rounded-[28px] shadow-[0_12px_36px_-12px_rgba(10,10,10,0.22)] px-5 pt-5 pb-4">
            <div className="flex items-end gap-4 -mt-16 mb-3">
              <div className="w-24 h-24 rounded-[24px] ring-4 ring-white bg-neutral-100 overflow-hidden flex-shrink-0 shadow-lg">
                {logoUrl ? (
                  <Image src={logoUrl} alt={salon.name} width={96} height={96} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
                    <span className="text-3xl font-bold text-neutral-400">{salon.name[0]}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[21px] font-bold text-neutral-900 tracking-[-0.02em]">{salon.name}</h1>
              {/* Le sceau de vérification suffit côté client. La pastille
                  « CHAIR Business » nommait un abonnement numérique payant
                  dans l'app client — retirée (décision Julien : aucun produit
                  d'abonnement mentionné côté client ; App Store 3.1.1(a)).
                  is_chair_business reste dans l'API pour l'espace pro. */}
              {(salon.is_verified || salon.is_chair_business) && (
                <BadgeCheck size={17} className="text-neutral-900 flex-shrink-0" />
              )}
            </div>
            {salon.city && (
              <div className="flex items-center gap-1 text-[13px] text-neutral-400 mt-1">
                <MapPin size={12} />{salon.city}
              </div>
            )}

            {/* Stats — chiffres en avant, séparateurs fins plutôt que 3 blocs
                identiques comme avant */}
            <div className="flex items-center gap-5 mt-4 pt-4 border-t border-neutral-100">
              <div>
                <p className="text-[18px] font-bold text-neutral-900 leading-none">{hairdressers.length}</p>
                <p className="text-[10.5px] text-neutral-400 mt-1">Coiffeur{hairdressers.length > 1 ? 's' : ''}</p>
              </div>
              {avgRating && (
                <>
                  <div className="w-px h-8 bg-neutral-100" />
                  <div>
                    <p className="text-[18px] font-bold text-neutral-900 leading-none flex items-center gap-1">
                      <Star size={13} className="fill-amber-400 text-amber-400" />{avgRating}
                    </p>
                    <p className="text-[10.5px] text-neutral-400 mt-1">Note moyenne</p>
                  </div>
                  <div className="w-px h-8 bg-neutral-100" />
                  <div>
                    <p className="text-[18px] font-bold text-neutral-900 leading-none">{totalReviews}</p>
                    <p className="text-[10.5px] text-neutral-400 mt-1">Avis</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {salon.description && (
          <p className="text-[13.5px] text-neutral-600 leading-relaxed mb-6 px-1">{salon.description}</p>
        )}

        {/* Réserver dans ce salon — au-dessus de tout le reste : c'est
            l'action que vient chercher quelqu'un à qui le salon plaît. Ouvre
            l'agenda du salon dans le navigateur du système, CHAIR reste
            ouverte derrière. */}
        {salon.booking_url && (
          <div className="mb-8">
            <PrimaryButton
              fullWidth
              href={salon.booking_url}
              target="_blank"
              icon={<ExternalLink size={15} strokeWidth={2} />}
            >
              Réserver dans ce salon
            </PrimaryButton>
            <p className="text-[12px] text-neutral-400 mt-2 text-center leading-relaxed">
              L&apos;agenda du salon s&apos;ouvre dans ton navigateur. Le paiement se fait sur place.
            </p>
          </div>
        )}

        {/* Localisation — la carte remplace l'adresse en texte : elle répond à
            « est-ce sur mon trajet ? », ce qu'une ligne d'adresse ne fait pas,
            et elle porte l'itinéraire. */}
        <LocationMapCard
          latitude={salon.latitude}
          longitude={salon.longitude}
          sectionTitle="Adresse"
          placeName={salon.name}
          addressLine={[salon.address, [salon.postal_code, salon.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || null}
          markerInitial={(salon.name ?? '?').charAt(0).toUpperCase()}
          markerKey={`salon-${salon.id}`}
          phone={salon.phone}
          className="mb-8"
        />

        {/* Infos pratiques — carte avec relief, icônes en pastille */}
        {(salon.website || salon.instagram_url) && (
          <div className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.12)] ring-1 ring-neutral-50 px-4 py-1 mb-8 divide-y divide-neutral-50">
            {salon.website && (
              <InfoRow icon={<Globe size={15} />} href={salon.website}>{salon.website.replace(/^https?:\/\//, '')}</InfoRow>
            )}
            {salon.instagram_url && (
              <InfoRow icon={<InstagramIcon size={15} />} href={salon.instagram_url}>Instagram</InfoRow>
            )}
          </div>
        )}

        {/* Équipe */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-neutral-400" />
              <h2 className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400">Notre équipe</h2>
            </div>
            {hairdressers.length > 0 && <ChevronRight size={14} className="text-neutral-200" />}
          </div>

          {hairdressers.length === 0 ? (
            <div className="text-center py-10 text-neutral-400 text-sm">
              Aucun coiffeur dans ce salon pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {hairdressers.map((h) => <TeamMemberCard key={h.id} h={h} />)}
            </div>
          )}
        </div>

        {/* Le travail de l'équipe.
            La fiche n'avait aucune image en dehors de sa bannière : elle
            présentait un lieu sans jamais montrer ce qu'on y fait. Plutôt
            qu'une galerie qu'un gérant devrait remplir à la main — et qui
            resterait vide — on affiche les réalisations déjà publiées par
            l'équipe. Du contenu réel, disponible dès aujourd'hui. */}
        {teamPosts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon size={14} className="text-neutral-400" />
              <h2 className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400">
                Leurs réalisations
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {teamPosts.map((post) => {
                const img = resolveMediaUrl(getAfterImage(post));
                return (
                  <Link
                    key={post.id}
                    href={`/app/realisation/${post.id}`}
                    className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 active:scale-[0.97] transition-transform"
                  >
                    {img && (
                      <Image
                        src={img}
                        alt={post.hairdresser?.user?.name ?? 'Réalisation'}
                        fill
                        className="object-cover"
                        sizes="33vw"
                      />
                    )}
                    {post.hairdresser?.user?.name && (
                      <>
                        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                        <p className="absolute bottom-1.5 left-2 right-2 text-[10.5px] font-semibold text-white truncate">
                          {post.hairdresser.user.name}
                        </p>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
