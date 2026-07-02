import Link from 'next/link';
import ChairLogo from '@/components/ui/ChairLogo';

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://instagram.com',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.79a8.18 8.18 0 0 0 4.78 1.52V6.85a4.85 4.85 0 0 1-1.01-.16Z" />
      </svg>
    ),
  },
];

const COL1 = [
  { href: '/#clients',    label: 'Pour les clients' },
  { href: '/#coiffeurs',  label: 'Pour les coiffeurs' },
  { href: '/app',         label: 'Télécharger CHAIR' },
  { href: '/pro/inscription', label: 'CHAIR PRO' },
];

const COL2 = [
  { href: '/connexion',      label: 'Se connecter' },
  { href: '/inscription',    label: 'Créer un compte' },
  { href: '/contact',        label: 'Contact' },
];

export default function LandingFooter() {
  return (
    <footer className="bg-neutral-950 text-white">
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-14">

          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-5">
              <ChairLogo href="/" size="md" dark />
            </div>
            <p className="text-neutral-500 text-[14px] leading-relaxed max-w-xs mb-6">
              La plateforme qui connecte les meilleurs coiffeurs à leurs futurs clients.
              Portfolios réels, avis certifiés, réservation directe.
            </p>
            <div className="flex items-center gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-white/8 hover:bg-white/15 text-neutral-400 hover:text-white transition-all flex items-center justify-center"
                  aria-label={s.label}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Plateforme */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600 mb-5">Plateforme</p>
            <ul className="space-y-3">
              {COL1.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-neutral-500 hover:text-white text-[14px] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Liens */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600 mb-5">Liens</p>
            <ul className="space-y-3">
              {COL2.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-neutral-500 hover:text-white text-[14px] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/8 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-neutral-600 text-[13px]">
            © 2026 CHAIR. Tous droits réservés.
          </p>
          <div className="flex items-center gap-5 text-[13px] text-neutral-600">
            <Link href="/confidentialite" className="hover:text-neutral-400 transition-colors">Confidentialité</Link>
            <Link href="/cgu" className="hover:text-neutral-400 transition-colors">CGU</Link>
            <span>contact@getchair.app</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
