'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/types';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { CalendarCheck, Euro, Users, Star, TrendingUp, Scissors, Eye, ImageIcon } from 'lucide-react';

/**
 * « Votre année CHAIR » — le récap annuel.
 *
 * Le principe Wrapped : de grands chiffres qui racontent l'année, dans la
 * DA sombre de CHAIR. Règle d'honnêteté : un bloc sans donnée n'apparaît
 * pas (pas de « 0 avis reçus » déguisé en célébration), et le pied de page
 * dit que seuls les passages via CHAIR sont comptés.
 */

interface RecapAnnuel {
  year: number;
  rdv_termines: number;
  visites_verifiees: number;
  ca_total: number;
  nouveaux_clients: number;
  avis_count: number;
  avis_moyenne: number | null;
  mois_top: { mois: string; total: number } | null;
  prestation_top: { nom: string; total: number } | null;
  realisations_publiees: number;
  meilleur_post: { id: number; likes_count: number; cover_image: string | null } | null;
  vues_profil: number;
}

const CARTE_SOMBRE_RECAP =
  'rounded-[28px] p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_4px_-2px_rgba(10,10,10,0.4),0_16px_36px_-14px_rgba(10,10,10,0.55)]';
const FOND_SOMBRE = { background: 'radial-gradient(120% 100% at 50% 0%, #1f1f21 0%, #0a0a0a 62%)' };

