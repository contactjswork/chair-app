'use client';

import Link from 'next/link';
import { Crown, ChevronRight } from 'lucide-react';
import { LEVEL_STYLES } from '@/lib/chairLevel';
import type { ApiChairLevel } from '@/lib/types';

export default function CareerProgressCard({ chairLevel }: { chairLevel: ApiChairLevel | null }) {
  if (!chairLevel) return null;
  const ls = LEVEL_STYLES[chairLevel.color] ?? LEVEL_STYLES.neutral;

  return (
    <Link href="/pro/badges" className="flex items-center gap-3 bg-white rounded-2xl border border-neutral-100 p-5 hover:border-neutral-200 transition-colors">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${ls.bg}`}>
        <Crown size={18} className={ls.text} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-400">CHAIR Global</p>
        <p className="text-base font-black text-neutral-900 leading-tight">{chairLevel.name}</p>
        {chairLevel.next ? (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${ls.bar}`} style={{ width: `${chairLevel.progress}%` }} />
            </div>
            <span className="text-[11px] font-bold text-neutral-500 flex-shrink-0">{chairLevel.progress}%</span>
          </div>
        ) : (
          <p className="text-xs font-semibold text-neutral-400 mt-1">Niveau maximum</p>
        )}
      </div>
      <ChevronRight size={16} className="text-neutral-300 flex-shrink-0" />
    </Link>
  );
}
