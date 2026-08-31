'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { services as servicesApi, api } from '@/lib/api';
import type { ApiServiceCategory, ApiService, ApiSpecialty, ApiHairdresserProfile } from '@/lib/types';
import { Plus, MoreHorizontal, Trash2, Scissors, AlertTriangle, Sparkles } from 'lucide-react';
import ServiceActionsSheet from '@/components/ui/ServiceActionsSheet';

// ── Formulaire d'ajout/édition de service (spécialité déjà fixée par le contexte) ──

function ServiceForm({
  initial,
  isIndependent,
  onSave,
  onCancel,
}: {
  initial?: Partial<ApiService>;
  isIndependent: boolean;
  onSave: (data: { name: string; description: string; price: number | null; duration_minutes: number | null }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState<number | null>(
    initial?.price != null ? parseFloat(String(initial.price)) || null : null
  );
  const [duration, setDuration] = useState<number | null>(initial?.duration_minutes ?? null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (isIndependent && price === null) return;
    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        price: isIndependent ? (price ?? 0) : null,
        duration_minutes: isIndependent ? (duration ?? 30) : null,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-50 ring-1 ring-neutral-100 rounded-2xl p-4 space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom du service (ex : balayage blond, taper bas...)"
        className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-400 bg-white"
        autoFocus
        required
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optionnelle)"
        rows={2}
        className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-400 bg-white resize-none"
      />
      {isIndependent && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500 mb-1 block">Prix (€)</label>
            <input
              type="number"
              value={price ?? ''}
              onChange={(e) => { const v = parseFloat(e.target.value); setPrice(isNaN(v) ? null : v); }}
              min={0}
              step={0.5}
              placeholder="0"
              className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-400 bg-white"
              required
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500 mb-1 block">Durée</label>
            <select
              value={duration ?? 30}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-400 bg-white"
            >
              {[15, 20, 30, 45, 60, 75, 90, 120, 150, 180].map((d) => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-xl disabled:opacity-50">
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm px-4 py-2 rounded-xl border border-neutral-200">
          Annuler
        </button>
      </div>
    </form>
  );
}

// ── Ligne de service (affichage) ────────────────────────────────────────

function ServiceRow({
  svc, isIndependent, isEditing, onEdit, onCancelEdit, onSave, onToggle, onDuplicate, onMove, onDeletePermanently, specialties,
}: {
  svc: ApiService;
  isIndependent: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: { name: string; description: string; price: number | null; duration_minutes: number | null }) => Promise<void>;
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
        <ServiceForm initial={svc} isIndependent={isIndependent} onSave={onSave} onCancel={onCancelEdit} />
      </div>
    );
  }
  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${!svc.is_active ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900">{svc.name}</span>
          {!svc.is_active && (
            <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">Inactif</span>
          )}
        </div>
        {svc.description && <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{svc.description}</p>}
        {isIndependent && (
          <div className="flex items-center gap-3 mt-1">
            {svc.price != null && <span className="text-xs font-semibold text-neutral-900">{parseFloat(String(svc.price)).toFixed(0)} €</span>}
            {svc.duration_minutes != null && <span className="text-xs text-neutral-400">{svc.duration_minutes} min</span>}
            <span className="text-xs text-neutral-500">{svc.visits_count} réservation{svc.visits_count !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => setActionsOpen(true)} className="p-1.5 hover:bg-neutral-100 rounded-lg" title="Actions">
          <MoreHorizontal size={16} className="text-neutral-400" />
        </button>
      </div>
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

// ── Carte "spécialité" — photo + services nichés dessous ────────────────

function SpecialtyServiceCard({
  specialty, services, allSpecialties, isIndependent, showAddForm, onOpenAdd, onCloseAdd, onCreate,
  editingId, onEdit, onCancelEdit, onSaveEdit, onToggle, onDuplicate, onMove, onDeletePermanently, footer,
}: {
  specialty: ApiSpecialty | null;
  services: ApiService[];
  allSpecialties: ApiSpecialty[];
  isIndependent: boolean;
  showAddForm: boolean;
  onOpenAdd: () => void;
  onCloseAdd: () => void;
  onCreate: (data: { name: string; description: string; price: number | null; duration_minutes: number | null }) => Promise<void>;
  editingId: number | null;
  onEdit: (svc: ApiService) => void;
  onCancelEdit: () => void;
  onSaveEdit: (svc: ApiService, data: { name: string; description: string; price: number | null; duration_minutes: number | null }) => Promise<void>;
  onToggle: (svc: ApiService) => Promise<void>;
  onDuplicate: (svc: ApiService) => Promise<void>;
  onMove: (svc: ApiService, specialtyId: number | null) => Promise<void>;
  onDeletePermanently: (svc: ApiService) => Promise<void>;
  footer?: ReactNode;
}) {
  const label = specialty?.name ?? 'Autres services';
  return (
    <div className="bg-white rounded-[22px] shadow-[0_4px_16px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 bg-neutral-50">
        <div className="w-11 h-11 rounded-2xl overflow-hidden bg-neutral-100 flex-shrink-0 flex items-center justify-center">
          {specialty?.icon
            ? <span className="text-[20px] leading-none">{specialty.icon}</span>
            : specialty
              ? <Scissors size={18} className="text-neutral-400" strokeWidth={1.5} />
              : <Sparkles size={18} className="text-neutral-400" strokeWidth={1.5} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-neutral-900 text-sm">{label}</p>
          <p className={`text-xs ${services.length === 0 && specialty ? 'text-amber-600 font-semibold' : 'text-neutral-400'}`}>
            {services.length === 0 ? 'Aucun service' : `${services.length} service${services.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {services.length === 0 && !showAddForm && (
        <div className={`flex items-start gap-2.5 px-4 py-3 border-t ${specialty ? 'bg-amber-50/60 border-amber-100' : 'bg-neutral-50/60 border-neutral-100'}`}>
          {specialty && <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />}
          <p className={`text-[11px] leading-relaxed ${specialty ? 'text-amber-700' : 'text-neutral-500'}`}>
            {specialty
              ? 'Invisible dans les recherches tant qu\'aucun service n\'est ajouté.'
              : 'Aucune spécialité ne correspond ? Créez un service personnalisé, référencé par son nom dans la recherche.'}
          </p>
        </div>
      )}

      {services.length > 0 && (
        <div className="divide-y divide-neutral-100 border-t border-neutral-100">
          {services.map((svc) => (
            <ServiceRow
              key={svc.id}
              svc={svc}
              isIndependent={isIndependent}
              isEditing={editingId === svc.id}
              onEdit={() => onEdit(svc)}
              onCancelEdit={onCancelEdit}
              onSave={(data) => onSaveEdit(svc, data)}
              onToggle={() => onToggle(svc)}
              onDuplicate={() => onDuplicate(svc)}
              onMove={(specialtyId) => onMove(svc, specialtyId)}
              onDeletePermanently={() => onDeletePermanently(svc)}
              specialties={allSpecialties}
            />
          ))}
        </div>
      )}

      {showAddForm ? (
        <div className="border-t border-neutral-100 px-4 py-3">
          <ServiceForm isIndependent={isIndependent} onSave={onCreate} onCancel={onCloseAdd} />
        </div>
      ) : (
        <button
          onClick={onOpenAdd}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-neutral-500 hover:bg-neutral-50 border-t border-neutral-100"
        >
          <Plus size={14} />
          {specialty ? `Ajouter un service ${specialty.name.toLowerCase()}` : 'Ajouter un service personnalisé'}
        </button>
      )}

      {footer}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function DashboardServicesPage() {
  // Garde d'accès : useRequireAuth, comme toutes les autres pages pro. La garde
  // locale précédente testait `user.role !== 'hairdresser'` et renvoyait vers la
  // connexion CLIENT — un gérant double-identité passé en Mode Coiffeur
  // (role='salon_owner', has_hairdresser_profile=true) était éjecté de ses
  // propres services. hasAccess() raisonne sur la capacité, pas sur le rôle.
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const searchParams = useSearchParams();
  const specialtyParam = searchParams.get('specialty');

  const [mySpecialties, setMySpecialties] = useState<ApiSpecialty[]>([]);
  const [services, setServices] = useState<ApiService[]>([]);
  const [categories, setCategories] = useState<ApiServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [addingFor, setAddingFor] = useState<number | null>(null); // specialty id
  const [editingId, setEditingId] = useState<number | null>(null);

  const isIndependent = user?.hairdresser_profile?.is_independent ?? true;

  useEffect(() => {
    if (authLoading || !user) return;
    loadData();
  }, [authLoading, user]);

  async function loadData() {
    try {
      const [profile, svcs, cats] = await Promise.all([
        api.get<ApiHairdresserProfile>('/profile').then((r) => (r as unknown as { profile?: ApiHairdresserProfile }).profile ?? r),
        api.get<ApiService[]>('/services'),
        servicesApi.categories.list() as Promise<ApiServiceCategory[]>,
      ]);
      setMySpecialties(profile.specialties ?? []);
      setServices(svcs);
      setCategories(cats);
    } catch {
      setError('Impossible de charger les services.');
    } finally {
      setLoading(false);
    }
  }

  // Arrivée depuis la home avec ?specialty=<id> — ouvre directement le formulaire d'ajout.
  const nudgeHandled = useRef(false);
  useEffect(() => {
    if (!specialtyParam || loading || nudgeHandled.current) return;
    const id = Number(specialtyParam);
    if (!mySpecialties.some((s) => s.id === id)) return;
    nudgeHandled.current = true;
    setAddingFor(id);
  }, [specialtyParam, loading, mySpecialties]);

  async function ensureCategoryForSpecialty(specialty: ApiSpecialty): Promise<number> {
    const existing = categories.find((c) => c.name === specialty.name);
    if (existing) return existing.id;
    const cat = await servicesApi.categories.create({ name: specialty.name }) as ApiServiceCategory;
    setCategories((prev) => [...prev, cat]);
    return cat.id;
  }

  async function handleCreate(specialty: ApiSpecialty, data: { name: string; description: string; price: number | null; duration_minutes: number | null }) {
    const categoryId = await ensureCategoryForSpecialty(specialty);
    const svc = await servicesApi.items.create({ ...data, category_id: categoryId, specialty_id: specialty.id }) as ApiService;
    setServices((prev) => [...prev, svc]);
    setAddingFor(null);
  }

  const OTHER_CATEGORY_NAME = 'Autres services';

  async function ensureOtherCategory(): Promise<number> {
    const existing = categories.find((c) => c.name === OTHER_CATEGORY_NAME);
    if (existing) return existing.id;
    const cat = await servicesApi.categories.create({ name: OTHER_CATEGORY_NAME }) as ApiServiceCategory;
    setCategories((prev) => [...prev, cat]);
    return cat.id;
  }

  async function handleCreateOrphan(data: { name: string; description: string; price: number | null; duration_minutes: number | null }) {
    const categoryId = await ensureOtherCategory();
    const svc = await servicesApi.items.create({ ...data, category_id: categoryId, specialty_id: null }) as ApiService;
    setServices((prev) => [...prev, svc]);
    setAddingFor(null);
  }

  async function handleSaveEdit(svc: ApiService, data: { name: string; description: string; price: number | null; duration_minutes: number | null }) {
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
        <div className="animate-pulse text-neutral-400 text-sm">Chargement...</div>
      </div>
    );
  }

  const orphanServices = services.filter((s) => !s.specialty_id || !mySpecialties.some((sp) => sp.id === s.specialty_id));
  // Catégories héritées d'une spécialité désélectionnée — proposées à la suppression.
  // La catégorie "Autres services" est exclue : elle est intentionnelle (services personnalisés).
  const staleCategoryIds = new Set(
    orphanServices
      .map((s) => s.category_id)
      .filter((catId) => categories.find((c) => c.id === catId)?.name !== OTHER_CATEGORY_NAME)
  );

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="px-4 pt-4">
        <DashboardPageHeader title="Mes services" />
      </div>
      <p className="px-4 pt-1 pb-2 text-[12px] text-neutral-400 leading-relaxed">
        Un service détaillé par spécialité vous rend visible dans les recherches précises.
      </p>

      {error && (
        <div className="mx-4 mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      <div className="px-4 space-y-4">
        {mySpecialties.length === 0 && (
          <div className="text-center py-8 px-6 bg-neutral-50 rounded-[20px]">
            <p className="text-neutral-500 text-sm leading-relaxed">
              Aucune spécialité sélectionnée — choisissez-les depuis votre profil, ou ajoutez un service personnalisé ci-dessous.
            </p>
          </div>
        )}

        {mySpecialties.map((sp) => (
          <SpecialtyServiceCard
            key={sp.id}
            specialty={sp}
            services={services.filter((s) => s.specialty_id === sp.id)}
            allSpecialties={mySpecialties}
            isIndependent={isIndependent}
            showAddForm={addingFor === sp.id}
            onOpenAdd={() => setAddingFor(sp.id)}
            onCloseAdd={() => setAddingFor(null)}
            onCreate={(data) => handleCreate(sp, data)}
            editingId={editingId}
            onEdit={(svc) => setEditingId(svc.id)}
            onCancelEdit={() => setEditingId(null)}
            onSaveEdit={handleSaveEdit}
            onToggle={handleToggle}
            onDuplicate={handleDuplicate}
            onMove={handleMove}
            onDeletePermanently={handleDeletePermanently}
          />
        ))}

        {/* Autres services — sans spécialité rattachée (personnalisés, ou hérités d'une spécialité désélectionnée) */}
        <SpecialtyServiceCard
          specialty={null}
          services={orphanServices}
          allSpecialties={mySpecialties}
          isIndependent={isIndependent}
          showAddForm={addingFor === -1}
          onOpenAdd={() => setAddingFor(-1)}
          onCloseAdd={() => setAddingFor(null)}
          onCreate={handleCreateOrphan}
          editingId={editingId}
          onEdit={(svc) => setEditingId(svc.id)}
          onCancelEdit={() => setEditingId(null)}
          onSaveEdit={handleSaveEdit}
          onToggle={handleToggle}
          onDuplicate={handleDuplicate}
          onMove={handleMove}
          onDeletePermanently={handleDeletePermanently}
          footer={staleCategoryIds.size > 0 && (
            <div className="px-4 py-2.5 border-t border-neutral-100">
              {Array.from(staleCategoryIds).map((catId) => (
                <button
                  key={catId}
                  onClick={() => handleDeleteOrphanCategory(catId)}
                  className="flex items-center gap-1.5 text-[11px] text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={11} />
                  Supprimer la catégorie &quot;{categories.find((c) => c.id === catId)?.name}&quot;
                </button>
              ))}
            </div>
          )}
        />
      </div>

    </div>
  );
}
