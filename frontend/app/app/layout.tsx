'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SplashScreen from '@/components/ui/SplashScreen';

const PUBLIC_PREFIXES = [
  '/app/coiffeur/',
  '/app/salon/',
  '/app/realisation/',
  '/app/avis/',
  '/app/scan/',
  '/app/classements',
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

  // Splash toujours rendu en premier, avant tout check d'auth
  if (!isPublic) {
    if (isLoading) return <SplashScreen />;
    if (user && (user.role === 'hairdresser' || user.role === 'salon_owner')) return null;
  }

  return (
    <>
      <SplashScreen />
      {children}
    </>
  );
}
