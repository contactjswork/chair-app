'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';

interface Props {
  open: boolean;
  onClose: () => void;
  message?: string;
}

export default function SignupPromptModal({ open, onClose, message }: Props) {
  if (!open) return null;

  return (
    <BottomSheet onClose={onClose} zIndexClassName="z-[201]">
        <div className="relative px-6 pt-1 pb-8">
          <button
            onClick={onClose}
            className="absolute top-0 right-5 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors"
          >
            <X size={14} className="text-neutral-500" />
          </button>

          <div className="text-center mb-7">
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400 mb-2">CHAIR</p>
            <h2 className="text-[26px] font-black text-neutral-900 tracking-tight leading-tight mb-3">
              Rejoins la communauté
            </h2>
            <p className="text-[14px] text-neutral-500 leading-relaxed max-w-xs mx-auto">
              {message ?? 'Crée un compte gratuit pour suivre tes coiffeurs et sauvegarder tes inspirations.'}
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/inscription"
              onClick={onClose}
              className="block w-full text-center bg-neutral-900 text-white font-bold py-4 rounded-2xl text-[14px] hover:bg-neutral-800 transition-colors"
            >
              Créer un compte gratuit
            </Link>
            <Link
              href="/connexion"
              onClick={onClose}
              className="block w-full text-center border border-neutral-200 text-neutral-700 font-semibold py-4 rounded-2xl text-[14px] hover:border-neutral-400 transition-colors"
            >
              Se connecter
            </Link>
          </div>
        </div>
    </BottomSheet>
  );
}
