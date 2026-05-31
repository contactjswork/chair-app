'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/auth';

export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/connexion');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace('/compte');
    }
  }, [user, isLoading, allowedRoles, router]);

  return { user, isLoading };
}
