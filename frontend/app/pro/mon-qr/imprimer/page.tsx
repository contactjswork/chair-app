'use client';

import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';

/**
 * Le chevalet de comptoir — la version imprimable du QR.
 *
 * Le QR ne sert que s'il est SUR le comptoir : à l'écran, il faut que le
 * coiffeur y pense, sorte son téléphone, retrouve la page. Imprimé, il
 * travaille tout seul à chaque encaissement.
 *
 * Le QR imprimé pointe vers /q/{slug} — l'URL PERMANENTE, pas le token
 * tournant (TTL 8 minutes, un imprimé serait mort avant de sortir de
 * l'imprimante). La redirection émet le token frais au moment du scan, et
 * les vraies serrures restent en place : un scan par client toutes les
 * 12 h, plafond quotidien, anti auto-scan.
 *
 * Format A6 paysage, pensé pour être plié en chevalet ou glissé dans un
 * porte-carte. Impression déclenchée automatiquement à l'arrivée : sur
 * iPhone, Partager → Imprimer → pincer pour obtenir le PDF.
 */
export default function ImprimerQrPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const slug = user?.hairdresser_profile?.slug ?? null;
  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api$/, '');
  const urlPermanente = slug ? `${apiBase}/q/${slug}` : null;

  useEffect(() => {
    if (!slug) return;
    // On marque « imprimé » dès l'ouverture de la vue : c'est le geste
    // qu'on suit (avoir généré son chevalet), pas le clic Imprimer du
    // navigateur, invisible pour nous.
    api.post('/hairdresser/qr-printed', {}).catch(() => {});
    // Pas d impression automatique : la boite systeme qui s ouvre avant
    // meme d avoir vu l apercu est brutale — le bouton suffit.
  }, [slug]);

  if (isLoading || !user || !urlPermanente) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const prenom = (user.name ?? '').split(' ')[0] || 'Votre coiffeur';

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center gap-5 p-6 print:bg-white print:p-0 print:min-h-0">
      {/* Consigne à l'écran uniquement. */}
      <p className="text-[13px] text-neutral-500 text-center max-w-xs print:hidden">
        Imprimez en A6 (ou A4 puis découpez), pliez, posez sur le comptoir.
        Sur iPhone : Partager → Imprimer → pincez l&apos;aperçu pour obtenir un PDF.
      </p>

      {/* Le chevalet : 148 × 105 mm (A6 paysage). Plus large que l'écran
          d'un téléphone : il défile dans SON conteneur, jamais la page. */}
      <div className="max-w-full overflow-x-auto print:overflow-visible">
      <div
        className="bg-white flex overflow-hidden print:shadow-none shadow-[0_10px_40px_-12px_rgba(10,10,10,0.3)]"
        style={{ width: '148mm', height: '105mm' }}
      >
        {/* Volet gauche — l'invitation, sombre comme la DA. */}
        <div
          className="flex flex-col justify-between text-white p-8"
          style={{ width: '58%', background: 'radial-gradient(120% 100% at 50% 0%, #1f1f21 0%, #0a0a0a 62%)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">CHAIR</p>
          <div>
            <p className="text-[26px] font-bold leading-[1.15] tracking-[-0.02em]">
              Vous venez d&apos;être coiffé(e)&nbsp;?
            </p>
            <p className="text-[13px] text-white/60 leading-relaxed mt-3">
              Scannez pour confirmer votre passage chez {prenom} —
              et laissez un avis vérifié.
            </p>
          </div>
          <p className="text-[10px] text-white/40">Avis vérifiés · Carte de fidélité · getchair.app</p>
        </div>

        {/* Volet droit — le QR, plein cadre, sur blanc pour le contraste de scan. */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <QRCodeSVG value={urlPermanente} size={190} level="M" marginSize={0} />
          <p className="text-[11px] font-semibold text-neutral-500 tracking-wide">Scannez-moi</p>
        </div>
      </div>
      </div>

      <button
        onClick={() => window.print()}
        className="print:hidden min-h-[48px] px-6 bg-neutral-900 text-white text-[14px] font-semibold rounded-2xl active:scale-[0.97] transition-transform"
      >
        Imprimer
      </button>
    </div>
  );
}
