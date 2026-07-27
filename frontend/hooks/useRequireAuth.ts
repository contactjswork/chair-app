'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser, UserRole } from '@/lib/auth';
import { redirectPathForRole } from '@/lib/auth';

/**
 * Double identité gérant/coiffeur : un compte dont le `role` d'inscription
 * est 'salon_owner' peut avoir aussi activé un profil coiffeur (voir
 * AuthController::enableHairdresserMode()) — il doit alors pouvoir accéder
 * aux pages réservées aux coiffeurs (portfolio, agenda...) sans jamais y être
 * bloqué, et réciproquement. Le `role` seul ne suffit plus à décider l'accès.
 */
function hasAccess(user: AuthUser, allowedRoles: UserRole[]): boolean {
  if (allowedRoles.includes(user.role)) return true;
  if (allowedRoles.includes('hairdresser') && (user.has_hairdresser_profile || !!user.hairdresser_profile)) return true;
  if (allowedRoles.includes('salon_owner') && (user.can_manage_salon || !!user.salon)) return true;
  return false;
}

export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/connexion');
      return;
    }
    if (allowedRoles && !hasAccess(user, allowedRoles)) {
      router.replace(redirectPathForRole(user.role));
    }
  }, [user, isLoading, allowedRoles, router]);

  return { user, isLoading };
}
