'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Building2, Users, Briefcase, Armchair, Sparkles, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationCount } from '@/contexts/NotificationContext';
import { isProBinary } from '@/lib/appContext';
import BusinessAppGate from '@/components/business/BusinessAppGate';
import ChairLogo from '@/components/ui/ChairLogo';
import ProNav from '@/components/layout/ProNav';
import type { NavItem } from '@/hooks/useProNav';

/**
 * La coquille CHAIR BUSINESS — l'espace gérant comme app à part entière,
 * dans la MÊME DA que CHAIR et CHAIR PRO (règle absolue, audit 03/09/2026) :
 * même header (philosophie ProTopBar : opaque + ombre, jamais de verre
 * dépoli), même bottom nav (ProNav, pixel pour pixel), même wordmark
 * (ChairLogo). La différence est le contenu, pas la charte.
 *
 * Dans le binaire CHAIR PRO, tout /business affiche l'écran d'installation
 * (BusinessAppGate) : l'espace gérant ne vit JAMAIS dans l'app coiffeur.
 */
const TABS: NavItem[] = [
  { href: '/business',             label: 'Accueil',     icon: Home },
  { href: '/business/salon',       label: 'Salon',       icon: Building2 },
  { href: '/business/equipe',      label: 'Équipe',      icon: Users },
  { href: '/business/recrutement', label: 'Recrutement', icon: Briefcase },
  { href: '/business/fauteuils',   label: 'Fauteuils',   icon: Armchair },
];

export default function BusinessShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { unreadCount } = useNotificationCount();
  const router = useRouter();
  const pathname = usePathname();

  // L'écran de connexion vit sous /business mais AVANT toute session : ni
  // garde d'authentification ni chrome (header/nav) — il se rend nu, comme
  // /pro/connexion hors de la coquille pro.
  const estConnexion = pathname.startsWith('/business/connexion');

  useEffect(() => {
    if (estConnexion || isLoading) return;
    if (!user) { router.replace('/business/connexion'); return; }
    if (user.role === 'client') { router.replace('/app'); return; }
    // Coiffeur qui ne gère AUCUN salon : son monde est CHAIR PRO.
    if (user.can_manage_salon === false) router.replace('/pro');
  }, [user, isLoading, router, estConnexion]);

  if (estConnexion) {
    return <>{children}</>;
  }

  if (isLoading || !user || user.role === 'client' || user.can_manage_salon === false) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Binaire CHAIR PRO : l'espace gérant a sa propre app.
  if (isProBinary()) {
    return <BusinessAppGate />;
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-50">

      {/* ── Header mobile — mêmes classes que ProTopBar (opaque + ombre),
          cloche notifications comprise (Pulse du lundi, radar avis…). ── */}
      <div className="md:hidden fixed top-[var(--chair-banner-h,0px)] inset-x-0 z-50 bg-white shadow-[0_4px_20px_-8px_rgba(10,10,10,0.08)] pt-safe">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="w-9" />
          <ChairLogo href="/business" size="md" business />
          <Link href="/business/notifications" className="relative w-11 h-11 flex items-center justify-center">
            <Bell size={19} strokeWidth={1.5} className="text-neutral-500" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 rounded-full text-[7px] text-white font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ── Header desktop — même philosophie (opaque + ombre), liens en pills. ── */}
      <div className="hidden md:block sticky top-0 z-50 bg-white shadow-[0_4px_20px_-8px_rgba(10,10,10,0.08)]">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <ChairLogo href="/business" size="md" business />
          <nav className="flex items-center gap-1">
            {TABS.map((tab) => {
              const actif = tab.href === '/business' ? pathname === tab.href : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`h-9 px-3.5 inline-flex items-center rounded-full text-[13px] font-semibold transition-colors ${
                    actif ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
            <Link
              href="/business/abonnement"
              className="ml-1 h-9 px-3.5 inline-flex items-center gap-1.5 rounded-full text-[13px] font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors"
            >
              <Sparkles size={13} /> Abonnement
            </Link>
          </nav>
        </div>
      </div>

      {/* ── Contenu — décalé sous le header fixe mobile, au-dessus de la nav. ── */}
      <main className="pt-content-mobile-pro md:pt-0 pb-24 md:pb-10">
        {children}
      </main>

      {/* ── LA bottom nav de la famille — ProNav, avec les onglets gérant. ── */}
      <ProNav items={TABS} homeHref="/business" />
    </div>
  );
}
