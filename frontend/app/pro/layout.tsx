'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProTopBar from '@/components/layout/ProTopBar';
import ProNav from '@/components/layout/ProNav';
import ProSidebar from '@/components/layout/ProSidebar';
import SplashScreen from '@/components/ui/SplashScreen';

const PUBLIC_PRO_ROUTES = ['/pro/connexion', '/pro/inscription'];

export default function ProLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_PRO_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (isLoading || isPublic) return;
    if (!user) {
      router.replace('/pro/connexion');
      return;
    }
    if (user.role === 'client') {
      router.replace('/app');
    }
  }, [user, isLoading, router, isPublic, pathname]);

  if (isPublic) return <>{children}</>;
  if (isLoading) return <SplashScreen pro />;
  if (!user || user.role === 'client') return null;

  return (
    <>
      <SplashScreen pro />
      <ProTopBar />
      <ProSidebar />
      <div className="md:pt-0 md:ml-60 pt-content-mobile-pro pb-24 md:pb-0">
        {children}
      </div>
      <ProNav />
    </>
  );
}
