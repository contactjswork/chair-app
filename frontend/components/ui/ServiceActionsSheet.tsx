'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Copy, FolderInput, Eye, EyeOff, Trash2, ChevronLeft, AlertTriangle } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import type { ApiService, ApiSpecialty } from '@/lib/types';

type Step = 'menu' | 'move' | 'delete-confirm' | 'delete-blocked';

interface Props {
  open: boolean;
  onClose: () => void;
  service: ApiService;
  specialties: ApiSpecialty[];
  onEdit: () => void;
  onToggle: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onMove: (specialtyId: number | null) => Promise<void>;
  onDeletePermanently: () => Promise<void>;
}

// Menu d'actions par service — remplace les icônes isolées dans la ligne :
// un seul point d'entrée ("..."), toutes les actions destructrices ou
// structurantes (supprimer, changer de spécialité) passent par une
// confirmation explicite plutôt qu'un tap accidentel direct dans la liste.
export default function ServiceActionsSheet({ open, onClose, service, specialties, onEdit, onToggle, onDuplicate, onMove, onDeletePermanently }: Props) {
  const [step, setStep] = useState<Step>('menu');
  const [busy, setBusy] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState('');

  if (!open) return null;

  function reset() {
    setStep('menu');
    setBusy(false);
    setBlockedMessage('');
    onClose();
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      reset();
    } catch {
      setBusy(false);
    }
  }

  async function handleDeleteConfirm() {
    setBusy(true);
    try {
      await onDeletePermanently();
      reset();
    } catch (err) {
      setBlockedMessage(err instanceof Error ? err.message : "Suppression impossible pour le moment.");
      setStep('delete-blocked');
      setBusy(false);
    }
  }

  const rowCls = 'w-full flex items-center gap-3 px-5 py-3.5 text-left text-[14px] font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-40 transition-colors';
  const iconCls = 'w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0 text-neutral-500';

  return createPortal(
    <BottomSheet onClose={reset} maxHeight="max-h-[80vh]" zIndexClassName="z-[70]">
      <div className="px-1 pb-6">
        <p className="px-5 pb-3 text-[13px] font-bold text-neutral-400 truncate">{service.name}</p>

        {step === 'menu' && (
          <div className="divide-y divide-neutral-50">
            <button className={rowCls} disabled={busy} onClick={() => { onEdit(); reset(); }}>
              <span className={iconCls}><Pencil size={14} /></span>Modifier
            </button>
            <button className={rowCls} disabled={busy} onClick={() => run(onDuplicate)}>
              <span className={iconCls}><Copy size={14} /></span>Dupliquer
            </button>
            <button className={rowCls} disabled={busy} onClick={() => setStep('move')}>
              <span className={iconCls}><FolderInput size={14} /></span>Changer de spécialité
            </button>
            <button className={rowCls} disabled={busy} onClick={() => run(onToggle)}>
              <span className={iconCls}>{service.is_active ? <EyeOff size={14} /> : <Eye size={14} />}</span>
              {service.is_active ? 'Désactiver' : 'Activer'}
            </button>
            <button className={`${rowCls} text-red-600`} disabled={busy} onClick={() => setStep('delete-confirm')}>
              <span className={`${iconCls} bg-red-50 text-red-500`}><Trash2 size={14} /></span>Supprimer
            </button>
          </div>
        )}

        {step === 'move' && (
          <div>
            <button onClick={() => setStep('menu')} className="flex items-center gap-1 px-5 pb-2 text-[12px] font-semibold text-neutral-400">
              <ChevronLeft size={13} />Retour
            </button>
            <div className="divide-y divide-neutral-50 max-h-72 overflow-y-auto">
              {specialties.filter((sp) => sp.id !== service.specialty_id).map((sp) => (
                <button key={sp.id} className={rowCls} disabled={busy} onClick={() => run(() => onMove(sp.id))}>
                  <span className={iconCls}><FolderInput size={14} /></span>{sp.name}
                </button>
              ))}
              {service.specialty_id != null && (
                <button className={rowCls} disabled={busy} onClick={() => run(() => onMove(null))}>
                  <span className={iconCls}><FolderInput size={14} /></span>Autres services (aucune spécialité)
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'delete-confirm' && (
          <div className="px-5 pt-1">
            <p className="text-[15px] font-bold text-neutral-900 mb-1.5">Supprimer définitivement ce service ?</p>
            <p className="text-[13px] text-neutral-500 leading-relaxed mb-5">
              Cette action retirera le service de votre profil et de vos prochaines disponibilités. Elle est irréversible.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setStep('menu')} disabled={busy} className="flex-1 py-3 rounded-xl border border-neutral-200 text-[14px] font-semibold text-neutral-700 disabled:opacity-40">
                Annuler
              </button>
              <button onClick={handleDeleteConfirm} disabled={busy} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-[14px] font-semibold disabled:opacity-40">
                {busy ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        )}

        {step === 'delete-blocked' && (
          <div className="px-5 pt-1">
            <div className="flex items-start gap-2.5 mb-4">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-neutral-600 leading-relaxed">{blockedMessage}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('menu')} disabled={busy} className="flex-1 py-3 rounded-xl border border-neutral-200 text-[14px] font-semibold text-neutral-700 disabled:opacity-40">
                Annuler
              </button>
              <button onClick={() => run(onToggle)} disabled={busy} className="flex-1 py-3 rounded-xl bg-neutral-900 text-white text-[14px] font-semibold disabled:opacity-40">
                {service.is_active ? 'Désactiver à la place' : 'OK'}
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>,
    document.body
  );
}
