'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { geo } from '@/lib/api';
import GeoListPicker from './GeoListPicker';

export interface LocationValue {
  region: string;
  department: string;
  city: string;
  street: string;
}

type Field = 'region' | 'department' | 'city' | 'street';

interface Props {
  value: LocationValue;
  onChange: (patch: Partial<LocationValue>) => void;
  /** 'dark' pour l'inscription, 'light' pour l'onboarding post-inscription */
  theme?: 'dark' | 'light';
}

function SummaryRow({ label, value, done, isDark, onOpen }: { label: string; value: string; done: boolean; isDark: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} disabled={!done} className="w-full flex items-center justify-between disabled:cursor-not-allowed">
      <div>
        <p className={`text-[10px] uppercase tracking-wide font-bold ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{label}</p>
        <p className={`text-[14px] font-semibold ${done ? (isDark ? 'text-white' : 'text-neutral-900') : (isDark ? 'text-neutral-600' : 'text-neutral-300')}`}>{value || '—'}</p>
      </div>
      {done && <Check size={16} className={isDark ? 'text-neutral-500' : 'text-neutral-400'} strokeWidth={3} />}
    </button>
  );
}

/**
 * Adresse complète sur un seul écran, façon Stripe/Airbnb : Pays (implicite,
 * une seule valeur pour l'instant) → Région → Département → Ville → Rue,
 * chaque section se replie en petite ligne une fois validée et révèle la
 * suivante — pas un écran par champ, tout reste visible de haut en bas.
 */
export default function LocationAccordion({ value, onChange, theme = 'dark' }: Props) {
  const isDark = theme === 'dark';

  const [regionsList, setRegionsList] = useState<string[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [departmentsList, setDepartmentsList] = useState<Array<{ code: string; name: string }>>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  // Champ ouvert : un vrai état, pas une valeur dérivée de la validité des
  // champs. Sinon, dès que "Ville" devient valide (2 lettres) EN PLEINE
  // FRAPPE, le champ se replierait tout seul et sauterait au suivant.
  // Il n'avance que sur une action explicite (sélection, Enter, blur).
  const [activeField, setActiveField] = useState<Field>(() =>
    !value.region ? 'region' : !value.department ? 'department' : (value.city.trim().length < 2) ? 'city' : 'street'
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRegionsLoading(true);
    geo.regions()
      .then((r) => setRegionsList(r.regions))
      .catch(() => setRegionsList([]))
      .finally(() => setRegionsLoading(false));
  }, []);

  useEffect(() => {
    if (!value.region) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDepartmentsList([]);
      return;
    }
    setDepartmentsLoading(true);
    geo.departments(value.region)
      .then((r) => setDepartmentsList(r.departments))
      .catch(() => setDepartmentsList([]))
      .finally(() => setDepartmentsLoading(false));
  }, [value.region]);

  const cityDone = value.city.trim().length >= 2;
  const active: Field = activeField;

  function selectRegion(v: string) {
    onChange({ region: v, department: '' });
    setActiveField('department');
  }
  function selectDepartment(v: string) {
    onChange({ department: v });
    setActiveField('city');
  }
  function confirmCity() {
    if (cityDone) setActiveField('street');
  }

  const eyebrowCls = `text-[10px] uppercase tracking-wide font-bold mb-2 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`;
  const summaryLabelCls = `text-[10px] uppercase tracking-wide font-bold ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`;
  const summaryValueCls = (filled: boolean) =>
    `text-[14px] font-semibold ${filled ? (isDark ? 'text-white' : 'text-neutral-900') : (isDark ? 'text-neutral-600' : 'text-neutral-300')}`;
  const rowShell = (isActive: boolean) =>
    `w-full text-left rounded-xl transition-all ${isActive ? 'p-4' : 'px-4 py-3'} ${
      isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-neutral-50 border border-transparent'
    }`;
  const inputCls = isDark
    ? 'w-full px-4 py-3.5 bg-neutral-950 border border-neutral-700 rounded-xl text-[15px] text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-400 transition-all'
    : 'w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-xl text-[15px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 transition-all';

  return (
    <div className="space-y-2">
      {/* Pays — une seule valeur possible pour l'instant, déjà confirmé */}
      <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${isDark ? 'bg-neutral-900/60' : 'bg-neutral-50'}`}>
        <div>
          <p className={summaryLabelCls}>Pays</p>
          <p className={summaryValueCls(true)}>France</p>
        </div>
        <Check size={16} className={isDark ? 'text-neutral-600' : 'text-neutral-300'} strokeWidth={3} />
      </div>

      {/* Région */}
      <div className={rowShell(active === 'region')}>
        {active === 'region' ? (
          <>
            <p className={eyebrowCls}>Région</p>
            <GeoListPicker
              items={regionsList.map((r) => ({ value: r, label: r }))}
              selected={value.region || null}
              loading={regionsLoading}
              onSelect={selectRegion}
              theme={theme}
            />
          </>
        ) : (
          <SummaryRow label="Région" value={value.region} done={!!value.region} isDark={isDark} onOpen={() => setActiveField('region')} />
        )}
      </div>

      {/* Département */}
      <div className={rowShell(active === 'department')}>
        {active === 'department' ? (
          <>
            <p className={eyebrowCls}>Département</p>
            <GeoListPicker
              items={departmentsList.map((d) => ({ value: d.name, label: d.name }))}
              selected={value.department || null}
              loading={departmentsLoading}
              onSelect={selectDepartment}
              theme={theme}
            />
          </>
        ) : (
          <SummaryRow label="Département" value={value.department} done={!!value.department} isDark={isDark} onOpen={() => setActiveField('department')} />
        )}
      </div>

      {/* Ville */}
      <div className={rowShell(active === 'city')}>
        {active === 'city' ? (
          <>
            <p className={eyebrowCls}>Ville</p>
            <input
              autoFocus
              type="text"
              value={value.city}
              onChange={(e) => onChange({ city: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmCity(); }}
              onBlur={confirmCity}
              placeholder="Ex : Strasbourg"
              className={inputCls}
            />
          </>
        ) : (
          <SummaryRow label="Ville" value={value.city} done={cityDone} isDark={isDark} onOpen={() => setActiveField('city')} />
        )}
      </div>

      {/* Rue — dernière étape, optionnelle, reste ouverte une fois atteinte */}
      <div className={rowShell(active === 'street')}>
        {active === 'street' ? (
          <>
            <p className={eyebrowCls}>Adresse <span className="normal-case font-normal opacity-60">(optionnel)</span></p>
            <input
              type="text"
              value={value.street}
              onChange={(e) => onChange({ street: e.target.value })}
              placeholder="12 rue des Tanneurs"
              className={inputCls}
            />
          </>
        ) : (
          <div className="opacity-30">
            <p className={summaryLabelCls}>Adresse</p>
            <p className={summaryValueCls(false)}>—</p>
          </div>
        )}
      </div>
    </div>
  );
}