export default function RetrospectivePage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const [recap, setRecap] = useState<RecapAnnuel | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get<RecapAnnuel>('/my-year-recap')
      .then(setRecap)
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

  const totalPassages = (recap?.rdv_termines ?? 0) + (recap?.visites_verifiees ?? 0);
  const vide = !recap || (totalPassages === 0 && recap.realisations_publiees === 0 && recap.vues_profil === 0);
  const meilleureImage = recap?.meilleur_post ? resolveMediaUrl(recap.meilleur_post.cover_image) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-2 md:pt-10 pb-14">
      <DashboardPageHeader title={`Votre année ${recap?.year ?? ''}`} backHref="/pro/business" />

      {vide ? (
        <div className="mt-6 rounded-[24px] bg-neutral-50 p-6 text-center">
          <p className="text-[15px] font-bold text-neutral-900">Votre année s&apos;écrit encore</p>
          <p className="text-[13px] text-neutral-500 leading-relaxed mt-1.5">
            Dès vos premiers rendez-vous et passages vérifiés sur CHAIR, ce
            récap racontera votre année en chiffres.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {/* ── Le grand chiffre : les passages ── */}
          {totalPassages > 0 && (
            <div className={CARTE_SOMBRE_RECAP} style={FOND_SOMBRE}>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 flex items-center gap-1.5 mb-3">
                <CalendarCheck size={11} />Cette année
              </p>
              <p className="text-[56px] font-black leading-none tracking-tight">{totalPassages}</p>
              <p className="text-[14px] font-semibold text-white/60 mt-2">
                client{totalPassages > 1 ? 's' : ''} coiffé{totalPassages > 1 ? 's' : ''}
                {recap.visites_verifiees > 0 && (
                  <span className="text-white/35"> · dont {recap.visites_verifiees} passage{recap.visites_verifiees > 1 ? 's' : ''} vérifié{recap.visites_verifiees > 1 ? 's' : ''} par QR</span>
                )}
              </p>
            </div>
          )}

          {/* ── CA + nouveaux clients côte à côte ── */}
          <div className="grid grid-cols-2 gap-3">
            {recap.ca_total > 0 && (
              <div className={CARTE_SOMBRE_RECAP} style={FOND_SOMBRE}>
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/40 flex items-center gap-1.5 mb-2">
                  <Euro size={11} />Encaissé
                </p>
                <p className="text-[30px] font-black leading-none tabular-nums">{Math.round(recap.ca_total)}€</p>
                <p className="text-[11px] text-white/40 mt-1.5">via les RDV CHAIR</p>
              </div>
            )}
            {recap.nouveaux_clients > 0 && (
              <div className={CARTE_SOMBRE_RECAP} style={FOND_SOMBRE}>
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/40 flex items-center gap-1.5 mb-2">
                  <Users size={11} />Nouveaux
                </p>
                <p className="text-[30px] font-black leading-none tabular-nums">{recap.nouveaux_clients}</p>
                <p className="text-[11px] text-white/40 mt-1.5">client{recap.nouveaux_clients > 1 ? 's' : ''} rencontré{recap.nouveaux_clients > 1 ? 's' : ''}</p>
              </div>
            )}
          </div>

          {/* ── Avis ── */}
          {recap.avis_count > 0 && recap.avis_moyenne != null && (
            <div className="rounded-[24px] bg-white ring-1 ring-neutral-100 shadow-[0_4px_16px_-6px_rgba(10,10,10,0.1)] p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                <Star size={19} className="text-amber-500" fill="currentColor" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-neutral-900">{recap.avis_moyenne}/5 sur {recap.avis_count} avis</p>
                <p className="text-[12px] text-neutral-500 mt-0.5">reçus cette année — tous vérifiés</p>
              </div>
            </div>
          )}

          {/* ── Mois top + prestation top ── */}
          {(recap.mois_top || recap.prestation_top) && (
            <div className="rounded-[24px] bg-white ring-1 ring-neutral-100 shadow-[0_4px_16px_-6px_rgba(10,10,10,0.1)] p-5 space-y-4">
              {recap.mois_top && (
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-neutral-100 flex items-center justify-center shrink-0">
                    <TrendingUp size={18} className="text-neutral-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-neutral-900 capitalize">{recap.mois_top.mois}</p>
                    <p className="text-[12px] text-neutral-500 mt-0.5">votre mois le plus chargé · {recap.mois_top.total} passage{recap.mois_top.total > 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}
              {recap.prestation_top && (
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-neutral-100 flex items-center justify-center shrink-0">
                    <Scissors size={18} className="text-neutral-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-neutral-900 truncate">{recap.prestation_top.nom}</p>
                    <p className="text-[12px] text-neutral-500 mt-0.5">votre prestation signature · {recap.prestation_top.total} fois</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Portfolio de l'année ── */}
          {recap.realisations_publiees > 0 && (
            <div className={`${CARTE_SOMBRE_RECAP} overflow-hidden`} style={FOND_SOMBRE}>
              <div className="flex items-center gap-4">
                {meilleureImage && (
                  <div className="relative w-20 h-24 rounded-xl overflow-hidden shrink-0 bg-white/5">
                    <Image src={meilleureImage} alt="Réalisation la plus aimée" fill className="object-cover" sizes="80px" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/40 flex items-center gap-1.5 mb-2">
                    <ImageIcon size={11} />Portfolio
                  </p>
                  <p className="text-[24px] font-black leading-none">{recap.realisations_publiees} réalisation{recap.realisations_publiees > 1 ? 's' : ''}</p>
                  {recap.meilleur_post && recap.meilleur_post.likes_count > 0 && (
                    <p className="text-[12px] text-white/45 mt-1.5">
                      la plus aimée : {recap.meilleur_post.likes_count} j&apos;aime
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Vues du profil ── */}
          {recap.vues_profil > 0 && (
            <div className="rounded-[24px] bg-white ring-1 ring-neutral-100 shadow-[0_4px_16px_-6px_rgba(10,10,10,0.1)] p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-neutral-100 flex items-center justify-center shrink-0">
                <Eye size={18} className="text-neutral-600" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-neutral-900">{recap.vues_profil} vues de votre profil</p>
                <p className="text-[12px] text-neutral-500 mt-0.5">des clients qui vous ont découvert ou retrouvé</p>
              </div>
            </div>
          )}

          <p className="text-[11px] text-neutral-400 leading-relaxed text-center pt-2 px-4">
            Chiffres mesurés sur CHAIR uniquement — vos rendez-vous et passages
            hors application ne sont pas comptés.
          </p>
        </div>
      )}
    </div>
  );
}
