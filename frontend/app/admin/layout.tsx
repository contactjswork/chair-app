'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Search,
  Users,
  Scissors,
  Building2,
  ShieldAlert,
  Award,
  Tags,
  SlidersHorizontal,
  BarChart2,
  BellRing,
  ScrollText,
  UserCog,
  Wrench,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import {
  adminApi,
  API_URL,
  apiEnvironment,
  clearAdminSession,
  getAdminToken,
  getStoredAdminUser,
  hasPermission,
  setAdminSession,
  PERMISSIONS,
  type AdminSessionUser,
} from '@/lib/adminApi';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
}

interface NavContentProps {
  user: AdminSessionUser;
  env: 'LOCAL' | 'PRODUCTION';
  visibleNav: NavItem[];
  pathname: string;
  onNavigate: () => void;
  onLogout: () => void;
}

/** Contenu de la sidebar — composant top-level (pas déclaré dans AdminLayout)
 * pour ne pas être recréé à chaque render, condition requise par la règle
 * react-hooks/static-components. */
function NavContent({ user, env, visibleNav, pathname, onNavigate, onLogout }: NavContentProps) {
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <nav className="flex flex-col h-full">
      {/* Logo + badge environnement */}
      <div className="px-5 py-5 border-b border-neutral-100 dark:border-neutral-800 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[19px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">CHAIR</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-500 px-2 py-0.5 rounded-full">
            Control Center
          </span>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest w-fit ${
            env === 'PRODUCTION'
              ? 'bg-red-500 text-white shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
              : 'bg-emerald-500 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
          }`}
          title={`API : ${API_URL}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full bg-white ${env === 'PRODUCTION' ? 'animate-pulse' : ''}`} />
          {env}
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        {visibleNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-[13.5px] font-medium transition-all ${
              isActive(href)
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50'
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </div>

      {/* User info */}
      <div className="border-t border-neutral-100 dark:border-neutral-800 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-[12px] font-bold flex-shrink-0">
            {user.name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-50 truncate">{user.name}</p>
            <p className="text-[11px] text-neutral-400 truncate">{user.admin_role_name ?? user.email}</p>
          </div>
          <button onClick={onLogout} className="text-neutral-400 hover:text-red-500 transition-colors" title="Déconnexion">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </nav>
  );
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_VIEW },
  { href: '/admin/recherche', label: 'Recherche', icon: Search, permission: PERMISSIONS.USERS_READ },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users, permission: PERMISSIONS.USERS_READ },
  { href: '/admin/coiffeurs', label: 'Professionnels', icon: Scissors, permission: PERMISSIONS.HAIRDRESSERS_READ },
  { href: '/admin/salons', label: 'Salons', icon: Building2, permission: PERMISSIONS.SALONS_READ },
  { href: '/admin/moderation', label: 'Modération', icon: ShieldAlert, permission: PERMISSIONS.CONTENT_MODERATE },
  { href: '/admin/badges', label: 'Badges', icon: Award, permission: PERMISSIONS.BADGES_MANAGE },
  { href: '/admin/specialites', label: 'Spécialités', icon: Tags, permission: PERMISSIONS.SPECIALTIES_MANAGE },
  { href: '/admin/configuration', label: 'Configuration', icon: SlidersHorizontal, permission: PERMISSIONS.SETTINGS_UPDATE },
  { href: '/admin/statistiques', label: 'Analytics', icon: BarChart2, permission: PERMISSIONS.ANALYTICS_READ },
  { href: '/admin/notifications', label: 'Notifications push', icon: BellRing, permission: PERMISSIONS.NOTIFICATIONS_SEND },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, permission: PERMISSIONS.AUDIT_LOGS_READ },
  // Purge des données de démonstration — même permission que la suppression
  // de comptes (users.delete), c'est une suppression de comptes en masse.
  { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench, permission: PERMISSIONS.USERS_DELETE },
  { href: '/admin/admins', label: 'Admins', icon: UserCog, permission: PERMISSIONS.ADMINS_MANAGE },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const env = apiEnvironment();

  const logout = useCallback(async () => {
    const token = getAdminToken();
    if (token) {
      // Révoque le jeton Sanctum côté serveur — sans ça, un jeton copié
      // resterait valable même après "déconnexion" côté client.
      await adminApi.post('/admin/auth/logout').catch(() => {});
    }
    // Retire aussi le cookie httpOnly marqueur lu par proxy.ts, sinon le
    // shell /admin resterait accessible (mais tous les appels API
    // échoueraient en 401, le jeton Sanctum étant révoqué).
    await fetch('/api/admin-auth', { method: 'DELETE' }).catch(() => {});
    clearAdminSession();
    router.push('/admin/connexion');
  }, [router]);

  useEffect(() => {
    if (pathname === '/admin/connexion') {
      // Pas un vrai chargement de données — juste éviter le spinner sur
      // l'écran de connexion lui-même, dont le rendu est déjà court-circuité
      // juste après (return <>{children}</>).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    const token = getAdminToken();
    if (!token) {
      router.replace('/admin/connexion');
      return;
    }

    // Affiche immédiatement l'identité déjà connue (évite un flash vide),
    // puis la reconfirme auprès de Laravel (vraie garde de sécurité) pour
    // détecter un jeton expiré/révoqué proprement plutôt que de laisser
    // chaque page échouer silencieusement en 401.
    setUser(getStoredAdminUser());

    fetch(`${API_URL}/admin/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error('unauthorized');
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setAdminSession(token, data.user);
        setLoading(false);
      })
      .catch(() => {
        clearAdminSession();
        router.replace('/admin/connexion');
      });
  }, [pathname, router]);

  if (pathname === '/admin/connexion') {
    return <>{children}</>;
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] dark:bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-neutral-200 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white rounded-full animate-spin" />
          <span className="text-[13px] text-neutral-400">Vérification…</span>
        </div>
      </div>
    );
  }

  const visibleNav = NAV_ITEMS.filter((item) => !item.permission || hasPermission(user, item.permission));

  return (
    <div className="min-h-screen bg-[#f7f7f8] dark:bg-neutral-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[248px] bg-white dark:bg-neutral-900 border-r border-neutral-100 dark:border-neutral-800 fixed top-0 left-0 h-full z-40">
        <NavContent user={user} env={env} visibleNav={visibleNav} pathname={pathname} onNavigate={() => setSidebarOpen(false)} onLogout={logout} />
      </aside>

      {/* Mobile/tablet sidebar overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside
        className={`fixed top-0 left-0 h-full w-[260px] bg-white dark:bg-neutral-900 z-50 lg:hidden transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700" onClick={() => setSidebarOpen(false)}>
          <X size={20} />
        </button>
        <NavContent user={user} env={env} visibleNav={visibleNav} pathname={pathname} onNavigate={() => setSidebarOpen(false)} onLogout={logout} />
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-[248px] flex flex-col min-h-screen">
        {/* Mobile/tablet topbar */}
        <div className="lg:hidden flex items-center gap-3 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 px-4 py-3 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-neutral-600 dark:text-neutral-300">
            <Menu size={20} />
          </button>
          <span className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">CHAIR Admin</span>
          <span
            className={`ml-auto text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full text-white ${
              env === 'PRODUCTION' ? 'bg-red-500' : 'bg-emerald-500'
            }`}
          >
            {env}
          </span>
        </div>

        <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
