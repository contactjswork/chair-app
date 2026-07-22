import {
  Home, CalendarDays, Images, TrendingUp, User, Building2, Briefcase, QrCode,
  Users, Clock, Scissors, Crown, Gift, Sparkles, Armchair,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

interface ProNavConfig {
  /** Les 4-5 items les plus utilisés — bottom nav mobile ET haut de sidebar desktop. */
  primary: NavItem[];
  /** Le reste des pages pertinentes pour ce rôle — desktop uniquement ("Outils"). */
  secondary: NavItem[];
  homeHref: string;
}

// Chaque rôle a une nav primaire et une nav secondaire ("Outils"). Rien n'est
// caché derrière un clic de plus que nécessaire : tout ce qu'un rôle peut
// réellement utiliser (vérifié page par page contre les vraies redirections
// de rôle dans le code) est atteignable depuis l'une des deux listes.

function salarieNav(hasSalon: boolean): ProNavConfig {
  return {
    primary: [
      { href: '/pro',           label: 'Accueil',   icon: Home },
      { href: '/pro/portfolio', label: 'Portfolio', icon: Images },
      { href: '/pro/mon-qr',    label: 'Mon QR',    icon: QrCode },
      { href: '/pro/profil',    label: 'Profil',    icon: User },
    ],
    secondary: [
      { href: '/pro/services',      label: 'Mes expertises',  icon: Scissors },
      { href: '/pro/business',      label: 'Performance',     icon: TrendingUp },
      { href: '/pro/badges',        label: 'Badges',          icon: Crown },
      { href: '/pro/parrainage',    label: 'Parrainage',      icon: Gift },
      { href: '/pro/chair-plus',    label: 'CHAIR+',          icon: Sparkles },
      { href: '/pro/offres-emploi', label: "Offres d'emploi", icon: Briefcase },
      ...(hasSalon ? [] : [
        { href: '/pro/salon', label: 'Rejoindre un salon', icon: Building2 },
      ]),
    ],
    homeHref: '/pro',
  };
}

function independantNav(hasSalon: boolean): ProNavConfig {
  return {
    primary: [
      { href: '/pro',           label: 'Accueil',     icon: Home },
      { href: '/pro/agenda',    label: 'Agenda',      icon: CalendarDays },
      { href: '/pro/portfolio', label: 'Portfolio',   icon: Images },
      { href: '/pro/business',  label: 'Performance', icon: TrendingUp },
      { href: '/pro/profil',    label: 'Profil',      icon: User },
    ],
    secondary: [
      { href: '/pro/reservations',      label: 'Réservations',      icon: Clock },
      { href: '/pro/services',          label: 'Services',          icon: Scissors },
      { href: '/pro/badges',            label: 'Badges',            icon: Crown },
      { href: '/pro/parrainage',        label: 'Parrainage',        icon: Gift },
      { href: '/pro/chair-plus',        label: 'CHAIR+',            icon: Sparkles },
      { href: '/pro/fauteuils-a-louer', label: 'Louer un fauteuil', icon: Armchair },
      { href: '/pro/offres-emploi',     label: "Offres d'emploi",   icon: Briefcase },
      ...(hasSalon ? [] : [
        { href: '/pro/salon', label: 'Rejoindre un salon', icon: Building2 },
      ]),
    ],
    homeHref: '/pro',
  };
}

function salonOwnerNav(): ProNavConfig {
  return {
    primary: [
      { href: '/pro/salon-owner', label: 'Accueil',     icon: Home },
      { href: '/pro/salon',       label: 'Salon',       icon: Building2 },
      { href: '/pro/equipe',      label: 'Équipe',      icon: Users },
      { href: '/pro/recrutement', label: 'Recrutement', icon: Briefcase },
      { href: '/pro/profil',      label: 'Profil',      icon: User },
    ],
    secondary: [
      { href: '/pro/fauteuils', label: 'Fauteuils', icon: Armchair },
    ],
    homeHref: '/pro/salon-owner',
  };
}

export function useProNav(): ProNavConfig {
  const { user } = useAuth();
  const hasSalon = !!user?.hairdresser_profile?.salon_id;
  const isIndependent = user?.hairdresser_profile?.is_independent !== false;

  if (user?.role === 'salon_owner') return salonOwnerNav();
  return isIndependent ? independantNav(hasSalon) : salarieNav(hasSalon);
}
