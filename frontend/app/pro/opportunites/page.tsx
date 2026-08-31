'use client';

import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { CARTE_TAP } from '@/lib/proStyle';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { Armchair, Briefcase, Building2, ChevronRight } from 'lucide-react';

/**
 * Le hub des opportunités professionnelles.
 *
 * Fauteuils à louer, offres d'emploi, rejoindre un salon : trois entrées de
 * menu pour un même sujet — la carrière — qui n'est pas le geste quotidien.
 * Regroupées ici, le menu Plus retrouve sa respiration et le sujet gagne un
 * vrai point d'entrée au lieu de trois portes dispersées.
 */
export default function ProOpportunitesPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const dejaEnSalon = !!user.hairdresser_profile?.salon;

  const portes = [
    {
      href: '/pro/fauteuils-a-louer',
      icon: Armchair,
      titre: 'Louer un fauteuil',
      detail: 'Des places en salon, à la journée ou au mois, près de chez vous.',
    },
    {
      href: '/pro/offres-emploi',
      icon: Briefcase,
      titre: "Offres d'emploi",
      detail: 'Les salons qui recrutent, avec le contrat et la ville.',
    },
    ...(!dejaEnSalon
      ? [{
          href: '/pro/salon',
          icon: Building2,
          titre: 'Rejoindre un salon',
          detail: 'Rattachez votre profil à une équipe déjà sur CHAIR.',
        }]
      : []),
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-2 md:pt-10 pb-12">
      <DashboardPageHeader title="Opportunités" backHref="/pro/plus" />

      <div className="mt-4 space-y-3">
        {portes.map(({ href, icon: Icon, titre, detail }) => (
          <Link key={href} href={href} className={`flex items-center gap-4 ${CARTE_TAP} p-5`}>
            <span className="w-11 h-11 rounded-2xl bg-neutral-100 flex items-center justify-center shrink-0">
              <Icon size={19} className="text-neutral-600" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-bold text-neutral-900">{titre}</span>
              <span className="block text-[13px] text-neutral-500 leading-snug mt-0.5">{detail}</span>
            </span>
            <ChevronRight size={16} className="text-neutral-300 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
