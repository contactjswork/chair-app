'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { geo, type CitySuggestion, type AddressSuggestion } from '@/lib/api';
import { searchCountries } from '@/lib/countries';
import GeoListPicker from './GeoListPicker';
import FieldAutocomplete from './FieldAutocomplete';

export interface LocationValue {
  country: string;
  region: string;
  department: string;
  city: string;
  street: string;
}

type Field = 'country' | 'region' | 'department' | 'city' | 'street';

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
 * Adresse complète sur un seul écran, façon Stripe/Airbnb : Pays → Région →
 * Département (France uniquement) → Ville → Rue, chaque section se replie
 * en petite ligne une fois validée et révèle la suivante — pas un écran par
 * champ, tout reste visible de haut en bas.
 *
 * Pays/Ville/Rue sont en texte libre avec suggestions (FieldAutocomplete) —
 * jamais bloqué à une liste fermée : Pays propose parmi TOUS les pays
 * (lib/countries.ts, filtrage local) mais accepte n'importe quelle saisie ;
 * Ville et Rue interrogent l'API Adresse (data.gouv.fr), Rue étant scopée à
 * la commune choisie via son code INSEE dès qu'elle est connue.
 */
export default function LocationAccordion({ value, onChange, theme = 'dark' }: Props) {
  const isDark = theme === 'dark';

  const [regionsList, setRegionsList] = useState<string[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [departmentsList, setDepartmentsList] = useState<Array<{ code: string; name: string }>>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  // Code INSEE de la ville choisie — jamais persisté (le backend ne stocke
  // que des chaînes région/département/ville/rue), utilisé uniquement pour
  // scoper la recherche de rue à CETTE commune précise.
  const [cityCode, setCityCode] = useState<string | null>(null);
  // Champ ouvert : un vrai état, pas une valeur dérivée de la validité des
  // champs. Sinon, dès que "Ville" devient valide (2 lettres) EN PLEINE
  // FRAPPE, le champ se replierait tout seul et sauterait au suivant.
  // Il n'avance que sur une action explicite (sélection, Enter, blur).
  const [activeField, setActiveField] = useState<Field>(() => {
    if (!value.country) return 'country';
    if (value.country !== 'France') return value.city.trim().length < 2 ? 'city' : 'street';
    return !value.region ? 'region' : !value.department ? 'department' : (value.city.trim().length < 2) ? 'city' : 'street';
  });

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

  function selectCountry(c: string) {
    // Changer de pays invalide région/département (propres à la France) —
    // jamais garder une région française sous un autre pays sélectionné.
    onChange({ country: c, region: '', department: '' });
    setActiveField(c === 'France' ? 'region' : 'city');
  }
  function selectRegion(v: string) {
    onChange({ region: v, department: '' });
    setActiveField('department');
  }
  function selectDepartment(v: string) {
    onChange({ department: v });
    setActiveField('city');
  }
  function selectCity(s: CitySuggestion) {
    onChange({ city: s.city });
    setCityCode(s.citycode);
    setActiveField('street');
  }
  function confirmCity() {
    // Confirmation manuelle (Entrée/blur sans avoir cliqué une suggestion) —
    // toujours possible pour une petite commune absente de l'autocomplétion.
    // On perd alors le citycode : la recherche de rue reste utilisable, juste
    // non scopée à cette commune précise.
    if (cityDone) setActiveField('street');
  }
  function selectAddress(a: AddressSuggestion) {
    onChange({ street: a.label });
    setActiveField('street');
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
      {/* Pays — texte libre, suggestions parmi tous les pays (jamais limité à une liste fermée) */}
      <div className={rowShell(active === 'country')}>
        {active === 'country' ? (
          <>
            <p className={eyebrowCls}>Pays</p>
            <FieldAutocomplete
              autoFocus
              value={value.country}
              onChange={(text) => onChange({ country: text })}
              onSelect={selectCountry}
              fetchSuggestions={(q) => searchCountries(q)}
              getKey={(c) => c}
              getLabel={(c) => c}
              minChars={1}
              placeholder="Ex : France, Belgique, Suisse…"
              className={inputCls}
              onBlur={() => { if (value.country.trim()) selectCountry(value.country.trim()); }}
              onKeyDownEnter={() => { if (value.country.trim()) selectCountry(value.country.trim()); }}
              theme={theme}
            />
          </>
        ) : (
          <SummaryRow label="Pays" value={value.country} done={!!value.country} isDark={isDark} onOpen={() => setActiveField('country')} />
        )}
      </div>

      {/* Région/Département — propres à la France, absents pour tout autre pays */}
      {value.country === 'France' && (
        <>
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
        </>
      )}

      {/* Ville — suggestions API Adresse (data.gouv.fr) */}
      <div className={rowShell(active === 'city')}>
        {active === 'city' ? (
          <>
            <p className={eyebrowCls}>Ville</p>
            <FieldAutocomplete
              autoFocus
              value={value.city}
              onChange={(text) => { onChange({ city: text }); setCityCode(null); }}
              onSelect={selectCity}
              fetchSuggestions={(q) => geo.searchCity(q).then((r) => r.results)}
              getKey={(s) => `${s.city}-${s.postcode}`}
              getLabel={(s) => s.city}
              getSublabel={(s) => s.postcode}
              minChars={2}
              placeholder="Ex : Strasbourg"
              className={inputCls}
              onBlur={confirmCity}
              onKeyDownEnter={confirmCity}
              theme={theme}
            />
          </>
        ) : (
          <SummaryRow label="Ville" value={value.city} done={cityDone} isDark={isDark} onOpen={() => setActiveField('city')} />
        )}
      </div>

      {/* Rue — dernière étape, optionnelle, reste ouverte une fois atteinte.
          Suggestions API Adresse scopées à la ville choisie (citycode) quand connu. */}
      <div className={rowShell(active === 'street')}>
        {active === 'street' ? (
          <>
            <p className={eyebrowCls}>Adresse <span className="normal-case font-normal opacity-60">(optionnel)</span></p>
            <FieldAutocomplete
              value={value.street}
              onChange={(text) => onChange({ street: text })}
              onSelect={selectAddress}
              fetchSuggestions={(q) => geo.searchAddress(q, cityCode).then((r) => r.results)}
              getKey={(a) => a.label}
              getLabel={(a) => a.label}
              minChars={3}
              placeholder="12 rue des Tanneurs"
              className={inputCls}
              theme={theme}
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
