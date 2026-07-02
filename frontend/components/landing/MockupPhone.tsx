'use client';

import Image from 'next/image';

interface BadgeProps {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}

function FloatingBadge({ children, dark = false, className = '' }: BadgeProps) {
  return (
    <div className={`absolute z-10 ${dark ? 'bg-neutral-900 border border-white/10' : 'bg-white border border-neutral-100'} rounded-2xl px-4 py-3 shadow-2xl ${className}`}>
      {children}
    </div>
  );
}

interface MockupPhoneProps {
  /** Chemin vers l'image (ex: /mockups/feed.png) — laisser vide pour placeholder */
  src?: string;
  /** Label affiché dans le placeholder */
  label?: string;
  /** Fond du placeholder (couleur hex ou classe) */
  placeholderBg?: string;
  /** Éléments flottants autour du téléphone */
  badges?: React.ReactNode;
  /** Classes supplémentaires sur le wrapper */
  className?: string;
  /** Taille : sm=220px, md=260px, lg=300px */
  size?: 'sm' | 'md' | 'lg';
  /** Ombre colorée sous le téléphone */
  glow?: boolean;
}

const SIZES = {
  sm: { w: 220, h: 440, r: 36, ri: 28, p: 9 },
  md: { w: 260, h: 520, r: 42, ri: 33, p: 11 },
  lg: { w: 300, h: 600, r: 48, ri: 38, p: 13 },
};

export default function MockupPhone({
  src,
  label = 'Écran app',
  placeholderBg = '#1a1a1a',
  badges,
  className = '',
  size = 'md',
  glow = false,
}: MockupPhoneProps) {
  const s = SIZES[size];

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: s.w, height: s.h }}>
      {/* Phone shell */}
      <div
        className="absolute inset-0"
        style={{
          background: '#0d0d0d',
          borderRadius: s.r,
          boxShadow: glow
            ? '0 60px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08), 0 0 80px rgba(255,255,255,0.04)'
            : '0 40px 100px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.07)',
        }}
      >
        {/* Side buttons */}
        <div style={{ position: 'absolute', right: -2, top: 88, width: 3, height: 48, borderRadius: '0 4px 4px 0', background: '#1e1e1e' }} />
        <div style={{ position: 'absolute', left: -2, top: 72, width: 3, height: 36, borderRadius: '4px 0 0 4px', background: '#1e1e1e' }} />
        <div style={{ position: 'absolute', left: -2, top: 120, width: 3, height: 36, borderRadius: '4px 0 0 4px', background: '#1e1e1e' }} />

        {/* Screen */}
        <div
          className="absolute overflow-hidden"
          style={{
            top: s.p,
            left: s.p,
            right: s.p,
            bottom: s.p,
            borderRadius: s.ri,
            background: placeholderBg,
          }}
        >
          {/* Dynamic island */}
          <div style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 90,
            height: 28,
            borderRadius: 20,
            background: '#000',
            zIndex: 10,
          }} />

          {/* Content */}
          {src ? (
            <Image
              src={src}
              alt={label}
              fill
              className="object-cover object-top"
              sizes={`${s.w}px`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-30">
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 900 }}>C</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {label}
              </span>
            </div>
          )}

          {/* Home indicator */}
          <div style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 80,
            height: 4,
            borderRadius: 4,
            background: 'rgba(255,255,255,0.2)',
          }} />
        </div>
      </div>

      {badges}
    </div>
  );
}

export { FloatingBadge };
