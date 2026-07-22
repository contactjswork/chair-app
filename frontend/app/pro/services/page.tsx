'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { services as servicesApi, api } from '@/lib/api';
import type { ApiServiceCategory, ApiService, ApiSpecialty, ApiHairdresserProfile } from '@/lib/types';
import { Plus, Pencil, Trash2, Eye, EyeOff, Scissors, AlertTriangle } from 'lucide-react';

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
    <form onSubmit={handleSubmit} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom du service (ex : Balayage blond, Taper Bas...)"
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
  svc, isIndependent, isEditing, onEdit, onCancelEdit, onSave, onToggle,
}: {
  svc: ApiService;
  isIndependent: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: { name: string; description: string; price: number | null; duration_minutes: number | null }) => Promise<void>;
  onToggle: () => void;
}) {
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
            <span className="text-xs text-neutral-300">{svc.visits_count} réservation{svc.visits_count !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onToggle} className="p-1.5 hover:bg-neutral-100 rounded-lg" title={svc.is_active ? 'Désactiver' : 'Activer'}>
          {svc.is_active ? <Eye size={14} className="text-neutral-400" /> : <EyeOff size={14} className="text-neutral-400" />}
        </button>
        <button onClick={onEdit} className="p-1.5 hover:bg-neutral-100 rounded-lg">
          <Pencil size={14} className="text-neutral-400" />
        </button>
      </div>
    </div>
  );
}

// ── Carte "spécialité" — photo + services nichés dessous ────────────────

function SpecialtyServiceCard({
  specialty, services, isIndependent, showAddForm, onOpenAdd, onCloseAdd, onCreate,
  editingId, onEdit, onCancelEdit, onSaveEdit, onToggle,
}: {
  specialty: ApiSpecialty;
  services: ApiService[];
  isIndependent: boolean;
  showAddForm: boolean;
  onOpenAdd: () => void;
  onCloseAdd: () => void;
  onCreate: (data: { name: string; description: string; price: number | null; duration_minutes: number | null }) => Promise<void>;
  editingId: number | null;
  onEdit: (svc: ApiService) => void;
  onCancelEdit: () => void;
  onSaveEdit: (svc: ApiService, data: { name: string; description: string; price: number | null; duration_minutes: number | null }) => Promise<void>;
  onToggle: (svc: ApiService) => void;
}) {
  return (
    <div className="border border-neutral-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 bg-neutral-50">
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0 flex items-center justify-center">
          {specialty.icon
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={specialty.icon} alt={specialty.name} className="w-full h-full object-cover" />
            : <Scissors size={18} className="text-neutral-400" strokeWidth={1.5} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-neutral-900 text-sm">{specialty.name}</p>
          <p className={`text-xs ${services.length === 0 ? 'text-amber-600 font-semibold' : 'text-neutral-400'}`}>
            {services.length === 0 ? 'Aucun service' : `${services.length} service${services.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {services.length === 0 && !showAddForm && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50/60 border-t border-amber-100">
          <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 leading-relaxed">
            Cette spécialité reste invisible dans les recherches précises tant qu&apos;aucun service n&apos;y est rattaché.
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
          Ajouter un service {specialty.name.toLowerCase()}
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function DashboardServicesPage() {
  const { user } = useAuth();
  const router = useRouter();
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
    if (user === undefined) return;
    if (!user || user.role !== 'hairdresser') {
      router.push('/connexion');
      return;
    }
    loadData();
  }, [user, router]);

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

  async function handleSaveEdit(svc: ApiService, data: { name: string; description: string; price: number | null; duration_minutes: number | null }) {
    const updated = await servicesApi.items.update(svc.id, data) as ApiService;
    setServices((prev) => prev.map((s) => (s.id === svc.id ? updated : s)));
    setEditingId(null);
  }

  async function handleToggle(svc: ApiService) {
    const updated = await servicesApi.items.update(svc.id, { is_active: !svc.is_active }) as ApiService;
    setServices((prev) => prev.map((s) => (s.id === svc.id ? updated : s)));
  }

  async function handleDeleteOrphanCategory(id: number) {
    if (!confirm('Supprimer cette catégorie et tous ses services ?')) return;
    await servicesApi.categories.delete(id);
    setServices((prev) => prev.filter((s) => s.category_id !== id));
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-neutral-400 text-sm">Chargement...</div>
      </div>
    );
  }

  const orphanServices = services.filter((s) => !s.specialty_id || !mySpecialties.some((sp) => sp.id === s.specialty_id));
  const orphanCategoryIds = new Set(orphanServices.map((s) => s.category_id));

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="px-4 pt-4">
        <DashboardPageHeader title="Mes services" />
      </div>
      <p className="px-4 pt-1 pb-2 text-[12px] text-neutral-400 leading-relaxed">
        Un service détaillé dans chaque spécialité vous rend visible dans des recherches précises, pas juste générales.
      </p>

      {error && (
        <div className="mx-4 mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      <div className="px-4 space-y-4">
        {mySpecialties.length === 0 && (
          <div className="text-center py-12 border border-dashed border-neutral-200 rounded-xl">
            <p className="text-neutral-500 text-sm mb-1">Aucune spécialité sélectionnée</p>
            <p className="text-neutral-400 text-xs mb-4 px-6 leading-relaxed">
              Choisissez d&apos;abord vos spécialités depuis votre profil pour pouvoir y rattacher des services.
            </p>
          </div>
        )}

        {mySpecialties.map((sp) => (
          <SpecialtyServiceCard
            key={sp.id}
            specialty={sp}
            services={services.filter((s) => s.specialty_id === sp.id)}
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
          />
        ))}

        {/* Services orphelins — pas (ou plus) rattachés à une spécialité active */}
        {orphanServices.length > 0 && (
          <div className="border border-neutral-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3.5 bg-neutral-50">
              <p className="font-bold text-neutral-900 text-sm">Autres services</p>
              <p className="text-xs text-neutral-400">Non rattachés à une spécialité active</p>
            </div>
            <div className="divide-y divide-neutral-100 border-t border-neutral-100">
              {orphanServices.map((svc) => (
                <ServiceRow
                  key={svc.id}
                  svc={svc}
                  isIndependent={isIndependent}
                  isEditing={editingId === svc.id}
                  onEdit={() => setEditingId(svc.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(data) => handleSaveEdit(svc, data)}
                  onToggle={() => handleToggle(svc)}
                />
              ))}
            </div>
            {orphanCategoryIds.size > 0 && (
              <div className="px-4 py-2.5 border-t border-neutral-100">
                {Array.from(orphanCategoryIds).map((catId) => (
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
          </div>
        )}
      </div>

    </div>
  );
}
