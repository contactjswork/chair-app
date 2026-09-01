'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import BottomSheet from '@/components/ui/BottomSheet';
import { services as servicesApi, api } from '@/lib/api';
import type { ApiServiceCategory, ApiService, ApiSpecialty, ApiHairdresserProfile } from '@/lib/types';
import { SPECIALTY_ILLUSTRATIONS } from '@/lib/specialties';
import { suggestionsFor, type ServiceSuggestion } from '@/lib/serviceSuggestions';
import { Plus, MoreHorizontal, Trash2, Scissors, Sparkles, Check } from 'lucide-react';
import ServiceActionsSheet from '@/components/ui/ServiceActionsSheet';

/**
 * Mes services — refonte complète du parcours de création.
 *
 * L'ancien écran posait un champ « Nom du service » vide sous chaque
 * spécialité : le coiffeur ne savait ni quoi écrire, ni à quelle
 * granularité, ni pourquoi les deux notions coexistent. Trois réponses :
 *
 *  1. La règle du jeu est écrite en tête : la spécialité dit ce que vous
 *     savez faire, le service est ce que le client réserve (prix, durée).
 *  2. La création passe par une feuille guidée : spécialité → services
 *     SUGGÉRÉS du métier (nom + durée pré-remplis, lib/serviceSuggestions)
 *     → il ne reste qu'à poser son prix. Le champ libre reste là pour le
 *     reste.
 *  3. Une spécialité sans service affiche directement ses suggestions en
 *     un geste — c'est l'état vide qui travaille, pas un avertissement.
 *
 * La tuyauterie (catégories miroirs, CRUD) est inchangée — seule
 * l'expérience de création change.
 */

// Jusqu'à 8 h — le backend accepte 5-480 min, c'est le coiffeur qui sait
// combien dure SA prestation (retour Julien : plus de plafond à 3 h).
const DUREES = [15, 20, 30, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300, 360, 420, 480];

interface ServiceDraft {
  name: string;
  description: string;
  price: number | null;
  duration_minutes: number | null;
}

function dureeLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r === 0 ? `${h} h` : `${h} h ${r.toString().padStart(2, '0')}`;
}

function SpecialtyThumb({ specialty, size = 24 }: { specialty: ApiSpecialty; size?: number }) {
  const photo = specialty.image_url;
  const illustration = SPECIALTY_ILLUSTRATIONS[specialty.slug];
  return (
    <span className="relative rounded-full overflow-hidden bg-neutral-100 flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      {photo ? (
        <Image src={photo} alt="" fill className="object-cover" sizes={`${size}px`} />
      ) : illustration ? (
        <Image src={illustration} alt="" fill className="object-contain mix-blend-multiply" sizes={`${size}px`} />
      ) : (
        <Scissors size={size * 0.45} className="text-neutral-400" />
      )}
    </span>
  );
}

// ── Feuille de création guidée ───────────────────────────────────────────

