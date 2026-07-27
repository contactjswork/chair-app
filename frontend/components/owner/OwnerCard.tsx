'use client';

import type { ReactNode, MouseEventHandler } from 'react';
import Link from 'next/link';

interface OwnerCardProps {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md';
  interactive?: boolean;
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

const PADDING = { none: '', sm: 'p-3', md: 'p-4' } as const;

/** Conteneur de base réutilisé partout côté gérant : bg-white rounded-2xl border border-neutral-100. */
export default function OwnerCard({ children, padding = 'md', interactive = false, href, onClick, className = '' }: OwnerCardProps) {
  const base = `bg-white rounded-2xl border border-neutral-100 ${PADDING[padding]} ${
    interactive ? 'hover:border-neutral-300 transition-colors' : ''
  } ${className}`;

  if (href) {
    return <Link href={href} className={`block ${base}`}>{children}</Link>;
  }
  if (onClick) {
    return <button onClick={onClick} className={`w-full text-left ${base}`}>{children}</button>;
  }
  return <div className={base}>{children}</div>;
}
