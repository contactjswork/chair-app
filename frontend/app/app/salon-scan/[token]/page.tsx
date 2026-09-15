'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { salons } from '@/lib/api';
import { resolveMediaUrl, type ApiSalonScanInfo } from '@/lib/types';
import { Building2, Star, AlertCircle, Loader2, ChevronRight } from 'lucide-react';

/**
 * Derrière le QR AVIS DU SALON (sticker unique à la caisse, idée validée
 * par Julien le 15/09/2026) : « Qui vous a coiffé aujourd'hui ? ».
 *
 * Le client choisit son coiffeur dans l'équipe → le serveur frappe un jeton
 * de scan classique pour CE coiffeur → redirection vers /app/scan/{jeton},
 * le parcours existant (connexion, prestation, visite vérifiée avec tous
 * les garde-fous anti-fraude, avis, fidélité) — zéro duplication.
 */
export default function SalonScanPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [info, setInfo] = useState<ApiSalonScanInfo | null>(null);
  const [error, setError] = useState('');
  const [choosingId, setChoosingId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    salons.salonScanInfo(token)
      .then(setInfo)
      .catch((e) => setError(e instanceof Error ? e.message : 'QR invalide.'));
  }, [token]);

  async function choisir(hairdresserId: number) {
    if (choosingId !== null) return;
    setChoosingId(hairdresserId);
    setError('');
    try {
      const res = await salons.salonScanChoose(token, hairdresserId);
      router.replace(`/app/scan/${res.scan_token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de continuer — réessayez.');
      setChoosingId(null);
    }
  }

  const logoUrl = info?.logo ? resolveMediaUrl(info.logo) : null;

  return (
    <div className="min-h-[100svh] bg-neutral-50 flex flex-col">
      <div className="bg-white border-b border-neutral-100 px-5 py-3.5">
        <Link href="/app" className="text-base font-bold tracking-[0.12em] uppercase text-neutral-900">CHAIR</Link>
      </div>

      <div className="flex-1 w-full max-w-md mx-auto px-5 py-8">
        {error && !info ? (
          <div className="text-center pt-16">
            <AlertCircle size={32} className="text-neutral-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-700">{error}</p>
          </div>
        ) : !info ? (
          <div className="flex justify-center pt-20">
            <Loader2 size={22} className="animate-spin text-neutral-300" />
          </div>
        ) : (
          <>
            {/* Le salon */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-[22px] bg-white ring-1 ring-neutral-100 shadow-[0_4px_16px_-8px_rgba(10,10,10,0.12)] overflow-hidden mx-auto mb-4 flex items-center justify-center relative">
                {logoUrl
                  ? <Image src={logoUrl} alt="" fill className="object-cover" sizes="64px" />
                  : <Building2 size={24} className="text-neutral-300" />}
              </div>
              <p className="text-[13px] font-semibold text-neutral-500">{info.salon_name}</p>
              <h1 className="text-[24px] font-bold text-neutral-900 tracking-[-0.02em] mt-1">
                Qui vous a coiffé<br />aujourd&apos;hui ?
              </h1>
              <p className="text-[13px] text-neutral-400 mt-2">
                Choisissez votre coiffeur pour valider votre visite et laisser un avis.
              </p>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">{error}</div>
            )}

            {/* L'équipe */}
            {info.team.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-8">
                Aucun coiffeur n&apos;est rattaché à ce salon pour le moment.
              </p>
            ) : (
              <div className="space-y-2.5">
                {info.team.map((m) => {
                  const avatarUrl = m.avatar ? resolveMediaUrl(m.avatar) : null;
                  const note = parseFloat(String(m.avg_rating ?? 0));
                  const busy = choosingId === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => choisir(m.id)}
                      disabled={choosingId !== null}
                      className="w-full flex items-center gap-3.5 bg-white rounded-[24px] ring-1 ring-neutral-100 shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] p-4 text-left active:scale-[0.985] transition-transform disabled:opacity-60"
                    >
                      <div className="w-12 h-12 rounded-full bg-neutral-100 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                        {avatarUrl
                          ? <Image src={avatarUrl} alt="" fill className="object-cover" sizes="48px" />
                          : <span className="text-base font-bold text-neutral-400">{m.name?.[0] ?? '?'}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-neutral-900 truncate">{m.name}</p>
                        {m.reviews_count > 0 && note > 0 && (
                          <p className="flex items-center gap-1 text-[12px] text-neutral-400 mt-0.5">
                            <Star size={10} className="fill-amber-400 stroke-none" />
                            {note.toFixed(1)} · {m.reviews_count} avis
                          </p>
                        )}
                      </div>
                      {busy
                        ? <Loader2 size={16} className="animate-spin text-neutral-400 flex-shrink-0" />
                        : <ChevronRight size={17} className="text-neutral-300 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
