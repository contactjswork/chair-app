'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { X, Menu } from 'lucide-react';
import ChairLogo from '@/components/ui/ChairLogo';

const LINKS = [
  { href: '/#fonctionnalites', label: 'Fonctionnalités' },
  { href: '/#clients',         label: 'Pour les clients' },
  { href: '/#coiffeurs',       label: 'Pour les coiffeurs' },
  { href: '/contact',          label: 'Contact' },
];

export default function LandingNav({ dark = false }: { dark?: boolean }) {
  const pathname  = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open,     setOpen]     = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-neutral-100'
          : dark
            ? 'bg-transparent'
            : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <ChairLogo href="/" size="md" dark={!scrolled && dark} />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-[13px] font-medium transition-colors ${!scrolled && dark ? 'text-white/50 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/pro/inscription"
              className={`text-[13px] font-medium transition-colors px-4 py-2 ${!scrolled && dark ? 'text-white/50 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              CHAIR PRO
            </Link>
            <Link
              href="/app"
              className={`text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-colors ${!scrolled && dark ? 'bg-white text-neutral-900 hover:bg-neutral-100' : 'bg-neutral-900 text-white hover:bg-neutral-700'}`}
            >
              Télécharger CHAIR
            </Link>
          </div>

          {/* Burger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label={open ? 'Fermer' : 'Menu'}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {open && (
        <div className="fixed inset-0 z-40 bg-white flex flex-col pt-16">
          <nav className="flex flex-col px-6 pt-8 gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-4 py-3.5 text-[16px] font-medium text-neutral-700 hover:text-neutral-900 border-b border-neutral-100 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-3 px-6 pt-8">
            <Link
              href="/app"
              onClick={() => setOpen(false)}
              className="w-full text-center text-[15px] font-semibold bg-neutral-900 text-white py-4 rounded-2xl hover:bg-neutral-700 transition-colors"
            >
              Télécharger CHAIR
            </Link>
            <Link
              href="/pro/inscription"
              onClick={() => setOpen(false)}
              className="w-full text-center text-[15px] font-medium text-neutral-700 py-4 rounded-2xl border border-neutral-200 hover:border-neutral-400 transition-colors"
            >
              Rejoindre CHAIR PRO
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
