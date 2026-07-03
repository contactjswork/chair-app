'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SplashScreen from '@/components/ui/SplashScreen';

// Pages publiques : accessibles à tous y compris aux coiffeurs/gérants connectés
const PUBLIC_PREFIXES = [
  '/app/coiffeur/',
  '/app/salon/',
  '/app/realisation/',
  '/app/avis/',
  '/app/scan/',
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (isLoading || isPublic) return;
    if (user && (user.role === 'hairdresser' || user.role === 'salon_owner')) {
      router.replace('/pro');
    }
  }, [user, isLoading, router, isPublic]);

  if (!isPublic) {
    if (isLoading) return null;
    if (user && (user.role === 'hairdresser' || user.role === 'salon_owner')) return null;
  }

  return (
    <>
      <SplashScreen />
      {children}
    </>
  );
}
