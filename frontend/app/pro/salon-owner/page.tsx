'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationCount } from '@/contexts/NotificationContext';
import SalonOwnerNav from '@/components/layout/SalonOwnerNav';
import SalonOwnerSidebar from '@/components/layout/SalonOwnerSidebar';
import ChairLogo from '@/components/ui/ChairLogo';
import {
  Building2, Users, Armchair, Briefcase, Bell,
  ArrowRight, ChevronRight, MapPin,
  AlertTriangle, LogOut,
} from 'lucide-react';
import { api, salons as salonsApi } from '@/lib/api';
import { resolveMediaUrl, type ApiSalonFull } from '@/lib/types';

interface DashboardData {
  salon:              ApiSalonFull | null;
  hairdressers_count: number;
  pending_joins:      number;
  job_offers_count:   number;
  pending_apps:       number;
  rentals_count:      number;
  pending_rentals:    number;
}

export default function SalonOwnerDashboard() {
  const { user, isLoading, logout } = useAuth();
  const router   = useRouter();
  const { unreadCount } = useNotificationCount();

  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== 'salon_owner') {
      router.replace('/pro');
      return;
    }

    Promise.allSettled([
      salonsApi.mySalon(),
      api.get<{ count: number }>('/my-salon/applications/pending-count'),
      api.get<unknown[]>('/my-salon/rentals'),
      api.get<unknown[]>('/my-salon/rental-requests'),
    ]).then(([salonRes, appsRes, rentalsRes, rentalReqsRes]) => {
      const salonData = salonRes.status === 'fulfilled' ? salonRes.value : null;
      const salon     = salonData?.salon ?? null;

      setData({
        salon,
        hairdressers_count: salon?.hairdressers?.length ?? 0,
        pending_joins:      salonData?.pending_requests?.length ?? 0,
        job_offers_count:   0,
        pending_apps:       appsRes.status === 'fulfilled' && appsRes.value && typeof appsRes.value === 'object' && 'count' in appsRes.value ? (appsRes.value as { count: number }).count : 0,
        rentals_count:      rentalsRes.status === 'fulfilled'    && Array.isArray(rentalsRes.value)    ? rentalsRes.value.length    : 0,
        pending_rentals:    rentalReqsRes.status === 'fulfilled' && Array.isArray(rentalReqsRes.value) ? rentalReqsRes.value.length : 0,
      });
    }).finally(() => setLoading(false));
  }, [user, isLoading, router]);

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

  const ACTIONS = [
    { icon: Briefcase, label: 'Créer une offre',       href: '/pro/recrutement', color: 'bg-neutral-900 text-white' },
    { icon: Armchair,  label: 'Ajouter un fauteuil',   href: '/pro/fauteuils',   color: 'bg-neutral-900 text-white' },
    { icon: Users,     label: 'Mon équipe',             href: '/pro/equipe',      color: 'bg-neutral-100 text-neutral-900' },
    { icon: Building2, label: 'Gérer mon salon',        href: '/pro/salon',       color: 'bg-neutral-100 text-neutral-900' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <SalonOwnerSidebar />
      <SalonOwnerNav />

      <main className="flex-1 md:ml-60 pb-28 md:pb-10">

      {/* Header mobile */}
      <div className="md:hidden sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 h-14 pt-safe flex items-center justify-between">
        <ChairLogo href="/pro/salon-owner" size="md" pro />
        <Link href="/pro/notifications" className="relative w-9 h-9 flex items-center justify-center">
          <Bell size={19} strokeWidth={1.5} className="text-neutral-500" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 rounded-full text-[7px] text-white font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-6 space-y-4">

        {/* Bonjour */}
        <div>
          <p className="text-xs text-neutral-400 capitalize">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-2xl font-bold text-neutral-900 mt-0.5">Bonjour, {firstName}</h1>
        </div>

        {/* Salon card */}
        {salon ? (
          <Link href="/pro/salon" className="block bg-white rounded-2xl border border-neutral-100 overflow-hidden hover:border-neutral-200 transition-colors">
            <div className="relative h-24 bg-neutral-200">
              {coverUrl && <Image src={coverUrl} alt={salon.name} fill className="object-cover" sizes="600px" />}
            </div>
            <div className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {logoUrl
                  ? <Image src={logoUrl} alt={salon.name} width={48} height={48} className="object-cover" />
                  : <Building2 size={20} className="text-neutral-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-neutral-900 truncate">{salon.name}</p>
                {salon.city && (
                  <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5">
                    <MapPin size={10} />{salon.city}
                  </div>
                )}
              </div>
              <ChevronRight size={16} className="text-neutral-400 flex-shrink-0" />
            </div>
          </Link>
        ) : (
          <Link href="/pro/salon" className="flex items-center gap-3 p-4 bg-neutral-900 text-white rounded-2xl">
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
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Coiffeurs',    value: data?.hairdressers_count ?? 0, icon: Users,    href: '/pro/equipe' },
            { label: 'Offres actives', value: data?.job_offers_count ?? 0, icon: Briefcase, href: '/pro/recrutement' },
            { label: 'Fauteuils',    value: data?.rentals_count ?? 0,      icon: Armchair, href: '/pro/fauteuils' },
          ].map((s, i) => (
            <Link key={i} href={s.href}
              className="bg-white rounded-2xl border border-neutral-100 p-4 flex flex-col gap-2 hover:border-neutral-200 transition-colors">
              <s.icon size={16} className="text-neutral-400" />
              <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
              <p className="text-[11px] text-neutral-400 leading-tight">{s.label}</p>
            </Link>
          ))}
        </div>

        {/* Actions rapides */}
        <div>
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-[0.15em] mb-3">Actions rapides</p>
          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map((a, i) => (
              <Link key={i} href={a.href}
                className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-semibold text-[14px] hover:opacity-90 transition-opacity ${a.color}`}>
                <a.icon size={18} className="flex-shrink-0" />
                <span className="leading-tight">{a.label}</span>
              </Link>
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
