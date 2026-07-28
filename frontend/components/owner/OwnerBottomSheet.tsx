'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';

interface OwnerBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Bottom sheet standard côté gérant (invitation, wizard, formulaire contextuel). */
export default function OwnerBottomSheet({ open, onClose, title, subtitle, children }: OwnerBottomSheetProps) {
  if (!open) return null;

  return (
    <BottomSheet onClose={onClose} zIndexClassName="z-[100]">
      <div className="px-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[16px] font-bold text-neutral-900">{title}</p>
            {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors">
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </BottomSheet>
  );
}
