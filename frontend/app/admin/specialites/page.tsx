'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, ArrowUp, ArrowDown, Pencil, Eye, EyeOff, Trash2 } from 'lucide-react';
import { adminApi, AdminApiError, hasPermission, getStoredAdminUser, PERMISSIONS, type AdminSpecialty } from '@/lib/adminApi';
import { Card, ConfirmModal, EmptyState, ErrorBanner, PermissionDenied, Skeleton, StatusPill, Th, inputCls } from '../_components/ui';

interface FormState {
  id?: number;
  name: string;
  slug: string;
  icon: string;
  category: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: '', slug: '', icon: '', category: '', description: '' };

export default function SpecialitesPage() {
  const admin = getStoredAdminUser();
  const canManage = hasPermission(admin, PERMISSIONS.SPECIALTIES_MANAGE);

  const [specialties, setSpecialties] = useState<AdminSpecialty[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminSpecialty | null>(null);
  const [deleteUsage, setDeleteUsage] = useState<Record<string, number> | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .get<{ data: AdminSpecialty[] }>('/admin/specialties')
      .then((r) => setSpecialties(r.data))
      .catch((e) => {
        if (e instanceof AdminApiError && e.isForbidden) setForbidden(true);
        else setError('Erreur de chargement');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Chargement initial - fetch au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function toggleActive(s: AdminSpecialty) {
    try {
      await adminApi.post(`/admin/specialties/${s.id}/${s.is_active ? 'hide' : 'unhide'}`);
      load();
    } catch {
      setError('Action impossible');
    }
  }

  async function move(s: AdminSpecialty, dir: -1 | 1) {
    if (!specialties) return;
    const sorted = [...specialties].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((x) => x.id === s.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    const order = sorted.map((x, i) => ({ id: x.id, order: (i + 1) * 10 }));
    setReordering(true);
    try {
      await adminApi.post('/admin/specialties/reorder', { order });
      load();
    } catch {
      setError('Réordonnancement impossible');
    } finally {
      setReordering(false);
    }
  }

  async function submit() {
    if (!form) return;
    setSaveError('');
    if (!form.name.trim()) {
      setSaveError('Le nom est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        icon: form.icon || null,
        category: form.category || null,
        description: form.description || null,
        ...(form.id ? {} : { slug: form.slug || undefined }),
      };
      if (form.id) await adminApi.patch(`/admin/specialties/${form.id}`, payload);
      else await adminApi.post('/admin/specialties', payload);
      setForm(null);
      load();
    } catch (e) {
      setSaveError(e instanceof AdminApiError ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminApi.delete(`/admin/specialties/${deleteTarget.id}`);
      setDeleteTarget(null);
      setDeleteUsage(null);
      load();
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 422 && e.body?.usage) {
        setDeleteUsage(e.body.usage as Record<string, number>);
      } else {
        setError('Suppression impossible');
        setDeleteTarget(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  if (forbidden) return <PermissionDenied />;

  const sorted = specialties ? [...specialties].sort((a, b) => a.order - b.order) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Spécialités</h1>
          <p className="text-[13px] text-neutral-400 mt-0.5">Taxonomie utilisée dans la recherche, les profils et les avis</p>
        </div>
        {canManage && (
          <button
            onClick={() => setForm({ ...EMPTY_FORM })}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-[13px] font-semibold hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
          >
            <Plus size={14} /> Nouvelle spécialité
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                <Th>Nom</Th>
                <Th>Slug</Th>
                <Th>Catégorie</Th>
                <Th align="right">Usage</Th>
                <Th>Statut</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : !sorted.length
                ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState text="Aucune spécialité" />
                    </td>
                  </tr>
                )
                : sorted.map((s, i) => (
                    <tr key={s.id} className={i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''}>
                      <td className="px-4 py-3 text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{s.name}</td>
                      <td className="px-4 py-3 text-[12px] text-neutral-400">{s.slug}</td>
                      <td className="px-4 py-3 text-[12px] text-neutral-500 dark:text-neutral-400">{s.category ?? '—'}</td>
                      <td className="px-4 py-3 text-[13px] text-right text-neutral-600 dark:text-neutral-400" title={JSON.stringify(s.usage)}>
                        {s.usage_total}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={s.is_active ? 'active' : 'hidden'} labelOverride={s.is_active ? 'Active' : 'Masquée'} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5 justify-end">
                          {canManage && (
                            <>
                              <button onClick={() => move(s, -1)} disabled={reordering || i === 0} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors" title="Monter">
                                <ArrowUp size={14} />
                              </button>
                              <button onClick={() => move(s, 1)} disabled={reordering || i === sorted.length - 1} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors" title="Descendre">
                                <ArrowDown size={14} />
                              </button>
                              <button
                                onClick={() => setForm({ id: s.id, name: s.name, slug: s.slug, icon: s.icon ?? '', category: s.category ?? '', description: s.description ?? '' })}
                                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 transition-colors"
                                title="Éditer"
                              >
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => toggleActive(s)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 transition-colors" title={s.is_active ? 'Masquer' : 'Rendre active'}>
                                {s.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                              <button onClick={() => { setDeleteTarget(s); setDeleteUsage(null); }} className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors" title="Supprimer">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>

      {form && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-md w-full p-6 flex flex-col gap-4">
            <h3 className="text-[16px] font-bold text-neutral-900 dark:text-neutral-50">{form.id ? 'Éditer la spécialité' : 'Nouvelle spécialité'}</h3>
            {saveError && <ErrorBanner message={saveError} />}
            <Field label="Nom">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </Field>
            {!form.id && (
              <Field label="Slug (optionnel, généré depuis le nom sinon — immuable après création)">
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto" className={inputCls} />
              </Field>
            )}
            <Field label="Catégorie">
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Icône (nom lucide-react)">
              <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls} />
            </Field>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setForm(null)} disabled={saving} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors disabled:opacity-50">
                Annuler
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Supprimer la spécialité"
        message={
          deleteUsage ? (
            <div className="flex flex-col gap-1.5">
              <p>Impossible : cette spécialité est encore utilisée.</p>
              <ul className="text-[12px] text-neutral-400 list-disc pl-4">
                {Object.entries(deleteUsage)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => (
                    <li key={k}>
                      {k} : {v}
                    </li>
                  ))}
              </ul>
              <p>Utilisez &quot;Masquer&quot; à la place — elle disparaît des listes publiques sans rien casser.</p>
            </div>
          ) : (
            <>
              Supprimer définitivement <strong>{deleteTarget?.name}</strong> ? Refusé automatiquement si elle est encore référencée quelque part.
            </>
          )
        }
        confirmLabel={deleteUsage ? 'Compris' : 'Supprimer'}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteUsage(null);
        }}
        onConfirm={deleteUsage ? () => { setDeleteTarget(null); setDeleteUsage(null); } : confirmDelete}
        loading={deleteLoading}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-neutral-500">{label}</label>
      {children}
    </div>
  );
}
