'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  Building2, Armchair, Briefcase, ChevronRight, UserPlus,
  LogOut, Scissors, Star, Check, Sparkles, TrendingUp, Trophy,
} from 'lucide-react';
import { api, salons as salonsApi, subscription as subscriptionApi } from '@/lib/api';
import { resolveMediaUrl, type ApiSalonFull, type ApiSalonRecentReview, type ApiMySubscription, type ApiSalonPulse } from '@/lib/types';
import { isBusinessBinary } from '@/lib/appContext';
import { PRO_APP_STORE_URL } from '@/lib/appDownload';
import { CARTE, CARTE_TAP, CARTE_SOMBRE_TAP, MICRO_TITRE } from '@/lib/proStyle';
import { contributionLigne, type MembreContribution } from '@/lib/teamContribution';
import OwnerTeamMember from '@/components/owner/OwnerTeamMember';
import OwnerActionCard from '@/components/owner/OwnerActionCard';
import { PrimaryButton } from '@/components/ui/Button';

/**
 * Home CHAIR BUSINESS — la page que le patron ouvre chaque matin.
 * Refonte UX du 03/09/2026 (brief fondateur + plan architecte) :
 * elle répond dans l'ordre à « dois-je traiter quelque chose ? » (À traiter,
 * premier viewport), « comment va mon salon ? » (indicateurs réels), « qui
 * fait quoi ? » (équipe humaine, activité), puis les actions et le statut
 * d'abonnement. Aucune métrique inventée : chaque chiffre vient d'un
 * endpoint réel, et une section sans donnée est masquée — jamais de « 0 ».
 */

interface TeamMember extends MembreContribution {
  id: number;
  user?: { name?: string };
  avatar?: string | null;
}

interface Traiter {
  compte: number | null; // null = ligne de setup (point ambre, pas de compteur)
  label: string;
  href: string;
}

