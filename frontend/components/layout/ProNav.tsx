'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { useProNav, type NavItem } from '@/hooks/useProNav';

// Les items "secondary" (Outils) de useProNav ne s'affichent que dans la
// sidebar desktop (ProSidebar) — sans cet onglet "Plus", Louer un fauteuil,
// Offres d'emploi, Badges, Classement, etc. ne sont jamais atteignables
// sur mobile, qui est la plateforme principale de cette app.
const PLUS_ITEM: NavItem = { href: '/pro/plus', label: 'Plus', icon: MoreHorizontal };

export default function ProNav() {
  const pathname = usePathname();
  const { primary, homeHref } = useProNav();
  const items = [...primary, PLUS_ITEM];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-neutral-100 pb-safe-nav">
      <div className="flex items-stretch h-[66px]">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === homeHref
            ? (pathname === homeHref || pathname === '/pro')
            : pathname.startsWith(href);

          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 pt-1 transition-colors relative ${
                active ? 'text-neutral-900' : 'text-neutral-400'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-neutral-900 rounded-full" />
              )}
              <Icon size={20} strokeWidth={active ? 2 : 1.5} />
              <span className={`text-[10px] font-medium leading-none ${active ? 'text-neutral-900' : 'text-neutral-400'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
