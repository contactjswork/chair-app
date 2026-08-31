'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import type { ApiPost } from '@/lib/types';
import { getAfterImage, resolveMediaUrl } from '@/lib/types';
import { Printer } from 'lucide-react';

/**
 * Le book — le portfolio en PDF, à poser sur le comptoir ou à envoyer.
 *
 * Un coiffeur qui démarche un salon, candidate à une location de fauteuil
 * ou veut un book papier à feuilleter en salle d'attente n'a rien à mettre
 * en page : couverture aux couleurs CHAIR, réalisations publiées en grille,
 * QR vers le profil en dernière page.
 *
 * Format A4 portrait, une règle @page par navigateur d'impression. Pas
 * d'impression automatique (la boîte système gèle la vue avant l'aperçu) :
 * le bouton suffit. Sur iPhone : Partager → Imprimer → pincer = PDF.
 */

const PAR_PAGE = 4;

export default function BookPdfPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [chargement, setChargement] = useState(true);

  const slug = user?.hairdresser_profile?.slug ?? null;
  const ville = user?.hairdresser_profile?.city ?? null;
  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api$/, '');

  useEffect(() => {
    if (!user) return;
    api.get<ApiPost[]>('/posts')
      .then((data) => setPosts(data.filter((p) => p.is_published && p.type !== 'video')))
      .catch(() => {})
      .finally(() => setChargement(false));
  }, [user]);

  if (isLoading || !user || chargement) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const photos = posts
    .map((p) => ({
      url: resolveMediaUrl(getAfterImage(p)),
      specialite: (p.specialty ?? p.tags?.[0])?.name ?? null,
    }))
    .filter((p): p is { url: string; specialite: string | null } => !!p.url);

  const pages: typeof photos[] = [];
  for (let i = 0; i < photos.length; i += PAR_PAGE) pages.push(photos.slice(i, i + PAR_PAGE));

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center gap-5 p-6 print:bg-white print:p-0 print:min-h-0 print:gap-0">
      <div className="flex flex-col items-center gap-3 print:hidden">
        <p className="text-[13px] text-neutral-500 text-center max-w-xs">
          {photos.length === 0
            ? 'Publiez au moins une réalisation photo pour composer votre book.'
            : `${photos.length} réalisation${photos.length > 1 ? 's' : ''} — imprimez en A4, ou enregistrez en PDF (sur iPhone : Partager → Imprimer → pincez l'aperçu).`}
        </p>
        {photos.length > 0 && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-neutral-900 text-white text-[14px] font-bold px-6 py-3 rounded-2xl"
          >
            <Printer size={16} /> Imprimer / PDF
          </button>
        )}
      </div>

      {photos.length > 0 && (
        <div className="max-w-full overflow-x-auto print:overflow-visible space-y-5 print:space-y-0">
          {/* ── Couverture ── */}
          <div
            className="flex flex-col justify-between text-white p-14 print:shadow-none shadow-[0_10px_40px_-12px_rgba(10,10,10,0.3)] print:break-after-page"
            style={{ width: '210mm', height: '296mm', background: 'radial-gradient(120% 100% at 50% 0%, #1f1f21 0%, #0a0a0a 62%)' }}
          >
            <p className="text-[13px] font-bold uppercase tracking-[0.3em] text-white/45">CHAIR</p>
            <div>
              <p className="text-[52px] font-black leading-[1.05] tracking-[-0.02em]">{user.name}</p>
              {ville && <p className="text-[19px] text-white/55 mt-3">{ville}</p>}
              <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-white/35 mt-10">
                Book · {photos.length} réalisation{photos.length > 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-[12px] text-white/40">getchair.app{slug ? `/coiffeur/${slug}` : ''}</p>
          </div>

          {/* ── Pages de réalisations ── */}
          {pages.map((page, i) => (
            <div
              key={i}
              className="bg-white p-10 print:shadow-none shadow-[0_10px_40px_-12px_rgba(10,10,10,0.3)] print:break-after-page flex flex-col"
              style={{ width: '210mm', height: '296mm' }}
            >
              <div className="grid grid-cols-2 gap-6 flex-1 content-start">
                {page.map((photo, j) => (
                  <figure key={j}>
                    {/* <img> volontaire : next/image optimise pour l'écran, ici
                        on veut le fichier plein format dans le PDF. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.specialite ?? 'Réalisation'}
                      className="w-full object-cover rounded-lg"
                      style={{ height: '118mm' }}
                    />
                    {photo.specialite && (
                      <figcaption className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400 mt-2">
                        {photo.specialite}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
              <div className="flex items-center justify-between pt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-300">CHAIR — {user.name}</p>
                <p className="text-[10px] text-neutral-300 tabular-nums">{i + 1} / {pages.length}</p>
              </div>
            </div>
          ))}

          {/* ── Dernière page : réserver ── */}
          {slug && (
            <div
              className="bg-white flex flex-col items-center justify-center gap-8 print:shadow-none shadow-[0_10px_40px_-12px_rgba(10,10,10,0.3)]"
              style={{ width: '210mm', height: '296mm' }}
            >
              <p className="text-[26px] font-bold text-neutral-900 text-center leading-snug max-w-[130mm]">
                Réservez directement en ligne
              </p>
              <div className="p-6 bg-white rounded-3xl ring-1 ring-neutral-100">
                <QRCodeSVG value={`https://getchair.app/coiffeur/${slug}`} size={220} />
              </div>
              <p className="text-[14px] text-neutral-400">getchair.app/coiffeur/{slug}</p>
            </div>
          )}
        </div>
      )}

      {/* A4 sans marges imprimante : chaque bloc fait déjà la page. */}
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          nav, header { display: none !important; }
        }
      `}</style>
    </div>
  );
}
