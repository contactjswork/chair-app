'use client';

import {
  Frame, Armchair, Droplets, Wifi, Snowflake, Flame, Car, Coffee,
  Package, CreditCard, Building2, TrainFront, Accessibility, Check,
  Wind, Scissors, Lock, Palette, WashingMachine, ShieldCheck, Store, Clock,
} from 'lucide-react';
import { CHAIR_EQUIPMENT_LABELS, CHAIR_EQUIPMENT_GROUPS, type ChairEquipmentKey } from '@/lib/types';

const EQUIPMENT_ICONS: Record<ChairEquipmentKey, typeof Frame> = {
  mirror: Frame,
  premium_chair: Armchair,
  sink: Droplets,
  dryer: Wind,
  tools_included: Scissors,
  storage: Lock,
  coloring_space: Palette,
  products_included: Package,
  towels_service: WashingMachine,
  sterilizer: ShieldCheck,
  product_showcase: Store,
  wifi: Wifi,
  card_terminal: CreditCard,
  break_room: Coffee,
  ac: Snowflake,
  heating: Flame,
  city_center: Building2,
  near_station: TrainFront,
  parking: Car,
  pmr: Accessibility,
  flexible_hours: Clock,
};

interface Props {
  selected: ChairEquipmentKey[];
  onToggle?: (key: ChairEquipmentKey) => void;
  readOnly?: boolean;
}

function Carte({ eqKey, isSelected, readOnly, onToggle }: {
  eqKey: ChairEquipmentKey;
  isSelected: boolean;
  readOnly?: boolean;
  onToggle?: (key: ChairEquipmentKey) => void;
}) {
  const Icon = EQUIPMENT_ICONS[eqKey];
  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={() => onToggle?.(eqKey)}
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-5 px-2 text-center transition-all ${
        isSelected
          ? 'border-neutral-900 bg-neutral-900 text-white'
          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
      } ${readOnly ? 'cursor-default' : ''}`}
    >
      <div className="relative">
        <Icon size={22} strokeWidth={1.75} />
        {isSelected && !readOnly && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-neutral-900 flex items-center justify-center">
            <Check size={10} strokeWidth={3} />
          </span>
        )}
      </div>
      <span className="text-xs font-semibold leading-tight">{CHAIR_EQUIPMENT_LABELS[eqKey]}</span>
    </button>
  );
}

/**
 * Équipements — sélection (wizard) ou affichage seul (fiche annonce).
 * En sélection : groupés par sections métier (le poste, technique, confort,
 * accès) pour que le gérant pense à tout ce qui compte VRAIMENT pour un
 * coiffeur — refonte 15/09/2026, la liste plate générique oubliait le métier.
 */
export default function EquipmentGrid({ selected, onToggle, readOnly }: Props) {
  if (readOnly) {
    if (selected.length === 0) {
      return <p className="text-sm text-neutral-400">Aucun équipement renseigné.</p>;
    }
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {selected.map((key) => (
          <Carte key={key} eqKey={key} isSelected readOnly />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {CHAIR_EQUIPMENT_GROUPS.map(({ titre, keys }) => (
        <div key={titre}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 mb-2.5">{titre}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {keys.map((key) => (
              <Carte key={key} eqKey={key} isSelected={selected.includes(key)} onToggle={onToggle} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
