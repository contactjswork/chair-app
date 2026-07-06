'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  UserX,
  UserCheck,
  Trash2,
  ExternalLink,
  Star,
  CalendarCheck,
  Image as ImageIcon,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('chair_admin_token') : null;

// ─── Shared ───────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    client: 'bg-neutral-100 text-neutral-600',
    hairdresser: 'bg-violet-100 text-violet-700',
    salon_owner: 'bg-blue-100 text-blue-700',
    admin: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    client: 'Client', hairdresser: 'Coiffeur', salon_owner: 'Gérant', admin: 'Admin',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold ${map[role] ?? 'bg-neutral-100 text-neutral-500'}`}>
      {labels[role] ?? role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    suspended: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-neutral-100 text-neutral-500',
    completed: 'bg-blue-100 text-blue-700',
  };
  const labels: Record<string, string> = {
    active: 'Actif', suspended: 'Suspendu', pending: 'En attente',
    confirmed: 'Confirmé', cancelled: 'Annulé', completed: 'Terminé',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[status] ?? 'bg-neutral-100 text-neutral-500'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function ConfirmModal({
  open, title, message, onCancel, onConfirm, loading,
}: {
  open: boolean; title: string; message: string;
  onCancel: () => void; onConfirm: () => void; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4">
        <h3 className="text-[16px] font-bold text-neutral-900">{title}</h3>
        <p className="text-[13px] text-neutral-500">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50">
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

// ─── Page ─────────────────────────────────────────────────────────────────────

interface UserDetail {
  id: number;
  name: string;
  email: string;
  role: string;
  city?: string;
  bio?: string;
  avatar?: string;
  status: string;
  created_at: string;
  chair_score?: number;
  chair_level?: string;
  avg_rating?: number;
  reviews_count?: number;
  appointments_count?: number;
  followers_count?: number;
  views_count?: number;
  salon?: { name: string; city: string };
  specialties?: string[];
  appointments?: Array<{ id: number; hairdresser_name?: string; client_name?: string; service: string; date: string; status: string; price: number }>;
  reviews?: Array<{ id: number; rating: number; comment: string; created_at: string; author_name?: string; hairdresser_name?: string }>;
  portfolio?: Array<{ id: number; url: string }>;
  activity?: Array<{ id: number; type: string; description: string; created_at: string }>;
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<'suspend' | 'delete' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    fetch(`${API_URL}/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { setUser(d.user ?? d); setLoading(false); })
      .catch(() => { setError('Utilisateur introuvable'); setLoading(false); });
  }, [id]);

  async function handleSuspend() {
    setActionLoading(true);
    const token = getToken();
    const action = user?.status === 'suspended' ? 'reactivate' : 'suspend';
    try {
      await fetch(`${API_URL}/admin/users/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser((u) => u ? { ...u, status: action === 'suspend' ? 'suspended' : 'active' } : u);
    } catch {
      setError('Action impossible');
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    const token = getToken();
    try {
      await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push('/admin/utilisateurs');
    } catch {
      setError('Suppression impossible');
      setActionLoading(false);
      setConfirm(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/admin/utilisateurs" className="flex items-center gap-2 text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors">
          <ArrowLeft size={15} /> Retour
        </Link>
        <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">{error || 'Utilisateur introuvable'}</div>
      </div>
    );
  }

  const isSuspended = user.status === 'suspended';

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/utilisateurs" className="flex items-center gap-2 text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors w-fit">
        <ArrowLeft size={15} /> Retour aux utilisateurs
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
        <div className="flex flex-wrap items-start gap-5">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-neutral-200 flex items-center justify-center text-[24px] font-bold text-neutral-600">
              {user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-[20px] font-bold text-neutral-900">{user.name}</h1>
              <RoleBadge role={user.role} />
              <StatusBadge status={user.status} />
            </div>
            <p className="text-[13px] text-neutral-500">{user.email}</p>
            {user.city && <p className="text-[13px] text-neutral-400 mt-0.5">{user.city}</p>}
            <p className="text-[12px] text-neutral-300 mt-1">Inscrit le {formatDate(user.created_at)}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setConfirm('suspend')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                isSuspended
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              {isSuspended ? <UserCheck size={14} /> : <UserX size={14} />}
              {isSuspended ? 'Réactiver' : 'Suspendre'}
            </button>
            <button
              onClick={() => setConfirm('delete')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} /> Supprimer
            </button>
            {user.role === 'hairdresser' && (
              <a
                href={`/app/coiffeur/${user.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
              >
                <ExternalLink size={14} /> Profil public
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Role-specific content */}
      {user.role === 'client' && (
        <div className="flex flex-col gap-5">
          {/* Stats rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'RDV total', value: user.appointments_count ?? 0 },
              { label: 'Avis donnés', value: user.reviews?.length ?? 0 },
              { label: 'Score CHAIR', value: user.chair_score ?? 0 },
              { label: 'Niveau', value: user.chair_level ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4 text-center">
                <div className="text-[22px] font-bold text-neutral-900">{value}</div>
                <div className="text-[12px] text-neutral-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Réservations */}
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
              <CalendarCheck size={15} className="text-neutral-400" />
              <h2 className="text-[14px] font-semibold text-neutral-900">Réservations</h2>
            </div>
            {!user.appointments?.length ? (
              <div className="px-5 py-8 text-center text-[13px] text-neutral-400">Aucune réservation</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50">
                      <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase">Coiffeur</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase">Service</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase">Date</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase">Statut</th>
                      <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase">Prix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.appointments.map((a, i) => (
                      <tr key={a.id} className={i % 2 === 1 ? 'bg-neutral-50/30' : ''}>
                        <td className="px-5 py-2.5 text-[13px] text-neutral-900">{a.hairdresser_name ?? '—'}</td>
                        <td className="px-3 py-2.5 text-[13px] text-neutral-600">{a.service}</td>
                        <td className="px-3 py-2.5 text-[12px] text-neutral-400">{formatDate(a.date)}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={a.status} /></td>
                        <td className="px-5 py-2.5 text-[13px] text-right font-medium text-neutral-900">{a.price} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Avis */}
          {!!user.reviews?.length && (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
                <Star size={15} className="text-neutral-400" />
                <h2 className="text-[14px] font-semibold text-neutral-900">Avis donnés</h2>
              </div>
              <div className="divide-y divide-neutral-100">
                {user.reviews.map((r) => (
                  <div key={r.id} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-medium text-neutral-900">{r.hairdresser_name ?? 'Coiffeur'}</span>
                      <span className="text-amber-500 text-[12px]">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    <p className="text-[13px] text-neutral-500">{r.comment}</p>
                    <p className="text-[11px] text-neutral-300 mt-1">{formatDate(r.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {user.role === 'hairdresser' && (
        <div className="flex flex-col gap-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Score CHAIR', value: user.chair_score ?? 0 },
              { label: 'Note moyenne', value: user.avg_rating ? `★ ${user.avg_rating.toFixed(1)}` : '—' },
              { label: 'Avis', value: user.reviews_count ?? 0 },
              { label: 'Followers', value: user.followers_count ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4 text-center">
                <div className="text-[22px] font-bold text-neutral-900">{value}</div>
                <div className="text-[12px] text-neutral-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {user.bio && (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
              <h3 className="text-[13px] font-semibold text-neutral-500 mb-2">Bio</h3>
              <p className="text-[13px] text-neutral-700">{user.bio}</p>
            </div>
          )}

          {/* Réservations reçues */}
          {!!user.appointments?.length && (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
                <CalendarCheck size={15} className="text-neutral-400" />
                <h2 className="text-[14px] font-semibold text-neutral-900">Réservations reçues</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50">
                      <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase">Client</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase">Service</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase">Date</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase">Statut</th>
                      <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase">Prix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.appointments.map((a, i) => (
                      <tr key={a.id} className={i % 2 === 1 ? 'bg-neutral-50/30' : ''}>
                        <td className="px-5 py-2.5 text-[13px] text-neutral-900">{a.client_name ?? '—'}</td>
                        <td className="px-3 py-2.5 text-[13px] text-neutral-600">{a.service}</td>
                        <td className="px-3 py-2.5 text-[12px] text-neutral-400">{formatDate(a.date)}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={a.status} /></td>
                        <td className="px-5 py-2.5 text-[13px] text-right font-medium text-neutral-900">{a.price} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Portfolio */}
          {!!user.portfolio?.length && (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon size={15} className="text-neutral-400" />
                <h2 className="text-[14px] font-semibold text-neutral-900">Portfolio ({user.portfolio.length})</h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {user.portfolio.map((p) => (
                  <img key={p.id} src={p.url} alt="" className="aspect-square rounded-xl object-cover" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {user.role === 'salon_owner' && user.salon && (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <h2 className="text-[14px] font-semibold text-neutral-900 mb-3">Salon</h2>
          <p className="text-[15px] font-bold text-neutral-900">{user.salon.name}</p>
          <p className="text-[13px] text-neutral-500">{user.salon.city}</p>
        </div>
      )}

      {/* Activité */}
      {!!user.activity?.length && (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-[14px] font-semibold text-neutral-900">Activité récente</h2>
          </div>
          <div className="divide-y divide-neutral-100">
            {user.activity.map((a) => (
              <div key={a.id} className="px-5 py-3">
                <p className="text-[13px] text-neutral-700">{a.description}</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">{formatDate(a.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        title={confirm === 'delete' ? 'Supprimer l'utilisateur' : isSuspended ? 'Réactiver l'utilisateur' : 'Suspendre l'utilisateur'}
        message={
          confirm === 'delete'
            ? `Supprimer définitivement ${user.name} ? Cette action est irréversible.`
            : isSuspended
            ? `Réactiver le compte de ${user.name} ?`
            : `Suspendre le compte de ${user.name} ?`
        }
        onCancel={() => setConfirm(null)}
        onConfirm={() => { confirm === 'delete' ? handleDelete() : handleSuspend(); }}
        loading={actionLoading}
      />
    </div>
  );
}
