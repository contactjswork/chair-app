'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, User, ImageIcon, Calendar, BarChart2, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const tabs = [
  { href: '/dashboard',                   label: 'Accueil',  icon: LayoutDashboard },
  { href: '/dashboard/profil',            label: 'Profil',   icon: User },
  { href: '/dashboard/realisations',      label: 'Portfolio',icon: ImageIcon },
  { href: '/dashboard/reservations',      label: 'RDV',      icon: Calendar },
  { href: '/dashboard/statistiques',      label: 'Stats',    icon: BarChart2 },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const profileSlug = user?.hairdresser_profile?.slug;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-neutral-100 pb-safe">
      <div className="flex items-stretch h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                active ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[9px] font-medium">{label}</span>
              {active && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-neutral-900" />
              )}
            </Link>
          );
        })}

        {profileSlug && (
          <Link
            href={`/coiffeur/${profileSlug}`}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <Eye size={20} strokeWidth={1.5} />
            <span className="text-[9px] font-medium">Aperçu</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