function AddServiceSheet({
  specialties, services, isIndependent, initialSpecialtyId, initialSuggestion, onClose, onCreate,
}: {
  specialties: ApiSpecialty[];
  services: ApiService[];
  isIndependent: boolean;
  initialSpecialtyId: number | null;
  initialSuggestion: ServiceSuggestion | null;
  onClose: () => void;
  onCreate: (specialtyId: number | null, data: ServiceDraft) => Promise<void>;
}) {
  const [specialtyId, setSpecialtyId] = useState<number | null>(initialSpecialtyId);
  const [name, setName]               = useState(initialSuggestion?.name ?? '');
  const [price, setPrice]             = useState<number | null>(null);
  const [duration, setDuration]       = useState<number | null>(initialSuggestion?.duration ?? null);
  const [description, setDescription] = useState('');
  const [avecDescription, setAvecDescription] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [erreur, setErreur]           = useState('');

  const specialite = specialties.find((s) => s.id === specialtyId) ?? null;

  // Suggestions restantes : celles déjà en ligne pour cette spécialité
  // disparaissent de la liste (inutile de proposer deux fois « Coupe homme »).
  const dejaPris = useMemo(
    () => new Set(services.filter((s) => s.specialty_id === specialtyId).map((s) => s.name.toLowerCase())),
    [services, specialtyId]
  );
  const suggestions = suggestionsFor(specialite?.slug).filter((s) => !dejaPris.has(s.name.toLowerCase()));

  function choisirSuggestion(s: ServiceSuggestion) {
    setName(s.name);
    setDuration(s.duration);
  }

  async function valider() {
    if (!name.trim()) { setErreur('Donnez un nom au service.'); return; }
    if (isIndependent && (price === null || price <= 0)) { setErreur('Indiquez le prix — c’est lui que voient les clients.'); return; }
    setSaving(true); setErreur('');
    try {
      await onCreate(specialtyId, {
        name: name.trim(),
        description: description.trim(),
        price: isIndependent ? price : null,
        duration_minutes: isIndependent ? (duration ?? 30) : null,
      });
      onClose();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Impossible d’ajouter le service.');
      setSaving(false);
    }
  }

  const nomChoisi = name.trim().length > 0;

  return (
    <BottomSheet onClose={onClose} maxHeight="max-h-[92vh]">
      <div className="px-5 pb-safe-5">
        <p className="text-[20px] font-bold text-neutral-900">Nouveau service</p>
        <p className="text-[12px] text-neutral-400 mt-0.5 mb-4">
          Ce que le client verra et réservera{isIndependent ? ' — avec le prix et la durée' : ''}.
        </p>

        {/* 1. La spécialité (rattachement pour la recherche et le classement). */}
        <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-neutral-400 mb-2">Spécialité</p>
        <div className="flex gap-2 overflow-x-auto py-1 -mx-5 px-5 mb-4">
          {specialties.map((sp) => (
            <button key={sp.id}
              onClick={() => { setSpecialtyId(sp.id); }}
              className={`relative before:absolute before:-inset-y-[4px] before:inset-x-0 before:content-[''] flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full border whitespace-nowrap transition-all flex-shrink-0 ${
                specialtyId === sp.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
              }`}>
              <SpecialtyThumb specialty={sp} size={26} />
              <span className="text-[13px] font-semibold">{sp.name}</span>
            </button>
          ))}
          <button
            onClick={() => setSpecialtyId(null)}
            className={`relative before:absolute before:-inset-y-[4px] before:inset-x-0 before:content-[''] px-3.5 py-1.5 rounded-full border text-[13px] font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              specialtyId === null ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'
            }`}>
            Autre
          </button>
        </div>

        {/* 2. Les suggestions du métier — un geste, il ne reste que le prix. */}
        {suggestions.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-neutral-400 mb-2">Suggestions</p>
            <div className="flex flex-wrap gap-x-1.5 gap-y-2.5">
              {suggestions.map((s) => {
                const actif = name === s.name;
                return (
                  <button key={s.name} onClick={() => choisirSuggestion(s)}
                    className={`relative before:absolute before:-inset-y-[5px] before:inset-x-0 before:content-[''] px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${
                      actif ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-neutral-50 text-neutral-600 border-neutral-100 hover:border-neutral-300'
                    }`}>
                    {actif && <Check size={12} className="inline mr-1 -mt-0.5" />}
                    {s.name} <span className={actif ? 'text-white/50' : 'text-neutral-400'}>· {dureeLabel(s.duration)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Le nom (pré-rempli par la suggestion, libre sinon). */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={suggestions.length > 0 ? 'Ou écrivez le vôtre…' : 'Nom du service (ex : balayage blond)'}
          className="w-full bg-neutral-50 ring-1 ring-neutral-100 rounded-xl px-4 py-3 text-[16px] focus:outline-none focus:ring-neutral-300 transition-all placeholder:text-neutral-300 mb-3"
        />

        {isIndependent && (
          <>
            {/* 4. Le prix — le seul champ qui reste vraiment à remplir. */}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  inputMode="decimal"
                  value={price ?? ''}
                  onChange={(e) => { const v = parseFloat(e.target.value); setPrice(isNaN(v) ? null : v); }}
                  min={0}
                  step={0.5}
                  placeholder="Prix"
                  className="w-full bg-neutral-50 ring-1 ring-neutral-100 rounded-xl pl-4 pr-9 py-3 text-[16px] font-semibold tabular-nums focus:outline-none focus:ring-neutral-300 transition-all placeholder:text-neutral-300 placeholder:font-normal"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-neutral-400">€</span>
              </div>
              <select
                value={duration ?? 30}
                onChange={(e) => setDuration(Number(e.target.value))}
                aria-label="Durée"
                className="flex-1 bg-neutral-50 ring-1 ring-neutral-100 rounded-xl px-4 py-3 text-[16px] focus:outline-none focus:ring-neutral-300 transition-all appearance-none"
              >
                {DUREES.map((d) => <option key={d} value={d}>{dureeLabel(d)}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Description : optionnelle, donc repliée. */}
        {avecDescription ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ce que le service comprend, pour qui…"
            rows={2}
            autoFocus
            className="w-full bg-neutral-50 ring-1 ring-neutral-100 rounded-xl px-4 py-3 text-[16px] focus:outline-none focus:ring-neutral-300 transition-all placeholder:text-neutral-300 resize-none mb-3"
          />
        ) : (
          <button onClick={() => setAvecDescription(true)}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-neutral-400 hover:text-neutral-700 transition-colors mb-3 py-1">
            <Plus size={13} /> Ajouter une description
          </button>
        )}

        {erreur && <p className="text-[12px] font-semibold text-red-600 mb-3">{erreur}</p>}

        <button
          onClick={valider}
          disabled={saving || !nomChoisi}
          className="w-full py-3.5 rounded-2xl bg-neutral-900 text-white text-[15px] font-bold disabled:opacity-40 hover:bg-neutral-700 transition-colors"
        >
          {saving ? 'Ajout…' : nomChoisi ? `Ajouter « ${name.trim()} »` : 'Ajouter le service'}
        </button>
        <p className="text-[11px] text-neutral-400 leading-snug mt-2.5 text-center">
          Visible immédiatement sur votre page publique{specialite ? ` et dans les recherches « ${specialite.name} »` : ''}.
        </p>
      </div>
    </BottomSheet>
  );
}

// ── Édition en place (nom, prix, durée, description) ─────────────────────

function EditServiceForm({ svc, isIndependent, onSave, onCancel }: {
  svc: ApiService;
  isIndependent: boolean;
  onSave: (data: ServiceDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(svc.name);
  const [description, setDescription] = useState(svc.description ?? '');
  const [price, setPrice] = useState<number | null>(svc.price != null ? parseFloat(String(svc.price)) || null : null);
  const [duration, setDuration] = useState<number | null>(svc.duration_minutes ?? null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (isIndependent && price === null) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        price: isIndependent ? (price ?? 0) : null,
        duration_minutes: isIndependent ? (duration ?? 30) : null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-neutral-50 ring-1 ring-neutral-100 rounded-2xl p-4 space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required
        className="w-full bg-white ring-1 ring-neutral-200 rounded-xl px-4 py-2.5 text-[16px] focus:outline-none focus:ring-neutral-400 transition-all" />
      {isIndependent && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input type="number" inputMode="decimal" value={price ?? ''} min={0} step={0.5} required
              onChange={(e) => { const v = parseFloat(e.target.value); setPrice(isNaN(v) ? null : v); }}
              className="w-full bg-white ring-1 ring-neutral-200 rounded-xl pl-4 pr-9 py-2.5 text-[16px] tabular-nums focus:outline-none focus:ring-neutral-400 transition-all" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-neutral-400">€</span>
          </div>
          <select value={duration ?? 30} onChange={(e) => setDuration(Number(e.target.value))} aria-label="Durée"
            className="flex-1 bg-white ring-1 ring-neutral-200 rounded-xl px-4 py-2.5 text-[16px] focus:outline-none focus:ring-neutral-400 transition-all appearance-none">
            {DUREES.map((d) => <option key={d} value={d}>{dureeLabel(d)}</option>)}
          </select>
        </div>
      )}
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
        placeholder="Description (optionnelle)"
        className="w-full bg-white ring-1 ring-neutral-200 rounded-xl px-4 py-2.5 text-[16px] focus:outline-none focus:ring-neutral-400 transition-all resize-none placeholder:text-neutral-300" />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-neutral-500 bg-white ring-1 ring-neutral-200 hover:bg-neutral-100 transition-colors">
          Annuler
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-700 transition-colors disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

// ── Ligne de service ─────────────────────────────────────────────────────

function ServiceRow({ svc, isIndependent, isEditing, onEdit, onCancelEdit, onSave, onToggle, onDuplicate, onMove, onDeletePermanently, specialties }: {
  svc: ApiService;
  isIndependent: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: ServiceDraft) => Promise<void>;
  onToggle: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onMove: (specialtyId: number | null) => Promise<void>;
  onDeletePermanently: () => Promise<void>;
  specialties: ApiSpecialty[];
}) {
  const [actionsOpen, setActionsOpen] = useState(false);

  if (isEditing) {
    return (
      <div className="px-4 py-3">
        <EditServiceForm svc={svc} isIndependent={isIndependent} onSave={onSave} onCancel={onCancelEdit} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${!svc.is_active ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-neutral-900 truncate">{svc.name}</span>
          {!svc.is_active && (
            <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full flex-shrink-0">Masqué</span>
          )}
        </div>
        {svc.description && <p className="text-[12px] text-neutral-400 mt-0.5 line-clamp-1">{svc.description}</p>}
        {isIndependent && (
          <p className="text-[12px] text-neutral-400 mt-0.5">
            {svc.duration_minutes != null && dureeLabel(svc.duration_minutes)}
            {svc.visits_count > 0 && ` · ${svc.visits_count} réservation${svc.visits_count > 1 ? 's' : ''}`}
          </p>
        )}
      </div>
      {isIndependent && svc.price != null && (
        <span className="text-[15px] font-bold text-neutral-900 tabular-nums flex-shrink-0">
          {parseFloat(String(svc.price)).toFixed(0)} €
        </span>
      )}
      <button onClick={() => setActionsOpen(true)} aria-label="Actions du service"
        className="relative before:absolute before:-inset-2 before:content-[''] p-1.5 hover:bg-neutral-100 rounded-lg flex-shrink-0">
        <MoreHorizontal size={16} className="text-neutral-400" />
      </button>
      <ServiceActionsSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        service={svc}
        specialties={specialties}
        onEdit={onEdit}
        onToggle={onToggle}
        onDuplicate={onDuplicate}
        onMove={onMove}
        onDeletePermanently={onDeletePermanently}
      />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function DashboardServicesPage() {
  // useRequireAuth : capacité, pas rôle — un gérant double-identité en Mode
  // Coiffeur garde l'accès à ses propres services.
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const searchParams = useSearchParams();
  const specialtyParam = searchParams.get('specialty');

  const [mySpecialties, setMySpecialties] = useState<ApiSpecialty[]>([]);
  const [services, setServices] = useState<ApiService[]>([]);
  const [categories, setCategories] = useState<ApiServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sheet, setSheet] = useState<{ specialtyId: number | null; suggestion: ServiceSuggestion | null } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const isIndependent = user?.hairdresser_profile?.is_independent ?? true;

  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([
      api.get<ApiHairdresserProfile>('/profile').then((r) => (r as unknown as { profile?: ApiHairdresserProfile }).profile ?? r),
      api.get<ApiService[]>('/services'),
      servicesApi.categories.list() as Promise<ApiServiceCategory[]>,
    ])
      .then(([profile, svcs, cats]) => {
        setMySpecialties(profile.specialties ?? []);
        setServices(svcs);
        setCategories(cats);
      })
      .catch(() => setError('Impossible de charger les services.'))
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  // Arrivée depuis la home avec ?specialty=<id> — ouvre la feuille pré-réglée.
  const nudgeHandled = useRef(false);
  useEffect(() => {
    if (!specialtyParam || loading || nudgeHandled.current) return;
    const id = Number(specialtyParam);
    if (!mySpecialties.some((s) => s.id === id)) return;
    nudgeHandled.current = true;
    // Différé d'un tick : ouvrir une feuille pendant le rendu de l'effet
    // déclenche une cascade de rendus (règle react-hooks/set-state-in-effect).
    const t = setTimeout(() => setSheet({ specialtyId: id, suggestion: null }), 0);
    return () => clearTimeout(t);
  }, [specialtyParam, loading, mySpecialties]);

  // ── Catégories miroirs (tuyauterie héritée, inchangée) ──
  const OTHER_CATEGORY_NAME = 'Autres services';

  async function ensureCategory(name: string): Promise<number> {
    const existing = categories.find((c) => c.name === name);
    if (existing) return existing.id;
    const cat = await servicesApi.categories.create({ name }) as ApiServiceCategory;
    setCategories((prev) => [...prev, cat]);
    return cat.id;
  }

  async function handleCreate(specialtyId: number | null, data: ServiceDraft) {
    const specialty = mySpecialties.find((s) => s.id === specialtyId) ?? null;
    const categoryId = await ensureCategory(specialty?.name ?? OTHER_CATEGORY_NAME);
    const svc = await servicesApi.items.create({ ...data, category_id: categoryId, specialty_id: specialty?.id ?? null }) as ApiService;
    setServices((prev) => [...prev, svc]);
  }

  async function handleSaveEdit(svc: ApiService, data: ServiceDraft) {
    const updated = await servicesApi.items.update(svc.id, data) as ApiService;
    setServices((prev) => prev.map((s) => (s.id === svc.id ? updated : s)));
    setEditingId(null);
  }

  async function handleToggle(svc: ApiService) {
    const updated = await servicesApi.items.update(svc.id, { is_active: !svc.is_active }) as ApiService;
    setServices((prev) => prev.map((s) => (s.id === svc.id ? updated : s)));
  }

  async function handleDuplicate(svc: ApiService) {
    const copy = await servicesApi.items.duplicate(svc.id) as ApiService;
    setServices((prev) => [...prev, copy]);
  }

  async function handleMove(svc: ApiService, specialtyId: number | null) {
    const updated = await servicesApi.items.update(svc.id, { specialty_id: specialtyId }) as ApiService;
    setServices((prev) => prev.map((s) => (s.id === svc.id ? updated : s)));
  }

  async function handleDeletePermanently(svc: ApiService) {
    await servicesApi.items.deletePermanently(svc.id); // rejette avec un message clair si des RDV sont liés
    setServices((prev) => prev.filter((s) => s.id !== svc.id));
  }

  async function handleDeleteOrphanCategory(id: number) {
    if (!confirm('Supprimer cette catégorie et tous ses services ?')) return;
    try {
      await servicesApi.categories.delete(id);
      setServices((prev) => prev.filter((s) => s.category_id !== id));
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const orphanServices = services.filter((s) => !s.specialty_id || !mySpecialties.some((sp) => sp.id === s.specialty_id));
  const staleCategoryIds = new Set(
    orphanServices
      .map((s) => s.category_id)
      .filter((catId) => categories.find((c) => c.id === catId)?.name !== OTHER_CATEGORY_NAME)
  );

  const rowProps = {
    isIndependent,
    onCancelEdit: () => setEditingId(null),
    specialties: mySpecialties,
  };

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-4">
        <DashboardPageHeader title="Mes services" />

        {/* La règle du jeu, une fois pour toutes. */}
        <div className="mt-1 mb-4 rounded-[20px] bg-neutral-50 px-4 py-3.5">
          <p className="text-[13px] text-neutral-600 leading-relaxed">
            <span className="font-bold text-neutral-900">Vos spécialités</span> disent ce que vous savez faire.{' '}
            <span className="font-bold text-neutral-900">Vos services</span> sont ce que les clients réservent
            {isIndependent ? ' — un nom précis, un prix, une durée.' : ' — un nom précis.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <button
          onClick={() => setSheet({ specialtyId: mySpecialties[0]?.id ?? null, suggestion: null })}
          className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white py-3.5 rounded-2xl font-bold text-[15px] hover:bg-neutral-700 transition-colors mb-5"
        >
          <Plus size={16} /> Ajouter un service
        </button>

        <div className="space-y-4">
          {mySpecialties.length === 0 && (
            <div className="text-center py-8 px-6 bg-neutral-50 rounded-[20px]">
              <p className="text-neutral-500 text-sm leading-relaxed">
                Aucune spécialité sélectionnée — choisissez-les depuis votre profil,
                ou ajoutez un service libre avec le bouton ci-dessus.
              </p>
            </div>
          )}

          {mySpecialties.map((sp) => {
            const spServices = services.filter((s) => s.specialty_id === sp.id);
            const dejaPris = new Set(spServices.map((s) => s.name.toLowerCase()));
            const propositions = suggestionsFor(sp.slug).filter((s) => !dejaPris.has(s.name.toLowerCase())).slice(0, 3);
            return (
              <div key={sp.id} className="bg-white rounded-[22px] shadow-[0_4px_16px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3.5 bg-neutral-50">
                  <SpecialtyThumb specialty={sp} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutral-900 text-[14px]">{sp.name}</p>
                    <p className={`text-[12px] ${spServices.length === 0 ? 'text-amber-600 font-semibold' : 'text-neutral-400'}`}>
                      {spServices.length === 0
                        ? 'Invisible dans les recherches sans service'
                        : `${spServices.length} service${spServices.length > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setSheet({ specialtyId: sp.id, suggestion: null })}
                    aria-label={`Ajouter un service ${sp.name}`}
                    className="relative before:absolute before:-inset-1.5 before:content-[''] w-8 h-8 rounded-full bg-white ring-1 ring-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-900 hover:text-white hover:ring-neutral-900 transition-colors flex-shrink-0"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {spServices.length > 0 && (
                  <div className="divide-y divide-neutral-50 border-t border-neutral-50">
                    {spServices.map((svc) => (
                      <ServiceRow key={svc.id} svc={svc} {...rowProps}
                        isEditing={editingId === svc.id}
                        onEdit={() => setEditingId(svc.id)}
                        onSave={(data) => handleSaveEdit(svc, data)}
                        onToggle={() => handleToggle(svc)}
                        onDuplicate={() => handleDuplicate(svc)}
                        onMove={(sid) => handleMove(svc, sid)}
                        onDeletePermanently={() => handleDeletePermanently(svc)}
                      />
                    ))}
                  </div>
                )}

                {/* L'état vide travaille : les services du métier, un geste chacun. */}
                {propositions.length > 0 && (
                  <div className="border-t border-neutral-50 px-4 py-3">
                    <div className="flex flex-wrap gap-x-1.5 gap-y-2.5">
                      {propositions.map((s) => (
                        <button key={s.name}
                          onClick={() => setSheet({ specialtyId: sp.id, suggestion: s })}
                          className="relative before:absolute before:-inset-y-[5px] before:inset-x-0 before:content-[''] flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-50 text-[12px] font-semibold text-neutral-600 ring-1 ring-neutral-100 hover:ring-neutral-300 transition-all"
                        >
                          <Plus size={11} className="text-neutral-400" />
                          {s.name} <span className="text-neutral-400">· {dureeLabel(s.duration)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Services sans spécialité (personnalisés ou hérités). */}
          {orphanServices.length > 0 && (
            <div className="bg-white rounded-[22px] shadow-[0_4px_16px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5 bg-neutral-50">
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={16} className="text-neutral-400" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-neutral-900 text-[14px]">Autres services</p>
                  <p className="text-[12px] text-neutral-400">Sans spécialité — trouvés par leur nom dans la recherche</p>
                </div>
                <button
                  onClick={() => setSheet({ specialtyId: null, suggestion: null })}
                  aria-label="Ajouter un service libre"
                  className="relative before:absolute before:-inset-1.5 before:content-[''] w-8 h-8 rounded-full bg-white ring-1 ring-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-900 hover:text-white hover:ring-neutral-900 transition-colors flex-shrink-0"
                >
                  <Plus size={15} />
                </button>
              </div>
              <div className="divide-y divide-neutral-50 border-t border-neutral-50">
                {orphanServices.map((svc) => (
                  <ServiceRow key={svc.id} svc={svc} {...rowProps}
                    isEditing={editingId === svc.id}
                    onEdit={() => setEditingId(svc.id)}
                    onSave={(data) => handleSaveEdit(svc, data)}
                    onToggle={() => handleToggle(svc)}
                    onDuplicate={() => handleDuplicate(svc)}
                    onMove={(sid) => handleMove(svc, sid)}
                    onDeletePermanently={() => handleDeletePermanently(svc)}
                  />
                ))}
              </div>
              {staleCategoryIds.size > 0 && (
                <div className="px-4 py-2.5 border-t border-neutral-50">
                  {Array.from(staleCategoryIds).map((catId) => (
                    <button
                      key={catId}
                      onClick={() => handleDeleteOrphanCategory(catId)}
                      className="relative before:absolute before:-inset-y-[13px] before:inset-x-0 before:content-[''] flex items-center gap-1.5 text-[11px] text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={11} />
                      Supprimer la catégorie &quot;{categories.find((c) => c.id === catId)?.name}&quot;
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {sheet && (
        <AddServiceSheet
          specialties={mySpecialties}
          services={services}
          isIndependent={isIndependent}
          initialSpecialtyId={sheet.specialtyId}
          initialSuggestion={sheet.suggestion}
          onClose={() => setSheet(null)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
