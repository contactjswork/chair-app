'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Eye, UserX, UserCheck, Trash2, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('chair_admin_token') : null;

// ─── Shared components ────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    client: 'bg-neutral-100 text-neutral-600',
    hairdresser: 'bg-violet-100 text-violet-700',
    salon_owner: 'bg-blue-100 text-blue-700',
    admin: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    client: 'Client',
    hairdresser: 'Coiffeur',
    salon_owner: 'Gérant',
    admin: 'Admin',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[role] ?? 'bg-neutral-100 text-neutral-500'}`}>
      {labels[role] ?? role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    suspended: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
  };
  const labels: Record<string, string> = { active: 'Actif', suspended: 'Suspendu', pending: 'En attente' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[status] ?? 'bg-neutral-100 text-neutral-500'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function UserAvatar({ name, avatar }: { name: string; avatar?: string }) {
  if (avatar) {
    return <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-[12px] font-bold text-neutral-600">
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4">
        <h3 className="text-[16px] font-bold text-neutral-900">{title}</h3>
        <p className="text-[13px] text-neutral-500">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'En cours…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-100 rounded-xl ${className ?? ''}`} />;
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1 <= 5 ? i + 1 : totalPages - (6 - i);
    if (page >= totalPages - 3) return totalPages - (6 - i);
    return page - 2 + i;
  });
  return (
    <div className="flex items-center gap-1 justify-center mt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map((p, i) => (
        <button
          key={i}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-colors ${
            p === page ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  city?: string;
  created_at: string;
  status: string;
  avatar?: string;
}

interface UsersResponse {
  data: User[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

export default function UtilisateursPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{ type: 'suspend' | 'delete'; user: User } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(
    async (q: string, r: string, s: string, p: number) => {
      setLoading(true);
      const token = getToken();
      const params = new URLSearchParams({ search: q, role: r, status: s, page: String(p), per_page: '20' });
      try {
        const res = await fetch(`${API_URL}/admin/users?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setData(json);
      } catch {
        setError('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { fetchUsers(search, role, status, page); }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, role, status, page, fetchUsers]);

  async function handleSuspend(user: User) {
    setActionLoading(true);
    const token = getToken();
    try {
      const action = user.status === 'suspended' ? 'reactivate' : 'suspend';
      await fetch(`${API_URL}/admin/users/${user.id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers(search, role, status, page);
    } catch {
      setError('Action impossible');
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  async function handleDelete(user: User) {
    setActionLoading(true);
    const token = getToken();
    try {
      await fetch(`${API_URL}/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers(search, role, status, page);
    } catch {
      setError('Suppression impossible');
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  function exportCSV() {
    const rows = data?.data ?? [];
    const header = 'ID,Nom,Email,Rôle,Ville,Inscrit le,Statut';
    const lines = rows.map(
      (u) => `${u.id},"${u.name}","${u.email}",${u.role},${u.city ?? ''},"${u.created_at}",${u.status}`
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `utilisateurs_${Date.now()}.csv`;
    a.click();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-neutral-900">Utilisateurs</h1>
          {data && <p className="text-[13px] text-neutral-400 mt-0.5">{data.total.toLocaleString('fr')} utilisateurs</p>}
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-[13px] font-semibold hover:bg-neutral-700 transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">{error}</div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par nom ou email…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300"
          />
        </div>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300"
        >
          <option value="">Tous les rôles</option>
          <option value="client">Client</option>
          <option value="hairdresser">Coiffeur</option>
          <option value="salon_owner">Gérant</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="suspended">Suspendu</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Utilisateur</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Rôle</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Ville</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Inscrit</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Statut</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className={i % 2 === 1 ? 'bg-neutral-50/30' : ''}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : data?.data?.length === 0
                ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-neutral-400">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                )
                : data?.data?.map((u, i) => (
                  <tr
                    key={u.id}
                    className={`hover:bg-neutral-50 transition-colors ${i % 2 === 1 ? 'bg-neutral-50/30' : ''}`}
                  >
                    <td className="px-4 py-3 text-[12px] text-neutral-400">#{u.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={u.name} avatar={u.avatar} />
                        <span className="text-[13px] font-medium text-neutral-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-neutral-500">{u.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3 text-[13px] text-neutral-500">{u.city ?? '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-neutral-400">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/admin/utilisateurs/${u.id}`}
                          className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                          title="Voir"
                        >
                          <Eye size={15} />
                        </Link>
                        <button
                          onClick={() => setConfirm({ type: 'suspend', user: u })}
                          className="p-1.5 rounded-lg text-neutral-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          title={u.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
                        >
                          {u.status === 'suspended' ? <UserCheck size={15} /> : <UserX size={15} />}
                        </button>
                        <button
                          onClick={() => setConfirm({ type: 'delete', user: u })}
                          className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {data && data.last_page > 1 && (
          <div className="px-4 py-3 border-t border-neutral-100">
            <Pagination page={page} totalPages={data.last_page} onChange={setPage} />
          </div>
        )}
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        open={!!confirm}
        title={
          confirm?.type === 'delete'
            ? "Supprimer l'utilisateur"
            : confirm?.user?.status === 'suspended'
            ? "Réactiver l'utilisateur"
            : "Suspendre l'utilisateur"
        }
        message={
          confirm?.type === 'delete'
            ? `Supprimer définitivement ${confirm.user.name} ? Cette action est irréversible.`
            : confirm?.user?.status === 'suspended'
            ? `Réactiver le compte de ${confirm?.user.name} ?`
            : `Suspendre le compte de ${confirm?.user.name} ? L'utilisateur ne pourra plus se connecter.`
        }
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === 'delete') handleDelete(confirm.user);
          else handleSuspend(confirm.user);
        }}
        loading={actionLoading}
      />
    </div>
  );
}
