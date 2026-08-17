'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, ArrowUp, ArrowDown, Pencil, Lock } from 'lucide-react';
import { adminApi, AdminApiError, hasPermission, getStoredAdminUser, PERMISSIONS, type AdminBadge, type AdminBadgesResponse } from '@/lib/adminApi';
import { Card, EmptyState, ErrorBanner, InfoTip, PermissionDenied, Skeleton, StatusPill, Th, Toggle, inputCls, selectCls } from '../_components/ui';

const FAMILIES = ['carriere', 'exceptionnel'] as const;
const RARITIES = ['commun', 'rare', 'epique', 'legendaire', 'ultime'] as const;

interface FormState {
  id?: number;
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  family: string;
  rarity: string;
  tier: number;
  reward: number;
  visible: boolean;
  enabled: boolean;
  metric: string;
  operator: string;
  value: string;
}

const EMPTY_FORM: FormState = {
  slug: '',
  title: '',
  description: '',
  icon: '',
  category: '',
  family: 'carriere',
  rarity: 'commun',
  tier: 1,
  reward: 10,
  visible: true,
  enabled: true,
  metric: '',
  operator: '>=',
  value: '',
};

function BadgesPageInner() {
  const params = useSearchParams();
  const admin = getStoredAdminUser();
  const canManage = hasPermission(admin, PERMISSIONS.BADGES_MANAGE);

  const [resp, setResp] = useState<AdminBadgesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .get<AdminBadgesResponse>('/admin/badges')
      .then(setResp)
      .catch((e) => {
        if (e instanceof AdminApiError && e.isForbidden) setForbidden(true);
        else setError('Erreur de chargement');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Chargement initial du catalogue — fetch au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    // Ouvre le formulaire de création depuis l'action rapide du dashboard
    // (?new=1) — synchronise l'état local avec la query string au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (params.get('new') === '1' && canManage) setForm({ ...EMPTY_FORM });
  }, [params, canManage]);

  function openEdit(b: AdminBadge) {
    setForm({
      id: b.id,
      slug: b.slug,
      title: b.title,
      description: b.description ?? '',
      icon: b.icon ?? '',
      category: b.category ?? '',
      family: b.family,
      rarity: b.rarity,
      tier: b.tier,
      reward: b.reward,
      visible: b.visible,
      enabled: b.enabled,
      metric: b.criteria?.metric ?? '',
      operator: b.criteria?.operator ?? '>=',
      value: b.criteria ? String(b.criteria.value) : '',
    });
    setSaveError('');
  }

  async function move(badge: AdminBadge, dir: -1 | 1) {
    if (!resp) return;
    const sorted = [...resp.data].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((b) => b.id === badge.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    const order = sorted.map((b, i) => ({ id: b.id, order: (i + 1) * 10 }));
    setReordering(true);
    try {
      await adminApi.post('/admin/badges/reorder', { order });
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
    if (!form.title.trim()) {
      setSaveError('Le titre est obligatoire.');
      return;
    }
    const isHardcoded = form.id ? resp?.data.find((b) => b.id === form.id)?.is_hardcoded : false;
    if (!isHardcoded && (!form.metric || !form.operator || form.value === '')) {
      setSaveError('Un badge générique nécessite metric + operator + value.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || null,
        icon: form.icon || null,
        category: form.category || null,
        family: form.family,
        rarity: form.rarity,
        tier: form.tier,
        reward: form.reward,
        visible: form.visible,
        enabled: form.enabled,
      };
      if (!isHardcoded) {
        payload.criteria = { metric: form.metric, operator: form.operator, value: Number(form.value) };
      }

      if (form.id) {
        await adminApi.patch(`/admin/badges/${form.id}`, payload);
      } else {
        payload.slug = form.slug;
        await adminApi.post('/admin/badges', payload);
      }
      setForm(null);
      load();
    } catch (e) {
      setSaveError(e instanceof AdminApiError ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) return <PermissionDenied />;

  const sorted = resp ? [...resp.data].sort((a, b) => a.order - b.order) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Badges</h1>
          <p className="text-[13px] text-neutral-400 mt-0.5">Catalogue de badges CHAIR — génériques (règle metric/operator/value) et à logique dédiée</p>
        </div>
        {canManage && (
          <button
            onClick={() => setForm({ ...EMPTY_FORM })}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-[13px] font-semibold hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
          >
            <Plus size={14} /> Nouveau badge
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                <Th>Badge</Th>
                <Th>Famille</Th>
                <Th>Rareté</Th>
                <Th align="right">Récompense</Th>
                <Th>Règle</Th>
                <Th align="right">Débloqué par</Th>
                <Th>Visible</Th>
                <Th>Actif</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : !sorted.length
                ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState text="Aucun badge" />
                    </td>
                  </tr>
                )
                : sorted.map((b, i) => (
                    <tr key={b.id} className={i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{b.title}</span>
                          {b.is_hardcoded && (
                            <span title="Logique dédiée dans le code">
                              <Lock size={11} className="text-neutral-300" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-neutral-400">{b.slug}</span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-neutral-500 dark:text-neutral-400 capitalize">{b.family}</td>
                      <td className="px-4 py-3 text-[12px] text-neutral-500 dark:text-neutral-400 capitalize">{b.rarity}</td>
                      <td className="px-4 py-3 text-[13px] text-right font-medium text-neutral-900 dark:text-neutral-100">{b.reward} pts</td>
                      <td className="px-4 py-3 text-[12px] text-neutral-500 dark:text-neutral-400">
                        {b.criteria ? (
                          <code className="text-[11px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                            {b.criteria.metric} {b.criteria.operator} {b.criteria.value}
                          </code>
                        ) : (
                          <span className="italic">logique dédiée</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-right text-neutral-600 dark:text-neutral-400">{b.awarded_count}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={b.visible ? 'visible' : 'hidden'} labelOverride={b.visible ? 'Oui' : 'Non'} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={b.enabled ? 'active' : 'hidden'} labelOverride={b.enabled ? 'Oui' : 'Non'} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5 justify-end">
                          {canManage && (
                            <>
                              <button onClick={() => move(b, -1)} disabled={reordering || i === 0} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors" title="Monter">
                                <ArrowUp size={14} />
                              </button>
                              <button onClick={() => move(b, 1)} disabled={reordering || i === sorted.length - 1} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors" title="Descendre">
                                <ArrowDown size={14} />
                              </button>
                              <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 transition-colors" title="Éditer">
                                <Pencil size={14} />
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

      {form && resp && (
        <BadgeFormModal
          form={form}
          setForm={setForm}
          metrics={resp.metrics}
          operators={resp.operators}
          isHardcoded={!!form.id && !!resp.data.find((b) => b.id === form.id)?.is_hardcoded}
          error={saveError}
          saving={saving}
          onCancel={() => setForm(null)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

function BadgeFormModal({
  form,
  setForm,
  metrics,
  operators,
  isHardcoded,
  error,
  saving,
  onCancel,
  onSubmit,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  metrics: string[];
  operators: string[];
  isHardcoded: boolean;
  error: string;
  saving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-lg w-full my-8 p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
        <h3 className="text-[16px] font-bold text-neutral-900 dark:text-neutral-50">{form.id ? 'Éditer le badge' : 'Nouveau badge'}</h3>

        {error && <ErrorBanner message={error} />}

        {!form.id && (
          <Field label="Slug (identifiant, immuable)">
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="ex: portfolio_20" className={inputCls} />
          </Field>
        )}

        <Field label="Titre">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
        </Field>

        <Field label="Description">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Famille">
            <select value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })} className={selectCls + ' w-full'}>
              {FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rareté">
            <select value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })} className={selectCls + ' w-full'}>
              {RARITIES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tier (1-5)">
            <input type="number" min={1} max={5} value={form.tier} onChange={(e) => setForm({ ...form, tier: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Récompense (points)">
            <input type="number" min={0} value={form.reward} onChange={(e) => setForm({ ...form, reward: Number(e.target.value) })} className={inputCls} />
          </Field>
        </div>

        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <p className="text-[12px] font-semibold text-neutral-500">Règle de déblocage</p>
            <InfoTip text="Un badge générique se débloque automatiquement quand le compteur choisi franchit le seuil. Pris en compte au prochain recalcul (post publié, avis reçu, etc.) — pas besoin de build." effect="instant" />
          </div>
          {isHardcoded ? (
            <p className="text-[12px] text-neutral-400 flex items-center gap-1.5">
              <Lock size={12} /> Ce badge utilise une logique dédiée dans le code (combinaison de critères ou classement relatif) — seule sa métadonnée est éditable.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} className={selectCls}>
                <option value="">Métrique…</option>
                {metrics.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })} className={selectCls}>
                {operators.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="valeur" className={inputCls} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-6 border-t border-neutral-100 dark:border-neutral-800 pt-4">
          <label className="flex items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
            <Toggle checked={form.visible} onChange={() => setForm({ ...form, visible: !form.visible })} />
            Visible
          </label>
          <label className="flex items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
            <Toggle checked={form.enabled} onChange={() => setForm({ ...form, enabled: !form.enabled })} />
            Actif (nouvelles attributions)
          </label>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} disabled={saving} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors disabled:opacity-50">
            Annuler
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
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

export default function BadgesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40" />}>
      <BadgesPageInner />
    </Suspense>
  );
}
