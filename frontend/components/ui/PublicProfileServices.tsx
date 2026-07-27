'use client';

import { useState } from 'react';
import { Clock, ExternalLink, Calendar } from 'lucide-react';
import type { ApiServiceCategory, ApiService } from '@/lib/types';
import BookingSheet from './BookingSheet';

interface Props {
  slug: string;
  categories: ApiServiceCategory[];
  isIndependent: boolean;
  bookingUrl: string | null;
}

export default function PublicProfileServices({ slug, categories, isIndependent, bookingUrl }: Props) {
  const [preselect, setPreselect] = useState<ApiService | null>(null);
  const [open, setOpen] = useState(false);

  const visibleCategories = categories
    .map((cat) => ({ cat, active: (cat.services ?? []).filter((s) => s.is_active) }))
    .filter(({ active }) => active.length > 0);

  function handleBook(svc: ApiService) {
    setPreselect(svc);
    setOpen(true);
  }

  if (visibleCategories.length === 0) {
    return (
      <div className="px-4 md:px-0">
        <div className="bg-neutral-50 border border-neutral-100 rounded-2xl py-14 text-center">
          <p className="text-[13px] text-neutral-400">Aucune prestation renseignée pour l&apos;instant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-0">
      {!isIndependent && bookingUrl && (
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-neutral-900 text-white font-semibold py-3.5 rounded-2xl text-[14px] mb-5 hover:bg-neutral-700 transition-colors"
        >
          <ExternalLink size={15} strokeWidth={2} />
          Réserver au salon
        </a>
      )}

      <div className="space-y-5">
        {visibleCategories.map(({ cat, active }) => (
          <div key={cat.id}>
            {cat.name && (
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-2">{cat.name}</p>
            )}
            <div className="bg-neutral-50 rounded-2xl overflow-hidden divide-y divide-neutral-100">
              {active.map((svc) => (
                <div key={svc.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-neutral-900 leading-snug">{svc.name}</p>
                    {svc.description && (
                      <p className="text-[12px] text-neutral-400 mt-0.5 leading-snug line-clamp-1">{svc.description}</p>
                    )}
                    {svc.duration_minutes != null && (
                      <span className="flex items-center gap-1 text-[12px] text-neutral-400 mt-1">
                        <Clock size={11} />{svc.duration_minutes} min
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    {isIndependent && svc.price != null && parseFloat(String(svc.price)) > 0 && (
                      <span className="text-[15px] font-bold text-neutral-900">{parseFloat(String(svc.price)).toFixed(0)} €</span>
                    )}
                    {isIndependent && (
                      <button
                        onClick={() => handleBook(svc)}
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-neutral-900 px-3 py-2 rounded-xl hover:bg-neutral-700 transition-colors"
                      >
                        <Calendar size={12} />
                        Réserver
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isIndependent && (
        <BookingSheet
          slug={slug}
          open={open}
          onClose={() => { setOpen(false); setPreselect(null); }}
          initialCategoryId={preselect?.category_id}
          initialServiceId={preselect?.id}
        />
      )}
    </div>
  );
}
