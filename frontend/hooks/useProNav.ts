import {
  Home, CalendarDays, Images, TrendingUp, User, Building2, Briefcase, QrCode,
  Users, Clock, Scissors, Crown, Gift, Sparkles, Armchair, Trophy,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  /** Correspond à une raison sélectionnée dans pro_goals (onboarding) — mis en avant dans la nav. */
  highlight?: boolean;
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
      { href: '/pro/classements',   label: 'Classement',      icon: Trophy },
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
      { href: '/pro/classements',       label: 'Classement',        icon: Trophy },
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
      { href: '/pro/equipe',      label: 'Équipe',      icon: Users },
      { href: '/pro/fauteuils',   label: 'Fauteuils',   icon: Armchair },
      { href: '/pro/recrutement', label: 'Recrutement', icon: Briefcase },
      { href: '/pro/compte',      label: 'Profil',      icon: User },
    ],
    secondary: [
      { href: '/pro/salon',          label: 'Salon',          icon: Building2 },
      { href: '/pro/salon/business', label: 'CHAIR Business', icon: Sparkles },
    ],
    homeHref: '/pro/salon-owner',
  };
}

// Item(s) de nav concerné(s) par chaque raison d'installation (onboarding
// "Pourquoi as-tu installé CHAIR PRO ?"). `find_clients` n'a pas d'item
// dédié : c'est déjà tout le produit (portfolio, réservations, classement...).
const GOAL_HREFS: Record<string, string[]> = {
  rent_chair: ['/pro/fauteuils-a-louer'],
  find_job: ['/pro/offres-emploi', '/pro/salon'],
};

/**
 * Fait remonter en tête de la liste "Outils" les items correspondant aux
 * raisons sélectionnées par le coiffeur à l'onboarding — mais seulement s'il
 * n'en a coché qu'une partie (1 ou 2 sur 3) : s'il a tout coché ou n'a rien
 * répondu, rien ne bouge (retour de Julien : "si il sélectionne les 3 bah
 * rien ne change"). Purement cosmétique, ne cache ni ne retire aucun item.
 */
function applyGoalHighlight(nav: ProNavConfig, proGoals: string[] | null | undefined): ProNavConfig {
  if (!proGoals || proGoals.length === 0 || proGoals.length >= 3) return nav;

  const highlightedHrefs = new Set(proGoals.flatMap((g) => GOAL_HREFS[g] ?? []));
  if (highlightedHrefs.size === 0) return nav;

  const secondary = nav.secondary
    .map((item) => ({ ...item, highlight: highlightedHrefs.has(item.href) }))
    .sort((a, b) => Number(b.highlight) - Number(a.highlight)); // tri stable : les mis en avant remontent, l'ordre relatif du reste ne change pas

  return { ...nav, secondary };
}

/**
 * Double identité gérant/coiffeur : un compte qui possède les deux capacités
 * (canManageSalon + hasHairdresserProfile) affiche la nav du mode ACTIF
 * (active_pro_mode), pas celle de son `role` d'inscription — sinon un gérant
 * qui bascule en Mode Coiffeur resterait coincé sur la nav Salon.
 */
export function useProNav(): ProNavConfig {
  const { user } = useAuth();
  const hasSalon = !!user?.hairdresser_profile?.salon_id;
  const isIndependent = user?.hairdresser_profile?.is_independent !== false;
  const effectiveMode = user?.active_pro_mode ?? user?.role;

  if (effectiveMode === 'salon_owner') return salonOwnerNav();
  const nav = isIndependent ? independantNav(hasSalon) : salarieNav(hasSalon);
  return applyGoalHighlight(nav, user?.hairdresser_profile?.pro_goals);
}
