import Link from 'next/link';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import ReviewPromptTrigger from '@/components/ui/ReviewPromptTrigger';
import GeoPermissionModal from '@/components/ui/GeoPermissionModal';
import { PushBootstrap } from '@/components/ui/PushOptInCard';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/contact';

interface Props {
  children: React.ReactNode;
  noPaddingTop?: boolean;
}

function Footer() {
  return (
    // web-only : footer de site — jamais affiché dans un binaire natif
    // (masqué par globals.css via html.chair-native), déjà invisible sous 768px.
    <footer className="web-only hidden md:block border-t border-neutral-100 mt-16 py-6 px-8">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <span className="text-[13px] font-bold tracking-[0.12em] uppercase text-neutral-900">CHAIR</span>
        <div className="flex items-center gap-6 text-[11px] text-neutral-400">
          <Link href="/cgu" className="hover:text-neutral-700 transition-colors">CGU</Link>
          <Link href="/confidentialite" className="hover:text-neutral-700 transition-colors">Confidentialité</Link>
          <Link href="/mentions-legales" className="hover:text-neutral-700 transition-colors">Mentions légales</Link>
          <Link href="/app/regles-communaute" className="hover:text-neutral-700 transition-colors">Règles de communauté</Link>
          <a href={SUPPORT_MAILTO} className="hover:text-neutral-700 transition-colors">{SUPPORT_EMAIL}</a>
          <span>© 2026 CHAIR</span>
        </div>
      </div>
    </footer>
  );
}

export default function AppShell({ children, noPaddingTop = false }: Props) {
  return (
    <>
      <TopNav />
      <main className={`min-h-screen pb-24 md:pb-0 ${noPaddingTop ? '' : 'pt-content-mobile md:pt-[60px]'}`}>
        {children}
        <Footer />
      </main>
      <BottomNav />
      <ReviewPromptTrigger />
      <GeoPermissionModal />
      {/* Listeners push (toast premier plan, deep link au tap) + resync token.
          No-op sur le web et les binaires sans le plugin — voir lib/push.ts. */}
      <PushBootstrap />
    </>
  );
}
