'use client';

import { useEffect, useRef, useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import { partagerBlob } from '@/lib/storyImage';
import { Share2, Download, Check } from 'lucide-react';

/**
 * Prévisualisation + partage d'une story générée (réalisation, créneau
 * libéré…).
 *
 * Pourquoi une feuille et pas un partage direct : iOS n'autorise
 * navigator.share que DANS un geste utilisateur. La première version
 * générait l'image (async) puis partageait — le geste avait expiré,
 * le partage échouait en silence. Ici : génération à l'ouverture de la
 * feuille, prévisualisation, et le bouton « Partager » part d'un tap
 * frais avec le fichier déjà prêt.
 */
export default function StoryShareSheet({ generer, onClose }: {
  generer: () => Promise<Blob>;
  onClose: () => void;
}) {
  const [blob, setBlob]       = useState<Blob | null>(null);
  const [apercu, setApercu]   = useState<string | null>(null);
  const [erreur, setErreur]   = useState('');
  const [etat, setEtat]       = useState<'' | 'partage' | 'telecharge'>('');
  const generationLancee = useRef(false);

  useEffect(() => {
    if (generationLancee.current) return;
    generationLancee.current = true;
    generer()
      .then((b) => {
        setBlob(b);
        setApercu(URL.createObjectURL(b));
      })
      .catch(() => setErreur('Impossible de générer la story — vérifiez votre connexion et réessayez.'));
  }, [generer]);

  useEffect(() => () => { if (apercu) URL.revokeObjectURL(apercu); }, [apercu]);

  async function partager() {
    if (!blob) return;
    const resultat = await partagerBlob(blob);
    if (resultat === 'partage' || resultat === 'telecharge') {
      setEtat(resultat);
      setTimeout(onClose, 900);
    }
  }

  function telecharger() {
    if (!blob || !apercu) return;
    const a = document.createElement('a');
    a.href = apercu;
    a.download = 'chair-story.png';
    a.click();
    setEtat('telecharge');
  }

  return (
    <BottomSheet onClose={onClose} maxHeight="max-h-[92vh]">
      <div className="px-5 pb-safe-5">
        <p className="text-[20px] font-bold text-neutral-900 mb-1">Votre story</p>
        <p className="text-[12px] text-neutral-400 mb-4">
          Prête pour Instagram — votre lien de réservation est dessus.
        </p>

        {erreur ? (
          <p className="text-[13px] font-semibold text-red-600 py-8 text-center">{erreur}</p>
        ) : apercu ? (
          <div className="w-full max-w-[220px] mx-auto rounded-2xl overflow-hidden ring-1 ring-neutral-100 shadow-[0_10px_30px_-12px_rgba(10,10,10,0.3)] mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- objectURL local, next/image inutile */}
            <img src={apercu} alt="Aperçu de la story" className="w-full block" />
          </div>
        ) : (
          <div className="w-full max-w-[220px] mx-auto aspect-[9/16] rounded-2xl bg-neutral-100 animate-pulse mb-4" />
        )}

        <button
          onClick={partager}
          disabled={!blob || !!etat}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-neutral-900 text-white text-[15px] font-bold disabled:opacity-40 hover:bg-neutral-700 transition-colors"
        >
          {etat ? (<><Check size={16} /> {etat === 'partage' ? 'Partagée' : 'Enregistrée'}</>) : (<><Share2 size={16} /> Partager</>)}
        </button>
        <button
          onClick={telecharger}
          disabled={!blob}
          className="w-full flex items-center justify-center gap-2 py-3 mt-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900 disabled:opacity-40 transition-colors"
        >
          <Download size={14} /> Enregistrer l&apos;image
        </button>
      </div>
    </BottomSheet>
  );
}
