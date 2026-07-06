'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Scissors,
  CalendarCheck,
  Star,
  Flag,
  CreditCard,
  BarChart2,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

interface AdminUser {
  id: number;
  name: string;
  email: string;
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { href: '/admin/coiffeurs', label: 'Coiffeurs', icon: Scissors },
  { href: '/admin/reservations', label: 'Réservations', icon: CalendarCheck },
  { href: '/admin/avis', label: 'Avis', icon: Star },
  { href: '/admin/signalements', label: 'Signalements', icon: Flag },
  { href: '/admin/abonnements', label: 'Abonnements', icon: CreditCard },
  { href: '/admin/statistiques', label: 'Statistiques', icon: BarChart2 },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('chair_admin_token') : null;

  const logout = useCallback(async () => {
    localStorage.removeItem('chair_admin_token');
    await fetch('/api/admin-auth', { method: 'DELETE' });
    router.push('/admin/connexion');
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/admin/connexion');
      return;
    }
    fetch(`${API_URL}/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setUser(data.user ?? data);
        setLoading(false);
      })
      .catch(() => {
        router.push('/admin/connexion');
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
          <span className="text-[13px] text-neutral-400">Vérification…</span>
        </div>
      </div>
    );
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const NavContent = () => (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <span className="text-[20px] font-bold tracking-tight text-neutral-900">CHAIR</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
            Admin
          </span>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-[13.5px] font-medium transition-all ${
              isActive(href)
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </div>

      {/* User info */}
      {user && (
        <div className="border-t border-neutral-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
              {user.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-neutral-900 truncate">{user.name}</p>
              <p className="text-[11px] text-neutral-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="text-neutral-400 hover:text-red-500 transition-colors"
              title="Déconnexion"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] bg-white border-r border-neutral-100 fixed top-0 left-0 h-full z-40">
        <NavContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-[240px] bg-white z-50 md:hidden transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={20} />
        </button>
        <NavContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-[240px] flex flex-col min-h-screen pb-16 md:pb-0">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 bg-white border-b border-neutral-100 px-4 py-3 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-neutral-600">
            <Menu size={20} />
          </button>
          <span className="text-[15px] font-bold text-neutral-900">CHAIR Admin</span>
        </div>

        <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 z-30 md:hidden">
        <div className="flex items-center justify-around px-2 py-1">
          {NAV_ITEMS.slice(0, 5).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${
                isActive(href) ? 'text-neutral-900' : 'text-neutral-400'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-medium truncate max-w-[40px] text-center">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