/** Jours restants avant une date ISO (essai CHAIR Business). */
function joursRestants(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

/** « aujourd'hui » / « hier » / « il y a X j » — pour l'activité récente. */
function depuis(iso: string): string {
  const jours = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return 'hier';
  return `il y a ${jours} j`;
}

export default function BusinessHome() {
  const { logout, enableHairdresserMode } = useAuth();
  // Capacité, pas rôle strict : un coiffeur double-casquette garde
  // role='hairdresser' — useRequireAuth('salon_owner') vérifie can_manage_salon.
  const { user, isLoading } = useRequireAuth(['salon_owner']);

  const [salon, setSalon] = useState<ApiSalonFull | null>(null);
  const [pendingJoins, setPendingJoins] = useState(0);
  const [pendingApps, setPendingApps] = useState(0);
  const [pendingRentals, setPendingRentals] = useState(0);
  const [recentReviews, setRecentReviews] = useState<ApiSalonRecentReview[]>([]);
  const [pulse, setPulse] = useState<ApiSalonPulse | null>(null);
  const [sub, setSub] = useState<ApiMySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);

  async function handleEnableHairdresserMode() {
    setEnabling(true);
    try {
      await enableHairdresserMode();
    } catch {
      setEnabling(false);
    }
  }

  useEffect(() => {
    if (isLoading || !user) return;

    Promise.allSettled([
      salonsApi.mySalon(),
      api.get<{ count: number }>('/my-salon/applications/pending-count'),
      // ?status=pending : sans le filtre, les demandes déjà acceptées ou
      // refusées gonflaient le compteur (bug de l'ancienne home, corrigé ici).
      api.get<unknown[]>('/my-salon/rental-requests?status=pending'),
      salonsApi.recentReviews(),
      salonsApi.pulse(),
      subscriptionApi.mine(),
    ]).then(([salonRes, appsRes, rentalReqsRes, reviewsRes, pulseRes, subRes]) => {
      const salonData = salonRes.status === 'fulfilled' ? salonRes.value : null;
      setSalon(salonData?.salon ?? null);
      setPendingJoins(salonData?.pending_requests?.length ?? 0);
      setPendingApps(appsRes.status === 'fulfilled' && appsRes.value && typeof appsRes.value === 'object' && 'count' in appsRes.value ? (appsRes.value as { count: number }).count : 0);
      setPendingRentals(rentalReqsRes.status === 'fulfilled' && Array.isArray(rentalReqsRes.value) ? rentalReqsRes.value.length : 0);
      if (reviewsRes.status === 'fulfilled') setRecentReviews(reviewsRes.value);
      if (pulseRes.status === 'fulfilled') setPulse(pulseRes.value);
      if (subRes.status === 'fulfilled') setSub(subRes.value);
    }).finally(() => setLoading(false));
  }, [user, isLoading]);

  const firstName = user?.name?.split(' ')[0] ?? '';
  const todayDateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  if (isLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 space-y-4">
        <div className="h-10 bg-neutral-100 rounded-xl animate-pulse" />
        <div className="h-44 bg-neutral-100 rounded-[28px] animate-pulse" />
        <div className="h-28 bg-neutral-100 rounded-[28px] animate-pulse" />
      </div>
    );
  }

  const team = (salon?.hairdressers ?? []) as unknown as TeamMember[];
  const logoUrl = resolveMediaUrl(salon?.logo ?? null);

  // ── « À traiter » : demandes réelles d'abord, setup ensuite. ──
  const aTraiter: Traiter[] = [];
  if (salon) {
    if (pendingJoins > 0)   aTraiter.push({ compte: pendingJoins,   label: `demande${pendingJoins > 1 ? 's' : ''} d'équipe à traiter`,    href: '/business/equipe' });
    if (pendingApps > 0)    aTraiter.push({ compte: pendingApps,    label: `candidature${pendingApps > 1 ? 's' : ''} à traiter`,          href: '/business/recrutement' });
    if (pendingRentals > 0) aTraiter.push({ compte: pendingRentals, label: `demande${pendingRentals > 1 ? 's' : ''} de fauteuil à traiter`, href: '/business/fauteuils' });
    if (!salon.siret) {
      aTraiter.push({ compte: null, label: 'Ajoutez votre SIRET pour être vérifié', href: '/business/salon' });
    } else if (salon.verification_status === 'pending_review') {
      aTraiter.push({ compte: null, label: 'Vérification SIRET en cours', href: '/business/salon' });
    }
    if (!salon.description || !salon.cover_image) {
      aTraiter.push({ compte: null, label: 'Complétez votre page salon', href: '/business/salon' });
    }
    // Alerte membre « perte de vitesse » (Pulse) : un point à faire, donc
    // À TRAITER — l'étoile montante, elle, vit dans « Votre semaine ».
    for (const a of (pulse?.alertes ?? []).filter((a) => a.type === 'baisse')) {
      aTraiter.push({ compte: null, label: `${a.nom} : aucun avis en 30 j`, href: '/business/equipe' });
    }
  }

  // ── « Mon salon » : cumuls réels de l'équipe (jamais inventés). ──
  const totalPassages = team.reduce((acc, m) => acc + (m.verified_visits_count ?? 0), 0);
  const totalAvis = team.reduce((acc, m) => acc + (m.reviews_count ?? 0), 0);
  // Moyenne pondérée par le nombre d'avis — même résultat que le calcul
  // backend de la fiche publique (SalonController::show).
  const notePonderee = totalAvis > 0
    ? team.reduce((acc, m) => acc + (parseFloat(String(m.avg_rating ?? 0)) * (m.reviews_count ?? 0)), 0) / totalAvis
    : null;
  const montrerSalonStats = team.length > 0 && (totalPassages > 0 || totalAvis > 0);

  // ── Statut CHAIR Business (une ligne, pas une bannière). ──
  const salonSub = sub?.salon_subscription ?? null;
  const businessActif = sub?.has_chair_business ?? false;
  const joursEssai = salonSub?.status === 'trialing' && salonSub.trial_ends_at
    ? joursRestants(salonSub.trial_ends_at)
    : null;

  // ═══ Variante « nouveau gérant » : pas encore de salon — home de setup. ═══
  if (!salon) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-[26px] font-bold text-neutral-900 tracking-[-0.02em] truncate">
            {firstName ? `Bonjour ${firstName}` : 'Bonjour'}
          </h1>
          <span className="text-[12px] text-neutral-400 capitalize shrink-0">{todayDateStr}</span>
        </div>

        <Link href="/business/salon" className={`${CARTE_SOMBRE_TAP} flex items-center gap-4 p-6`}>
          <Building2 size={22} className="flex-shrink-0 text-white" strokeWidth={1.5} />
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-bold">Créez la page de votre salon</span>
            <span className="block text-[12px] text-white/50 mt-0.5">Visible publiquement sur CHAIR — photos, équipe, avis.</span>
          </span>
          <ChevronRight size={16} className="text-white/40 flex-shrink-0" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 space-y-4">

      {/* ══ Qui je suis — une ligne, pas une carte (pattern home PRO). ══ */}
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-[26px] font-bold text-neutral-900 tracking-[-0.02em] truncate">
            {firstName ? `Bonjour ${firstName}` : 'Bonjour'}
          </h1>
          <span className="text-[12px] text-neutral-400 capitalize shrink-0">{todayDateStr}</span>
        </div>
        {/* La photo du salon comme matière (passe Apple 16/09) : quand elle
            existe, elle ouvre la page — sinon la ligne sobre habituelle. */}
        {salon.cover_image ? (
          <Link href="/business/salon" className="relative block mt-3 h-24 rounded-[24px] overflow-hidden active:scale-[0.99] transition-transform">
            <Image src={resolveMediaUrl(salon.cover_image)!} alt="" fill className="object-cover" sizes="672px" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <span className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
              {logoUrl && (
                <span className="relative w-6 h-6 rounded-full overflow-hidden ring-1 ring-white/40 flex-shrink-0">
                  <Image src={logoUrl} alt="" fill className="object-cover" sizes="24px" />
                </span>
              )}
              <span className="text-[14px] font-bold text-white truncate">{salon.name}</span>
              <ChevronRight size={14} className="text-white/60 flex-shrink-0 ml-auto" />
            </span>
          </Link>
        ) : (
          <Link href="/business/salon" className="mt-1 inline-flex items-center gap-2 group">
            <span className="relative w-7 h-7 rounded-full bg-neutral-100 overflow-hidden flex items-center justify-center flex-shrink-0">
              {logoUrl
                ? <Image src={logoUrl} alt="" fill className="object-cover" sizes="28px" />
                : <Building2 size={13} className="text-neutral-400" />
              }
            </span>
            <span className="text-[13px] font-semibold text-neutral-500 group-hover:text-neutral-900 transition-colors truncate">{salon.name}</span>
            <ChevronRight size={14} className="text-neutral-300 flex-shrink-0" />
          </Link>
        )}
      </div>

      {/* ══ À TRAITER — le bloc roi, visible sans scroller. ══ */}
      {aTraiter.length > 0 ? (
        <div className={`${CARTE} anim-entree anim-entree-1`}>
          <p className={`${MICRO_TITRE} px-5 pt-4`}>À traiter</p>
          <div className="mt-2 pb-1.5">
            {aTraiter.map((t, i) => (
              <Link
                key={t.label}
                href={t.href}
                className={`flex items-center gap-3 px-5 py-3 min-h-[48px] active:bg-neutral-50 transition-colors ${i > 0 ? 'border-t border-neutral-50' : ''}`}
              >
                {t.compte !== null ? (
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 tabular-nums">
                    {t.compte}
                  </span>
                ) : (
                  <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  </span>
                )}
                <span className="flex-1 min-w-0 text-[14px] font-semibold text-neutral-900 truncate">
                  {t.compte !== null ? `${t.compte} ${t.label}` : t.label}
                </span>
                <ChevronRight size={16} className="text-neutral-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-[13px] text-neutral-400 px-1">
          <Check size={13} className="text-emerald-500" /> Tout est à jour
        </p>
      )}

      {/* ══ MON SALON — 3 chiffres réels, une rangée compacte. ══ */}
      {montrerSalonStats && (
        <div className={`${CARTE} p-5`}>
          <p className={MICRO_TITRE}>Mon salon</p>
          <div className="mt-3 grid grid-cols-3">
            {notePonderee != null && (
              <Link href="/business/equipe" className="min-w-0">
                <p className="text-[22px] font-bold text-neutral-900 tabular-nums flex items-center gap-1">
                  <Star size={14} className="fill-amber-400 stroke-none" />{notePonderee.toFixed(1)}
                </p>
                <p className="text-[11px] text-neutral-400">Note du salon</p>
              </Link>
            )}
            <Link href="/business/equipe" className="min-w-0">
              <p className="text-[22px] font-bold text-neutral-900 tabular-nums">{totalPassages}</p>
              <p className="text-[11px] text-neutral-400">Passages vérifiés</p>
            </Link>
            <Link href="/business/equipe" className="min-w-0">
              <p className="text-[22px] font-bold text-neutral-900 tabular-nums">{totalAvis}</p>
              <p className="text-[11px] text-neutral-400">Avis reçus</p>
            </Link>
          </div>
        </div>
      )}

      {/* ══ VOTRE SEMAINE — le Pulse : 7 jours d'avis, tendance, top membre,
          étoile montante et position locale. Masquée quand la semaine n'a
          rien produit — jamais de « 0 avis » en guise de bilan. ══ */}
      {(() => {
        const sem = pulse?.semaine;
        const etoile = (pulse?.alertes ?? []).find((a) => a.type === 'etoile');
        const rangLocal = pulse?.classement_local ?? null;
        if (!sem || (sem.avis === 0 && !etoile && !rangLocal)) return null;
        const delta = sem.avis - sem.avis_precedent;
        return (
          <div className={`${CARTE} p-5 anim-entree anim-entree-2`}>
            <p className={`${MICRO_TITRE} mb-3`}>Votre semaine</p>
            {sem.avis > 0 && (
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="text-[22px] font-bold text-neutral-900 tabular-nums">
                  {sem.avis} avis
                </p>
                {sem.note != null && (
                  <span className="flex items-center gap-0.5 text-[14px] font-bold text-neutral-900">
                    <Star size={12} className="fill-amber-400 stroke-none" />{sem.note.toFixed(1)}
                  </span>
                )}
                {delta !== 0 && (
                  <span className={`text-[12px] font-semibold ${delta > 0 ? 'text-emerald-600' : 'text-neutral-400'}`}>
                    {delta > 0 ? `+${delta}` : delta} vs sem. précédente
                  </span>
                )}
              </div>
            )}
            <div className="mt-2 space-y-1.5">
              {sem.top && sem.avis > 0 && (
                <p className="flex items-center gap-1.5 text-[12.5px] text-neutral-600">
                  <Trophy size={12} className="text-neutral-400 shrink-0" />
                  <span className="font-semibold text-neutral-900">{sem.top.nom}</span> en tête ({sem.top.avis} avis)
                </p>
              )}
              {etoile && (
                <p className="flex items-center gap-1.5 text-[12.5px] text-neutral-600">
                  <TrendingUp size={12} className="text-emerald-500 shrink-0" />
                  <span className="font-semibold text-neutral-900">{etoile.nom}</span> décolle : {etoile.avis} avis en 30 j
                </p>
              )}
              {rangLocal && (
                <p className="flex items-center gap-1.5 text-[12.5px] text-neutral-600">
                  <Building2 size={12} className="text-neutral-400 shrink-0" />
                  n°{rangLocal.rang} sur {rangLocal.total} salons à {rangLocal.ville} ce mois-ci
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══ MON ÉQUIPE — des visages, pas des chiffres. ══ */}
      {team.length > 0 ? (
        <div className={`${CARTE} p-5 anim-entree anim-entree-3`}>
          <div className="flex items-center justify-between mb-3">
            <p className={MICRO_TITRE}>Mon équipe</p>
            <Link href="/business/equipe" className="flex items-center text-neutral-300 hover:text-neutral-500 transition-colors -m-2 p-2">
              <ChevronRight size={16} />
            </Link>
          </div>
          <div className="space-y-2">
            {team.slice(0, 3).map((m) => (
              <OwnerTeamMember
                key={m.id}
                variant="inline"
                avatarUrl={resolveMediaUrl(m.avatar ?? null)}
                name={m.user?.name ?? 'Coiffeur'}
                subtitle={contributionLigne(m, team)}
              />
            ))}
          </div>
          <Link href="/business/equipe" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-neutral-900 hover:underline">
            Voir toute l&apos;équipe ({team.length}) <ChevronRight size={14} />
          </Link>
        </div>
      ) : (
        <Link href="/business/equipe" className={`${CARTE_TAP} flex items-center gap-3 px-5 min-h-[60px] py-3`}>
          <UserPlus size={17} className="text-neutral-400 shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-semibold text-neutral-900">Invitez votre premier coiffeur</span>
            <span className="block text-[12px] text-neutral-500">Votre équipe apparaîtra sur la page du salon.</span>
          </span>
          <ChevronRight size={16} className="text-neutral-300 shrink-0" />
        </Link>
      )}

      {/* ══ ACTIVITÉ RÉCENTE — v1 : les avis reçus par l'équipe. ══ */}
      {recentReviews.length > 0 && (
        <div className={`${CARTE} p-5`}>
          <p className={`${MICRO_TITRE} mb-3`}>Activité récente</p>
          <div className="space-y-3">
            {recentReviews.slice(0, 3).map((r) => (
              <Link key={r.id} href="/business/equipe" className="flex items-start gap-2.5 group">
                <span className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                  <Star size={11} className="fill-amber-400 stroke-none" />
                  <span className="text-xs font-bold text-neutral-900">{r.rating}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-neutral-600 line-clamp-2 group-hover:text-neutral-900 transition-colors">
                    {r.comment || <span className="italic text-neutral-400">Sans commentaire</span>}
                  </span>
                  <span className="block text-[10px] text-neutral-400 mt-0.5">
                    {r.hairdresser_name}{r.is_verified && ' · visite vérifiée'}{r.created_at && ` · ${depuis(r.created_at)}`}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ══ ACTIONS RAPIDES ══ */}
      <div>
        <p className={`${MICRO_TITRE} mb-3`}>Actions rapides</p>
        <div className="grid grid-cols-2 gap-3">
          <OwnerActionCard icon={Briefcase} label="Créer une offre" href="/business/recrutement" />
          <OwnerActionCard icon={Armchair} label="Ajouter un fauteuil" href="/business/fauteuils" />
          <OwnerActionCard icon={UserPlus} label="Inviter un coiffeur" href="/business/equipe" colorClassName="light" />
          {salon.slug && (
            <OwnerActionCard icon={Building2} label="Ma page publique" href={`/app/salon/${salon.slug}`} colorClassName="light" />
          )}
        </div>
      </div>

      {/* ══ CHAIR BUSINESS — une ligne de statut, pas une bannière. ══ */}
      <Link href="/business/abonnement" className={`${CARTE_TAP} flex items-center gap-3 px-5 min-h-[60px] py-3`}>
        <Sparkles size={17} className={businessActif ? 'text-[#f5b942] shrink-0' : 'text-neutral-400 shrink-0'} />
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-semibold text-neutral-900">CHAIR Business</span>
          <span className="block text-[12px] text-neutral-500">
            {joursEssai != null
              ? `${joursEssai} jour${joursEssai > 1 ? 's' : ''} d'essai restant${joursEssai > 1 ? 's' : ''}`
              : businessActif
                ? 'Actif'
                : "Salon mis en avant, analytics d'équipe"}
          </span>
        </span>
        <ChevronRight size={16} className="text-neutral-300 shrink-0" />
      </Link>

      {/* ══ Double casquette — en bas : utile, mais pas prioritaire.
          Un bouton de switch doit VRAIMENT changer d'app (retour Julien
          15/09) : dans le binaire BUSINESS, « Ouvrir CHAIR PRO » sort vers
          l'app coiffeur (fiche App Store, ou l'espace web en repli) — que le
          gérant ait déjà son profil coiffeur (il y travaille) ou pas encore
          (il l'y créera). Sur le web, l'activation instantanée reste. ══ */}
      {isBusinessBinary() ? (
        <div className={`${CARTE} p-4 flex items-center gap-3.5`}>
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <Scissors size={16} className="text-neutral-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-neutral-900">
              {user?.has_hairdresser_profile ? 'Votre activité coiffeur' : 'Vous coupez aussi les cheveux ?'}
            </p>
            <p className="text-xs text-neutral-400">
              {user?.has_hairdresser_profile
                ? 'Même compte, autre app.'
                : 'Même compte, autre app.'}
            </p>
          </div>
          <a
            href={PRO_APP_STORE_URL || 'https://getchair.app/pro'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold bg-neutral-900 text-white px-3 py-2 rounded-xl hover:bg-neutral-700 transition-colors"
          >
            Ouvrir CHAIR PRO
          </a>
        </div>
      ) : !user?.has_hairdresser_profile && (
        <div className={`${CARTE} p-4 flex items-center gap-3.5`}>
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <Scissors size={16} className="text-neutral-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-neutral-900">Vous coupez aussi les cheveux ?</p>
            <p className="text-xs text-neutral-400">Activez votre profil coiffeur dans {salon.name}.</p>
          </div>
          <PrimaryButton size="sm" loading={enabling} onClick={handleEnableHairdresserMode} className="flex-shrink-0">
            Activer
          </PrimaryButton>
        </div>
      )}

      {/* Déconnexion mobile */}
      <div className="pt-2 pb-2 md:hidden">
        <button onClick={logout}
          className="flex items-center gap-2 text-[13px] text-neutral-400 hover:text-neutral-700 transition-colors">
          <LogOut size={14} />Se déconnecter
        </button>
      </div>
    </div>
  );
}
