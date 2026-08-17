'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  Building2, Armchair, Briefcase,
  ArrowRight, ChevronRight, MapPin, Edit2, UserPlus,
  AlertTriangle, LogOut, Scissors, Star,
} from 'lucide-react';
import { api, salons as salonsApi } from '@/lib/api';
import { resolveMediaUrl, type ApiSalonFull, type ApiSalonRecentReview } from '@/lib/types';
import ProModeSwitcher from '@/components/layout/ProModeSwitcher';
import OwnerStat from '@/components/owner/OwnerStat';
import OwnerActionCard from '@/components/owner/OwnerActionCard';

interface TeamMember {
  id: number;
  user?: { name?: string };
  avatar?: string | null;
}

interface DashboardData {
  salon:              ApiSalonFull | null;
  team:                TeamMember[];
  hairdressers_count: number;
  pending_joins:      number;
  job_offers_count:   number;
  pending_apps:       number;
  rentals_count:      number;
  pending_rentals:    number;
}

export default function SalonOwnerDashboard() {
  const { logout, enableHairdresserMode } = useAuth();
  // Un compte double-identité (hairdresser + can_manage_salon) garde
  // user.role === 'hairdresser' même en mode Gérant actif — seul
  // active_pro_mode change. L'ancien garde-fou local comparait directement
  // user.role === 'salon_owner', ce qui renvoyait TOUJOURS ces comptes vers
  // /pro, qui les renvoyait à son tour ici (voir /pro/page.tsx) : boucle de
  // redirection infinie, plantage réel constaté sur iPhone. useRequireAuth
  // applique la même règle de capacité (can_manage_salon) que partout
  // ailleurs dans l'app plutôt qu'un rôle strict.
  const { user, isLoading } = useRequireAuth(['salon_owner']);

  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [recentReviews, setRecentReviews] = useState<ApiSalonRecentReview[]>([]);

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
      api.get<unknown[]>('/my-salon/rentals'),
      api.get<unknown[]>('/my-salon/rental-requests'),
      salonsApi.recentReviews(),
      api.get<{ status: string }[]>('/my-job-offers'),
    ]).then(([salonRes, appsRes, rentalsRes, rentalReqsRes, reviewsRes, jobOffersRes]) => {
      if (reviewsRes.status === 'fulfilled') setRecentReviews(reviewsRes.value);
      const salonData = salonRes.status === 'fulfilled' ? salonRes.value : null;
      const salon     = salonData?.salon ?? null;

      setData({
        salon,
        team:                (salon?.hairdressers ?? []) as unknown as TeamMember[],
        hairdressers_count: salon?.hairdressers?.length ?? 0,
        pending_joins:      salonData?.pending_requests?.length ?? 0,
        job_offers_count:   jobOffersRes.status === 'fulfilled' && Array.isArray(jobOffersRes.value) ? jobOffersRes.value.filter((o) => o.status === 'open').length : 0,
        pending_apps:       appsRes.status === 'fulfilled' && appsRes.value && typeof appsRes.value === 'object' && 'count' in appsRes.value ? (appsRes.value as { count: number }).count : 0,
        rentals_count:      rentalsRes.status === 'fulfilled'    && Array.isArray(rentalsRes.value)    ? rentalsRes.value.length    : 0,
        pending_rentals:    rentalReqsRes.status === 'fulfilled' && Array.isArray(rentalReqsRes.value) ? rentalReqsRes.value.length : 0,
      });
    }).finally(() => setLoading(false));
  }, [user, isLoading]);

  const firstName = user?.name?.split(' ')[0] ?? '';

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const salon    = data?.salon;
  const coverUrl = resolveMediaUrl(salon?.cover_image ?? null);
  const logoUrl  = resolveMediaUrl(salon?.logo ?? null);

  const alerts: { label: string; href: string }[] = [];
  if (!salon)                                          alerts.push({ label: 'Créez la page de votre salon',             href: '/pro/salon' });
  if (salon && !salon.description)                     alerts.push({ label: 'Ajoutez une description à votre salon',   href: '/pro/salon' });
  if ((data?.pending_joins ?? 0) > 0)                  alerts.push({ label: `${data!.pending_joins} demande(s) de coiffeur en attente`, href: '/pro/salon' });
  if ((data?.pending_apps ?? 0) > 0)                   alerts.push({ label: `${data!.pending_apps} candidature(s) à traiter`,           href: '/pro/recrutement' });
  if ((data?.pending_rentals ?? 0) > 0)                alerts.push({ label: `${data!.pending_rentals} demande(s) de fauteuil`,           href: '/pro/fauteuils' });
  if (salon?.verification_status === 'pending_review') alerts.push({ label: 'Vérification SIRET en cours',                              href: '/pro/salon' });

  const ACTIONS = [
    { icon: Briefcase, label: 'Créer une offre',     href: '/pro/recrutement', color: 'bg-neutral-900 text-white' },
    { icon: Armchair,  label: 'Ajouter un fauteuil', href: '/pro/fauteuils',   color: 'bg-neutral-900 text-white' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <main className="flex-1">

      <div className="max-w-xl mx-auto px-4 pt-6 space-y-4">

        {/* Double identité : Mode Gérant / Mode Coiffeur (mobile — la
            sidebar desktop a la sienne) */}
        {(user?.can_manage_salon && user?.has_hairdresser_profile) && (
          <div className="md:hidden">
            <ProModeSwitcher />
          </div>
        )}

        {/* Double identité : proposer d'activer le mode coiffeur si le gérant
            coupe lui-même dans son salon */}
        {salon && !user?.has_hairdresser_profile && (
          <div className="bg-white rounded-[22px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.12)] ring-1 ring-neutral-50 p-4 flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <Scissors size={16} className="text-neutral-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-neutral-900">Vous coupez aussi les cheveux ?</p>
              <p className="text-xs text-neutral-400">Activez votre profil coiffeur dans {salon.name}.</p>
            </div>
            <button
              onClick={handleEnableHairdresserMode}
              disabled={enabling}
              className="text-xs font-semibold bg-neutral-900 text-white px-3.5 py-2 rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {enabling ? '...' : 'Activer'}
            </button>
          </div>
        )}

        {/* Bonjour */}
        <div>
          <p className="text-xs text-neutral-400 capitalize">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-2xl font-bold text-neutral-900 mt-0.5">Bonjour, {firstName}</h1>
        </div>

        {/* Salon card */}
        {salon ? (
          <div className="bg-white rounded-[26px] shadow-[0_8px_26px_-10px_rgba(10,10,10,0.16)] ring-1 ring-neutral-50 overflow-hidden">
            <Link href="/pro/salon" className="block hover:opacity-90 transition-opacity">
              <div className="relative h-24 bg-neutral-200">
                {coverUrl && <Image src={coverUrl} alt={salon.name} fill className="object-cover" sizes="600px" />}
              </div>
            </Link>
            <div className="p-4 flex items-center gap-3">
              <Link href="/pro/salon" className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {logoUrl
                  ? <Image src={logoUrl} alt={salon.name} width={48} height={48} className="object-cover" />
                  : <Building2 size={20} className="text-neutral-400" />
                }
              </Link>
              <Link href="/pro/salon" className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-neutral-900 truncate">{salon.name}</p>
                {salon.city && (
                  <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5">
                    <MapPin size={10} />{salon.city}
                  </div>
                )}
              </Link>
              <Link href="/pro/salon?edit=1"
                className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-900 hover:text-white transition-colors flex-shrink-0"
                title="Modifier la fiche salon">
                <Edit2 size={13} />
              </Link>
            </div>

            {/* Équipe — aperçu direct, sans page intermédiaire */}
            <Link href="/pro/equipe" className="flex items-center gap-3 px-4 py-3 border-t border-neutral-50 hover:bg-neutral-50 transition-colors">
              {data && data.team.length > 0 ? (
                <div className="flex -space-x-2 flex-shrink-0">
                  {data.team.slice(0, 4).map((m) => (
                    <div key={m.id} className="w-7 h-7 rounded-full bg-neutral-200 border-2 border-white overflow-hidden relative flex items-center justify-center">
                      {m.avatar
                        ? <Image src={resolveMediaUrl(m.avatar)!} alt="" fill className="object-cover" sizes="28px" />
                        : <span className="text-[10px] font-bold text-neutral-500">{m.user?.name?.[0] ?? '?'}</span>
                      }
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <UserPlus size={12} className="text-neutral-400" />
                </div>
              )}
              <span className="text-xs font-medium text-neutral-600 flex-1">
                {data?.hairdressers_count ? `${data.hairdressers_count} coiffeur${data.hairdressers_count > 1 ? 's' : ''} dans l'équipe` : 'Inviter un coiffeur'}
              </span>
              <ChevronRight size={14} className="text-neutral-400 flex-shrink-0" />
            </Link>
          </div>
        ) : (
          <Link href="/pro/salon" className="flex items-center gap-3 p-4 bg-neutral-900 text-white rounded-[22px]">
            <Building2 size={20} className="flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Créez la page de votre salon</p>
              <p className="text-xs text-neutral-400 mt-0.5">Visible publiquement sur CHAIR</p>
            </div>
            <ArrowRight size={16} className="flex-shrink-0" />
          </Link>
        )}

        {/* Alertes */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <Link key={i} href={a.href}
                className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors">
                <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                <span className="text-[13px] text-amber-800 font-medium flex-1">{a.label}</span>
                <ChevronRight size={14} className="text-amber-500 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}

        {/* Stats rapides */}
        <div className="grid grid-cols-2 gap-3">
          <OwnerStat icon={Briefcase} value={data?.job_offers_count ?? 0} label="Offres actives" href="/pro/recrutement" />
          <OwnerStat icon={Armchair}  value={data?.rentals_count ?? 0}   label="Fauteuils"       href="/pro/fauteuils" />
        </div>

        {/* Avis récents — ce qui s'est passé depuis la dernière visite */}
        {recentReviews.length > 0 && (
          <div className="bg-white rounded-[22px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.12)] ring-1 ring-neutral-50 p-4">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-[0.15em] mb-3">Avis récents</p>
            <div className="space-y-3">
              {recentReviews.slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-start gap-2.5">
                  <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                    <Star size={11} className="fill-amber-400 stroke-none" />
                    <span className="text-xs font-bold text-neutral-900">{r.rating}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-neutral-600 line-clamp-2">
                      {r.comment || <span className="italic text-neutral-400">Sans commentaire</span>}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      {r.hairdresser_name} {r.is_verified && '· visite vérifiée'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions rapides */}
        <div>
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-[0.15em] mb-3">Actions rapides</p>
          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map((a, i) => (
              <OwnerActionCard key={i} icon={a.icon} label={a.label} href={a.href} colorClassName={a.color} />
            ))}
          </div>
        </div>

        {/* Déconnexion mobile */}
        <div className="pt-2 pb-2 md:hidden">
          <button onClick={logout}
            className="flex items-center gap-2 text-[13px] text-neutral-400 hover:text-neutral-700 transition-colors">
            <LogOut size={14} />Se déconnecter
          </button>
        </div>
      </div>
      </main>
    </div>
  );
}
