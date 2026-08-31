'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * En-tête de section du cockpit — même typographie que la home CHAIR client
 * (SectionHeader dans HomeGeoStrips.tsx) : un vrai titre de 20px qui porte la
 * hiérarchie, pas un micro-label capitales de 11px. Les deux applis doivent se
 * lire comme un seul produit.
 */
export default function ProSection({
  title, subtitle, href, children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-8 first:pt-0">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[20px] font-bold text-neutral-900 tracking-tight leading-tight">{title}</h2>
          {subtitle && <p className="text-[13px] text-neutral-400 mt-1 leading-relaxed">{subtitle}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="relative before:absolute before:-inset-1.5 before:content-[''] flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-90 transition-all"
          >
            <ChevronRight size={16} strokeWidth={2.5} className="text-neutral-900" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
