'use client';

import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import type { ScoreItem } from '@/lib/profileScore';

export default function ProfileCompletionCard({ score, missingItems, isIndependent }: { score: number; missingItems: ScoreItem[]; isIndependent: boolean }) {
  const preview = missingItems.slice(0, 3).map((i) => i.short);

  return (
    <Link href="/pro/profil" className="block bg-white rounded-2xl border border-neutral-100 p-5 hover:border-neutral-200 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-bold text-neutral-900">Profil complété</p>
        <div className="flex items-center gap-1.5">
          <span className={`text-lg font-bold ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-neutral-500'}`}>
            {score}<span className="text-neutral-300 font-normal text-sm">%</span>
          </span>
          <ChevronRight size={14} className="text-neutral-300" />
        </div>
      </div>
      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-700 ${score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-400' : 'bg-neutral-400'}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {preview.length > 0 ? (
        <p className="text-xs text-neutral-500">
          Il manque : <span className="text-neutral-700 font-medium">{preview.join(', ')}</span>
          {missingItems.length > preview.length && <span className="text-neutral-400"> +{missingItems.length - preview.length} autre{missingItems.length - preview.length > 1 ? 's' : ''}</span>}
        </p>
      ) : (
        <div className="flex items-center gap-2 text-xs font-semibold text-green-600">
          <Check size={13} />
          {isIndependent ? 'Profil prêt pour les réservations' : 'Profil complet'}
        </div>
      )}
    </Link>
  );
}
