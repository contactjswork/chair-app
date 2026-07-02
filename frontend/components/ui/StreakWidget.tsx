'use client';

import { useState, useEffect } from 'react';
import { streak as streakApi } from '@/lib/api';
import type { ApiStreak } from '@/lib/types';
import { Flame, Zap, Trophy } from 'lucide-react';

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

function nextMilestone(current: number): number {
  return STREAK_MILESTONES.find((m) => m > current) ?? 100;
}

interface Props {
  compact?: boolean;
}

export default function StreakWidget({ compact = false }: Props) {
  const [data, setData] = useState<ApiStreak | null>(null);

  useEffect(() => {
    streakApi.get()
      .then((d) => setData(d as ApiStreak))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const current = data.current_streak;
  const longest = data.longest_streak;
  const isActive = data.is_active_today;
  const next = nextMilestone(current);
  const progress = Math.min(100, Math.round((current / next) * 100));

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${
        isActive ? 'bg-orange-50 border-orange-200' : 'bg-neutral-50 border-neutral-200'
      }`}>
        <Flame size={13} className={isActive ? 'text-orange-500' : 'text-neutral-300'} />
        <span className={`text-[12px] font-bold ${isActive ? 'text-orange-600' : 'text-neutral-400'}`}>
          {current}j
        </span>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isActive ? 'bg-orange-500' : 'bg-white/10'
          }`}>
            <Flame size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40">Streak</p>
            <p className="text-[15px] font-bold text-white leading-tight">
              {current > 0 ? `${current} jour${current > 1 ? 's' : ''}` : 'Démarrez votre streak'}
            </p>
          </div>
        </div>
        {longest > 0 && (
          <div className="text-right">
            <p className="text-[10px] text-white/30 mb-0.5">Record</p>
            <p className="text-[13px] font-bold text-white/60">{longest}j</p>
          </div>
        )}
      </div>

      {/* Barre de progression vers le prochain palier */}
      {current > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-white/30 mb-1">
            <span>{current}j</span>
            <span>Palier : {next}j</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
        <div className="text-center">
          <p className="text-[16px] font-bold text-white">{current}</p>
          <p className="text-[9px] text-white/30 uppercase tracking-wider">Jours</p>
        </div>
        <div className="text-center border-x border-white/10">
          <p className="text-[16px] font-bold text-white">{data.weekly_streak}</p>
          <p className="text-[9px] text-white/30 uppercase tracking-wider">Semaines</p>
        </div>
        <div className="text-center">
          <p className="text-[16px] font-bold text-white">{data.total_active_days}</p>
          <p className="text-[9px] text-white/30 uppercase tracking-wider">Total</p>
        </div>
      </div>

      {/* Message motivant */}
      {!isActive && current > 0 && (
        <p className="text-[11px] text-orange-400 mt-3 pt-2 border-t border-white/10">
          Publiez ou répondez aujourd'hui pour maintenir votre streak.
        </p>
      )}
      {isActive && (
        <p className="text-[11px] text-green-400 mt-3 pt-2 border-t border-white/10 flex items-center gap-1">
          <Zap size={11} /> Actif aujourd'hui — streak maintenu.
        </p>
      )}
      {current === 0 && (
        <p className="text-[11px] text-white/40 mt-3 pt-2 border-t border-white/10">
          Publiez une réalisation ou répondez à un avis pour démarrer.
        </p>
      )}
    </div>
  );
}
