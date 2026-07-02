'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardNav from '@/components/layout/DashboardNav';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { services as servicesApi } from '@/lib/api';
import type { ApiServiceCategory, ApiService } from '@/lib/types';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

// ── Sub-components ────────────────────────────────────────────────────

function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<ApiServiceCategory>;
  onSave: (data: { name: string; description: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSave({ name: name.trim(), description: description.trim() });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
        {initial?.name ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom (ex : Homme, Femme, Barber...)"
        className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-400"
        required
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description courte (optionnelle)"
        rows={2}
        className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-400 resize-none"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-xl disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm px-4 py-2 rounded-xl border border-neutral-200">
          Annuler
        </button>
      </div>
    </form>
  );
}

function ServiceForm({
  categories,
  initial,
  isIndependent,
  onSave,
  onCancel,
}: {
  categories: ApiServiceCategory[];
  initial?: Partial<ApiService>;
  isIndependent: boolean;
  onSave: (data: {
    category_id: number;
    name: string;
    description: string;
    price: number | null;
    duration_minutes: number | null;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [categoryId, setCategoryId] = useState<number>(initial?.category_id ?? (categories[0]?.id ?? 0));
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState<number | null>(
    initial?.price != null ? parseFloat(String(initial.price)) || null : null
  );
  const [duration, setDuration] = useState<number | null>(initial?.duration_minutes ?? null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;
    if (isIndependent && price === null) return;
    setLoading(true);
    try {
      await onSave({
        category_id: categoryId,
        name: name.trim(),
        description: description.trim(),
        price: isIndependent ? (price ?? 0) : (price ?? null),
        duration_minutes: isIndependent ? (duration ?? 30) : (duration ?? null),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
        {initial?.name ? 'Modifier le service' : 'Nouveau service'}
      </p>

      {!isIndependent && (
        <p className="text-[11px] text-neutral-400 bg-neutral-100 rounded-xl px-3 py-2 leading-relaxed">
          Ce service sera affiché sur votre profil et améliorera votre visibilité dans la recherche. Prix et durée sont facultatifs.
        </p>
      )}

      <select
        value={categoryId}
        onChange={(e) => setCategoryId(Number(e.target.value))}
        className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-400 bg-white"
        required
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom du service (ex : Balayage blond, Coupe homme...)"
        className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-400"
        required
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (ex : Balayage technique + soin + coiffage)"
        rows={2}
        className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-400 resize-none"
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
              className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-400"
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
        <button
          type="submit"
          disabled={loading}
          className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-xl disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm px-4 py-2 rounded-xl border border-neutral-200">
          Annuler
        </button>
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function DashboardServicesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<ApiServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ApiServiceCategory | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [showNewService, setShowNewService] = useState<number | null>(null); // category id
  const [editingService, setEditingService] = useState<ApiService | null>(null);

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
      const data = await servicesApi.categories.list() as ApiServiceCategory[];
      setCategories(data);
      // Auto-expand categories that have services
      setExpandedCategories(new Set(data.map((c) => c.id)));
    } catch {
      setError('Impossible de charger les services.');
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(id: number) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Category actions
  async function handleCreateCategory(data: { name: string; description: string }) {
    const cat = await servicesApi.categories.create(data) as ApiServiceCategory;
    setCategories((prev) => [...prev, { ...cat, all_services: [] }]);
    setExpandedCategories((prev) => new Set([...prev, cat.id]));
    setShowNewCategory(false);
  }

  async function handleUpdateCategory(id: number, data: { name: string; description: string }) {
    const updated = await servicesApi.categories.update(id, data) as ApiServiceCategory;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...updated, all_services: c.all_services } : c)));
    setEditingCategory(null);
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm('Supprimer cette catégorie et tous ses services ?')) return;
    await servicesApi.categories.delete(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  // Service actions
  async function handleCreateService(categoryId: number, data: Parameters<typeof servicesApi.items.create>[0]) {
    const svc = await servicesApi.items.create(data) as ApiService;
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== categoryId) return c;
        return { ...c, all_services: [...(c.all_services ?? []), svc] };
      })
    );
    setShowNewService(null);
  }

  async function handleUpdateService(svc: ApiService, data: Parameters<typeof servicesApi.items.update>[1]) {
    const updated = await servicesApi.items.update(svc.id, data) as ApiService;
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        all_services: (c.all_services ?? []).map((s) => (s.id === svc.id ? updated : s)),
      }))
    );
    setEditingService(null);
  }

  async function handleToggleService(svc: ApiService) {
    const updated = await servicesApi.items.update(svc.id, { is_active: !svc.is_active }) as ApiService;
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        all_services: (c.all_services ?? []).map((s) => (s.id === svc.id ? updated : s)),
      }))
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-neutral-400 text-sm">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="px-4 pt-4">
        <DashboardPageHeader title={isIndependent ? 'Mes services' : 'Mes spécialités'} />
      </div>
      {!isIndependent && (
        <p className="px-4 pt-1 pb-2 text-[12px] text-neutral-400 leading-relaxed">
          Listez vos expertises. Ces informations améliorent votre visibilité dans la recherche et l&apos;algorithme CHAIR.
        </p>
      )}

      {error && (
        <div className="mx-4 mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      <div className="px-4 space-y-4">
        {/* Categories list */}
        {categories.map((cat) => (
          <div key={cat.id} className="border border-neutral-200 rounded-xl overflow-hidden">
            {/* Category header */}
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-50">
              <button
                onClick={() => toggleCategory(cat.id)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <span className="font-semibold text-neutral-900 text-sm">{cat.name}</span>
                {cat.description && (
                  <span className="text-neutral-400 text-xs hidden sm:block">{cat.description}</span>
                )}
                <span className="text-neutral-400 text-xs ml-auto mr-2">
                  {(cat.all_services ?? []).length} service{(cat.all_services ?? []).length !== 1 ? 's' : ''}
                </span>
                {expandedCategories.has(cat.id) ? (
                  <ChevronUp size={16} className="text-neutral-400 shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-neutral-400 shrink-0" />
                )}
              </button>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => setEditingCategory(cat)}
                  className="p-1.5 hover:bg-neutral-200 rounded-lg"
                >
                  <Pencil size={14} className="text-neutral-500" />
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>

            {/* Edit category form */}
            {editingCategory?.id === cat.id && (
              <div className="px-4 py-3 border-t border-neutral-100">
                <CategoryForm
                  initial={cat}
                  onSave={(data) => handleUpdateCategory(cat.id, data)}
                  onCancel={() => setEditingCategory(null)}
                />
              </div>
            )}

            {/* Services list */}
            {expandedCategories.has(cat.id) && (
              <div className="divide-y divide-neutral-100">
                {(cat.all_services ?? []).map((svc) => (
                  <div key={svc.id}>
                    {editingService?.id === svc.id ? (
                      <div className="px-4 py-3">
                        <ServiceForm
                          categories={categories}
                          initial={svc}
                          isIndependent={isIndependent}
                          onSave={(data) => handleUpdateService(svc, data)}
                          onCancel={() => setEditingService(null)}
                        />
                      </div>
                    ) : (
                      <div className={`flex items-start gap-3 px-4 py-3 ${!svc.is_active ? 'opacity-50' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-neutral-900">{svc.name}</span>
                            {!svc.is_active && (
                              <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
                                Inactif
                              </span>
                            )}
                          </div>
                          {svc.description && (
                            <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{svc.description}</p>
                          )}
                          {isIndependent && (
                            <div className="flex items-center gap-3 mt-1">
                              {svc.price != null && (
                                <span className="text-xs font-semibold text-neutral-900">{parseFloat(String(svc.price)).toFixed(0)} €</span>
                              )}
                              {svc.duration_minutes != null && (
                                <span className="text-xs text-neutral-400">{svc.duration_minutes} min</span>
                              )}
                              <span className="text-xs text-neutral-300">{svc.visits_count} réservation{svc.visits_count !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleToggleService(svc)}
                            className="p-1.5 hover:bg-neutral-100 rounded-lg"
                            title={svc.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {svc.is_active ? (
                              <Eye size={14} className="text-neutral-400" />
                            ) : (
                              <EyeOff size={14} className="text-neutral-400" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingService(svc)}
                            className="p-1.5 hover:bg-neutral-100 rounded-lg"
                          >
                            <Pencil size={14} className="text-neutral-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add service button */}
                {showNewService === cat.id ? (
                  <div className="px-4 py-3">
                    <ServiceForm
                      categories={categories}
                      initial={{ category_id: cat.id }}
                      isIndependent={isIndependent}
                      onSave={(data) => handleCreateService(cat.id, data)}
                      onCancel={() => setShowNewService(null)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewService(cat.id)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-neutral-500 hover:bg-neutral-50"
                  >
                    <Plus size={14} />
                    Ajouter un service
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Empty state */}
        {categories.length === 0 && !showNewCategory && (
          <div className="text-center py-12 border border-dashed border-neutral-200 rounded-xl">
            <p className="text-neutral-500 text-sm mb-1">Aucune catégorie</p>
            <p className="text-neutral-400 text-xs mb-4">
              Commencez par créer une catégorie (ex : Homme, Femme, Barber...)
            </p>
          </div>
        )}

        {/* New category form */}
        {showNewCategory ? (
          <CategoryForm
            onSave={handleCreateCategory}
            onCancel={() => setShowNewCategory(false)}
          />
        ) : (
          <button
            onClick={() => setShowNewCategory(true)}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-neutral-300 rounded-xl py-3 text-sm text-neutral-500 hover:bg-neutral-50"
          >
            <Plus size={16} />
            Nouvelle catégorie
          </button>
        )}
      </div>

      <DashboardNav />
    </div>
  );
}
