'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Building2, Users, Briefcase, Armchair, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isProBinary } from '@/lib/appContext';
import BusinessAppGate from '@/components/business/BusinessAppGate';

/**
 * La coquille CHAIR BUSINESS — l'espace gérant comme app à part entière :
 * wordmark noir/or, navigation propre (tabs mobile + liens desktop), et les
 * gardes d'accès. Aucune trace de l'univers coiffeur : plus de transition de
 * mode entre les apps (décision Julien 02/09/2026).
 *
 * Dans le binaire CHAIR PRO, tout /business affiche l'écran d'installation
 * (BusinessAppGate) : l'espace gérant ne vit JAMAIS dans l'app coiffeur.
 */
const TABS = [
  { href: '/business',             label: 'Accueil',     icon: Home,      exact: true },
  { href: '/business/salon',       label: 'Salon',       icon: Building2, exact: false },
  { href: '/business/equipe',      label: 'Équipe',      icon: Users,     exact: false },
  { href: '/business/recrutement', label: 'Recrutement', icon: Briefcase, exact: false },
  { href: '/business/fauteuils',   label: 'Fauteuils',   icon: Armchair,  exact: false },
];

export default function BusinessShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/pro/connexion'); return; }
    if (user.role === 'client') { router.replace('/app'); return; }
    // Coiffeur qui ne gère AUCUN salon : son monde est CHAIR PRO.
    if (user.can_manage_salon === false) router.replace('/pro');
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role === 'client' || user.can_manage_salon === false) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Binaire CHAIR PRO : l'espace gérant a sa propre app.
  if (isProBinary()) {
    return <BusinessAppGate />;
  }

  const estActif = (tab: (typeof TABS)[number]) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

  return (
    <div className="min-h-[100dvh] bg-neutral-50 flex flex-col">

      {/* ── Barre haute — DA CHAIR : blanc, noir, rien d'autre. L'or est
          l'accent du PREMIUM (pages d'abonnement), jamais du chrome. ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-neutral-100 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/business" className="flex items-center gap-2">
            <span className="text-[17px] font-black tracking-tight text-neutral-900">CHAIR</span>
            <span className="text-[9px] font-bold tracking-[0.14em] uppercase bg-neutral-900 text-white px-1.5 py-[3px] rounded-md">
              Business
            </span>
          </Link>

          {/* Desktop : les sections en ligne. */}
          <nav className="hidden md:flex items-center gap-1">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                  estActif(tab) ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {tab.label}
              </Link>
            ))}
            <Link
              href="/business/abonnement"
              className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-white bg-neutral-900 hover:bg-neutral-700 transition-colors"
            >
              <Sparkles size={12} /> Abonnement
            </Link>
          </nav>

          {/* Mobile : l'abonnement reste accessible en haut à droite. */}
          <Link
            href="/business/abonnement"
            className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold text-white bg-neutral-900"
          >
            <Sparkles size={11} /> Abonnement
          </Link>
        </div>
      </header>

      {/* ── Contenu ── */}
      <main className="flex-1 pb-24 md:pb-10">
        {children}
      </main>

      {/* ── Tabs mobile ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-neutral-100 pb-safe">
        <div className="grid grid-cols-5 h-16">
          {TABS.map((tab) => {
            const actif = estActif(tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  actif ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <tab.icon size={19} strokeWidth={actif ? 2.2 : 1.7} />
                <span className={`text-[10px] ${actif ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
