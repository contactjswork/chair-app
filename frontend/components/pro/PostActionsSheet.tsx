'use client';

import { useState } from 'react';
import { Pin, PinOff, Edit2, Archive, ArchiveRestore, Trash2, ChevronLeft, Share2 } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';

/**
 * Actions d'une réalisation du portfolio.
 *
 * Elles vivaient auparavant en surimpression sur la vignette : quatre boutons
 * de 28 px révélés au survol. Deux problèmes, et le second était grave.
 *
 * 1. Une vignette fait 166 px de côté. Quatre cibles de 44 px en demandent
 *    194 : elles ne pouvaient physiquement pas être assez grandes.
 * 2. Surtout, il n'y a pas de survol sur un téléphone — et CHAIR PRO est une
 *    app iPhone. Les boutons restaient donc en `opacity-0`… tout en étant
 *    cliquables. Un coiffeur pouvait archiver ou supprimer une réalisation
 *    sans jamais avoir vu le bouton qu'il venait de toucher.
 *
 * Un seul point d'entrée « … » à 44 px, et les actions dans une feuille où
 * chaque ligne fait plus de 44 px et porte son nom en toutes lettres. C'est
 * aussi ce que fait iOS partout où une vignette porte des actions.
 *
 * La suppression garde son écran de confirmation : c'est la seule action
 * irréversible du lot.
 */

interface Props {
  onClose: () => void;
  isPinned: boolean;
  isPublished: boolean;
  busy?: boolean;
  onTogglePin: () => void;
  onEdit: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  /** Story Instagram formatée — absent quand la réalisation n'a pas de photo (vidéo). */
  onShareStory?: () => void;
}

const rowCls =
  'w-full flex items-center gap-3 px-5 py-3.5 text-left text-[14px] font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-40 transition-colors';

export default function PostActionsSheet({
  onClose, isPinned, isPublished, busy = false,
  onTogglePin, onEdit, onToggleArchive, onDelete, onShareStory,
}: Props) {
  const [step, setStep] = useState<'menu' | 'delete-confirm'>('menu');

  return (
    <BottomSheet onClose={onClose} maxHeight="max-h-[80vh]" zIndexClassName="z-[70]">
      <div className="px-1 pb-6">
        {step === 'menu' && (
          <div className="divide-y divide-neutral-50">
            {onShareStory && (
              <button className={rowCls} disabled={busy} onClick={() => { onShareStory(); onClose(); }}>
                <Share2 size={17} className="text-neutral-500" />
                Partager en story
              </button>
            )}
            <button className={rowCls} disabled={busy} onClick={() => { onTogglePin(); onClose(); }}>
              {isPinned ? <PinOff size={17} className="text-neutral-500" /> : <Pin size={17} className="text-neutral-500" />}
              {isPinned ? 'Retirer de la une' : 'Épingler en tête de portfolio'}
            </button>
            <button className={rowCls} disabled={busy} onClick={() => { onEdit(); onClose(); }}>
              <Edit2 size={17} className="text-neutral-500" />
              Modifier
            </button>
            <button className={rowCls} disabled={busy} onClick={() => { onToggleArchive(); onClose(); }}>
              {isPublished ? <Archive size={17} className="text-neutral-500" /> : <ArchiveRestore size={17} className="text-neutral-500" />}
              {isPublished ? 'Archiver' : 'Republier'}
            </button>
            <button className={`${rowCls} text-red-600`} disabled={busy} onClick={() => setStep('delete-confirm')}>
              <Trash2 size={17} className="text-red-500" />
              Supprimer
            </button>
          </div>
        )}

        {step === 'delete-confirm' && (
          <div>
            <button
              onClick={() => setStep('menu')}
              className="flex items-center gap-1 px-5 pb-2 text-[12px] font-semibold text-neutral-500"
            >
              <ChevronLeft size={14} />Retour
            </button>
            <p className="px-5 pb-1 text-[15px] font-bold text-neutral-900">Supprimer cette réalisation ?</p>
            <p className="px-5 pb-4 text-[13px] text-neutral-500 leading-relaxed">
              Elle disparaîtra de votre portfolio et des favoris des clients qui
              l&apos;avaient enregistrée. C&apos;est définitif.
            </p>
            <div className="flex gap-2 px-5">
              <button
                onClick={() => setStep('menu')}
                disabled={busy}
                className="flex-1 py-3 rounded-xl border border-neutral-200 text-[14px] font-semibold text-neutral-700"
              >
                Annuler
              </button>
              <button
                onClick={() => { onDelete(); onClose(); }}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-[14px] font-semibold"
              >
                Supprimer
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
