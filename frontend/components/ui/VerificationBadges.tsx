import { ShieldCheck, BadgeCheck, GraduationCap, Zap } from 'lucide-react';
import type { ApiHairdresserProfile, ApiChairBadge } from '@/lib/types';

interface Props {
  profile: Pick<ApiHairdresserProfile, 'is_verified' | 'identity_verified' | 'pro_active_badge' | 'chair_badges'>;
  size?: 'sm' | 'md';
  maxItems?: number;
}

type VerifBadge = {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
};

function getBadges(profile: Props['profile']): VerifBadge[] {
  const badges: VerifBadge[] = [];

  if (profile.is_verified) {
    badges.push({ key: 'chair', label: 'Certifié CHAIR', icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' });
  }
  if (profile.identity_verified) {
    badges.push({ key: 'identity', label: 'Identité vérifiée', icon: BadgeCheck, color: 'text-green-600', bg: 'bg-green-50 border-green-200' });
  }
  const hasSiretBadge = profile.chair_badges?.some((b: ApiChairBadge) => b.code === 'siret_verified');
  if (hasSiretBadge) {
    badges.push({ key: 'siret', label: 'SIRET vérifié', icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' });
  }
  const hasFormation = profile.chair_badges?.some((b: ApiChairBadge) => b.code === 'formation_badge');
  if (hasFormation) {
    badges.push({ key: 'formation', label: 'Formation certifiée', icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' });
  }
  if (profile.pro_active_badge) {
    badges.push({ key: 'active', label: 'Professionnel actif', icon: Zap, color: 'text-neutral-600', bg: 'bg-neutral-100 border-neutral-200' });
  }

  return badges;
}

export default function VerificationBadges({ profile, size = 'md', maxItems = 4 }: Props) {
  const badges = getBadges(profile).slice(0, maxItems);
  if (badges.length === 0) return null;

  const iconSize = size === 'sm' ? 11 : 13;
  const textClass = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  const padClass = size === 'sm' ? 'px-1.5 py-0.5 gap-0.5' : 'px-2 py-1 gap-1';

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <span
          key={b.key}
          className={`inline-flex items-center border rounded-full font-medium ${padClass} ${textClass} ${b.color} ${b.bg}`}
        >
          <b.icon size={iconSize} />
          <span className="ml-0.5">{b.label}</span>
        </span>
      ))}
    </div>
  );
}

// Variante icône uniquement pour les cartes compactes (feed, search)
export function VerificationIcons({ profile }: { profile: Props['profile'] }) {
  const badges = getBadges(profile);
  if (badges.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {badges.slice(0, 3).map((b) => (
        <b.icon key={b.key} size={12} className={b.color} title={b.label} />
      ))}
    </div>
  );
}
