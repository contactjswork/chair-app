import Link from 'next/link';
import ChairLogo from '@/components/ui/ChairLogo';
import { SUPPORT_EMAIL, SUPPORT_MAILTO, SOCIAL_LINKS } from '@/lib/contact';

// Les icônes réseaux sociaux pointaient vers https://instagram.com et
// https://tiktok.com — les pages d'accueil de ces services, pas des comptes
// CHAIR. Elles ne sont désormais rendues que si un compte réel est renseigné
// dans lib/contact.ts (SOCIAL_LINKS).
const SOCIALS = [
  SOCIAL_LINKS.instagram && {
    label: 'Instagram',
    href: SOCIAL_LINKS.instagram.url,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  SOCIAL_LINKS.tiktok && {
    label: 'TikTok',
    href: SOCIAL_LINKS.tiktok.url,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.79a8.18 8.18 0 0 0 4.78 1.52V6.85a4.85 4.85 0 0 1-1.01-.16Z" />
      </svg>
    ),
  },
].filter((s): s is { label: string; href: string; icon: React.ReactElement } => !!s);

const COL1 = [
  { href: '/app/recherche',    label: 'Rechercher un coiffeur' },
  { href: '/app/classements',  label: 'Classements' },
  { href: '/app/favoris',      label: 'Mes favoris' },
  { href: '/download',         label: 'Télécharger CHAIR' },
];

const COL2 = [
  { href: '/pro/inscription',          label: 'Découvrir CHAIR PRO' },
  { href: '/pro/connexion',            label: 'Connexion CHAIR PRO' },
  { href: '/connexion',                label: 'Connexion' },
  { href: '/inscription',              label: 'Créer un compte' },
  { href: '/contact',                  label: 'Contact' },
  { href: '/app/compte/supprimer',     label: 'Supprimer mon compte' },
];

export default function LandingFooter() {
  return (
    // web-only : footer de la vitrine marketing (Télécharger CHAIR, Découvrir
    // CHAIR PRO, réseaux sociaux) — jamais affiché dans un binaire natif
    // (masqué par globals.css via html.chair-native, posé avant le premier
    // paint par lib/native.ts). Un reviewer qui atteint / ou /contact depuis
    // l'app ne doit pas tomber sur un pied de page de site web.
    <footer className="web-only bg-neutral-950 text-white">
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-14">

          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-5">
              <ChairLogo href="/" size="md" dark />
            </div>
            <p className="text-neutral-500 text-[14px] leading-relaxed max-w-xs mb-6">
              La plateforme qui connecte les meilleurs coiffeurs à leurs futurs clients.
              Portfolios réels, avis vérifiés, réservation directe.
            </p>
            <div className={`flex items-center gap-2 ${SOCIALS.length === 0 ? 'hidden' : ''}`}>
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

          {/* CHAIR client */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600 mb-5">CHAIR</p>
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

          {/* Pro & compte */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600 mb-5">Pro &amp; compte</p>
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
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-neutral-600">
            <Link href="/confidentialite" className="hover:text-neutral-400 transition-colors">Confidentialité</Link>
            <Link href="/cgu" className="hover:text-neutral-400 transition-colors">CGU</Link>
            <Link href="/mentions-legales" className="hover:text-neutral-400 transition-colors">Mentions légales</Link>
            <Link href="/app/regles-communaute" className="hover:text-neutral-400 transition-colors">Règles de communauté</Link>
            <a href={SUPPORT_MAILTO} className="hover:text-neutral-400 transition-colors">{SUPPORT_EMAIL}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
