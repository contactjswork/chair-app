'use client';

import { useEffect, useState } from 'react';

interface SplashScreenProps {
  pro?: boolean;
}

export default function SplashScreen({ pro = false }: SplashScreenProps) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out' | 'done'>('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 400);
    const t2 = setTimeout(() => setPhase('out'),  1200);
    const t3 = setTimeout(() => setPhase('done'), 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [pro]);

  if (phase === 'done') return null;

  const bg  = pro ? '#0a0a0a' : '#ffffff';
  const fg  = pro ? '#ffffff' : '#111111';
  const sub = pro ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: bg,
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'out' ? 'opacity 0.5s ease' : phase === 'in' ? 'none' : undefined,
      }}
    >
      {/* Logo avec scale-in */}
      <div
        style={{
          transform: phase === 'in' ? 'scale(0.85)' : 'scale(1)',
          opacity:   phase === 'in' ? 0 : 1,
          transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
        }}
        className="flex flex-col items-center gap-2"
      >
        <span
          className="font-bold tracking-tight leading-none"
          style={{ color: fg, fontSize: 32, letterSpacing: '-0.03em' }}
        >
          {pro ? 'CHAIR PRO' : 'CHAIR'}
        </span>
        {pro && (
          <span className="text-[11px] font-medium tracking-[0.2em] uppercase" style={{ color: sub }}>
            Espace professionnel
          </span>
        )}
      </div>

      {/* Point animé en bas */}
      <div className="absolute bottom-16 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: sub,
              animation: phase === 'hold' ? `splashDot 0.8s ease ${i * 0.15}s infinite alternate` : 'none',
              opacity: phase === 'hold' ? 1 : 0,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes splashDot {
          from { opacity: 0.3; transform: scale(0.8); }
          to   { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
