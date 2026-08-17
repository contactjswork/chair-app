'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, UserX } from 'lucide-react';
import { adminApi, AdminApiError, formatDate, getStoredAdminUser, type AdminAccountRow, type AdminRoleRow } from '@/lib/adminApi';
import { Card, ConfirmModal, EmptyState, ErrorBanner, PermissionDenied, Skeleton, StatusPill, Th, inputCls, selectCls } from '../_components/ui';

interface NewAdminForm {
  name: string;
  email: string;
  password: string;
  admin_role_key: string;
}

const EMPTY_FORM: NewAdminForm = { name: '', email: '', password: '', admin_role_key: '' };

export default function AdminsPage() {
  const self = getStoredAdminUser();

  const [admins, setAdmins] = useState<AdminAccountRow[] | null>(null);
  const [roles, setRoles] = useState<AdminRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<NewAdminForm | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmDeactivate, setConfirmDeactivate] = useState<AdminAccountRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([adminApi.get<{ data: AdminAccountRow[] }>('/admin/admins'), adminApi.get<{ data: AdminRoleRow[] }>('/admin/admin-roles')])
      .then(([a, r]) => {
        setAdmins(a.data);
        setRoles(r.data);
      })
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

  async function changeRole(admin: AdminAccountRow, roleKey: string) {
    try {
      await adminApi.patch(`/admin/admins/${admin.id}`, { admin_role_key: roleKey });
      load();
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Changement de rôle impossible');
    }
  }

  async function submitCreate() {
    if (!form) return;
    setFormError('');
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8 || !form.admin_role_key) {
      setFormError('Tous les champs sont obligatoires, mot de passe 8 caractères minimum.');
      return;
    }
    setSaving(true);
    try {
      await adminApi.post('/admin/admins', form);
      setForm(null);
      load();
    } catch (e) {
      setFormError(e instanceof AdminApiError ? e.message : 'Création impossible');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    if (!confirmDeactivate) return;
    setActionLoading(true);
    try {
      await adminApi.post(`/admin/admins/${confirmDeactivate.id}/deactivate`);
      load();
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Désactivation impossible');
    } finally {
      setActionLoading(false);
      setConfirmDeactivate(null);
    }
  }

  if (forbidden) return <PermissionDenied />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Comptes admin</h1>
          <p className="text-[13px] text-neutral-400 mt-0.5">Réservé Super Admin — chaque compte a son propre mot de passe et un rôle granulaire</p>
        </div>
        <button
          onClick={() => setForm({ ...EMPTY_FORM })}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-[13px] font-semibold hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
        >
          <Plus size={14} /> Nouvel admin
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                <Th>Nom</Th>
                <Th>Email</Th>
                <Th>Rôle</Th>
                <Th>Statut</Th>
                <Th>Créé</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : !admins?.length
                ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState text="Aucun compte admin" />
                    </td>
                  </tr>
                )
                : admins.map((a, i) => (
                    <tr key={a.id} className={i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''}>
                      <td className="px-4 py-3 text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                        {a.name} {a.id === self?.id && <span className="text-[11px] text-neutral-400">(vous)</span>}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-neutral-500 dark:text-neutral-400">{a.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={a.admin_role ?? ''}
                          onChange={(e) => changeRole(a, e.target.value)}
                          disabled={a.id === self?.id}
                          className={`${selectCls} py-1.5`}
                        >
                          {roles.map((r) => (
                            <option key={r.key} value={r.key}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={a.suspended ? 'suspended' : 'active'} />
                      </td>
                      <td className="px-4 py-3 text-[12px] text-neutral-400">{formatDate(a.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          {!a.suspended && a.id !== self?.id && (
                            <button
                              onClick={() => setConfirmDeactivate(a)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                              title="Désactiver"
                            >
                              <UserX size={15} />
                            </button>
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
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-3">
            <h3 className="text-[16px] font-bold text-neutral-900 dark:text-neutral-50">Nouveau compte admin</h3>
            {formError && <ErrorBanner message={formError} />}
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom complet" className={inputCls} />
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className={inputCls} />
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mot de passe (8+ caractères)" className={inputCls} />
            <select value={form.admin_role_key} onChange={(e) => setForm({ ...form, admin_role_key: e.target.value })} className={selectCls}>
              <option value="">Rôle…</option>
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors">
                Annuler
              </button>
              <button onClick={submitCreate} disabled={saving} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-700 transition-colors disabled:opacity-50">
                {saving ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDeactivate}
        title="Désactiver le compte admin"
        message={
          <>
            Désactiver <strong>{confirmDeactivate?.name}</strong> ? Ses jetons d&apos;accès seront révoqués immédiatement — le compte reste réactivable manuellement en base si besoin.
          </>
        }
        onCancel={() => setConfirmDeactivate(null)}
        onConfirm={deactivate}
        loading={actionLoading}
      />
    </div>
  );
}
