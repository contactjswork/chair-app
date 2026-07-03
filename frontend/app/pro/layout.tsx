'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProTopBar from '@/components/layout/ProTopBar';

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
  if (isLoading) return null;
  if (!user || user.role === 'client') return null;

  return (
    <>
      <ProTopBar />
      <div className="md:pt-0 pt-14">
        {children}
      </div>
    </>
  );
}
