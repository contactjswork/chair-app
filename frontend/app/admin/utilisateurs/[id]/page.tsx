'use client';

import { useEffect, useState, useCallback } from 'react';
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
  Users as UsersIcon,
  Award,
  Plus,
  Minus,
  Building2,
} from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  formatDate,
  hasPermission,
  getStoredAdminUser,
  PERMISSIONS,
  type AdminUserDetail,
  type BadgeCatalogEntry,
} from '@/lib/adminApi';
import { Card, ConfirmModal, ErrorBanner, PermissionDenied, RolePill, Skeleton, StatusPill, inputCls } from '../../_components/ui';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const admin = getStoredAdminUser();
  const canSuspend = hasPermission(admin, PERMISSIONS.USERS_SUSPEND);
  const canDelete = hasPermission(admin, PERMISSIONS.USERS_DELETE);
  const canAdjustPoints = hasPermission(admin, PERMISSIONS.USERS_POINTS_ADJUST);

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<'suspend' | 'delete' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [pointsDelta, setPointsDelta] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [pointsSaving, setPointsSaving] = useState(false);
  const [pointsError, setPointsError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .get<AdminUserDetail>(`/admin/users/${id}`)
      .then(setDetail)
      .catch((e) => {
        if (e instanceof AdminApiError && e.isForbidden) setForbidden(true);
        else setError('Utilisateur introuvable');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    // Chargement initial de la fiche — pas une synchronisation d'état
    // externe déclenchée en continu, juste le fetch au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleSuspend() {
    if (!detail) return;
    setActionLoading(true);
    try {
      const action = detail.user.suspended_at ? 'unsuspend' : 'suspend';
      await adminApi.post(`/admin/users/${id}/${action}`);
      load();
    } catch {
      setError('Action impossible');
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    try {
      await adminApi.delete(`/admin/users/${id}`);
      router.push('/admin/utilisateurs');
    } catch {
      setError('Suppression impossible');
      setActionLoading(false);
      setConfirm(null);
    }
  }

  async function submitPoints() {
    const delta = parseInt(pointsDelta, 10);
    if (!Number.isFinite(delta) || !pointsReason.trim()) {
      setPointsError('Le delta et la raison sont obligatoires.');
      return;
    }
    setPointsSaving(true);
    setPointsError('');
    try {
      await adminApi.post(`/admin/users/${id}/points-adjust`, { delta, reason: pointsReason.trim() });
      setPointsOpen(false);
      setPointsDelta('');
      setPointsReason('');
      load();
    } catch (e) {
      setPointsError(e instanceof AdminApiError ? e.message : 'Correction impossible');
    } finally {
      setPointsSaving(false);
    }
  }

  if (forbidden) return <PermissionDenied />;

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <ErrorBanner message={error || 'Utilisateur introuvable'} />
      </div>
    );
  }

  const { user, stats, recent_appointments, recent_reviews, referrals, professional, salon_owned } = detail;
  const isSuspended = !!user.suspended_at;

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      {/* Header card */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-5">
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[24px] font-bold text-neutral-600 dark:text-neutral-300">
              {user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-[20px] font-bold text-neutral-900 dark:text-neutral-50">{user.name}</h1>
              <RolePill role={user.role} />
              <StatusPill status={isSuspended ? 'suspended' : 'active'} />
            </div>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{user.email}</p>
            {user.city && <p className="text-[13px] text-neutral-400 mt-0.5">{user.city}</p>}
            <p className="text-[12px] text-neutral-300 mt-1">
              Inscrit le {formatDate(user.created_at, { day: '2-digit', month: 'long', year: 'numeric' })}
              {user.referred_by && (
                <>
                  {' '}
                  · parrainé par{' '}
                  <Link href={`/admin/utilisateurs/${user.referred_by.id}`} className="underline hover:text-neutral-500">
                    {user.referred_by.name}
                  </Link>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canSuspend && (
              <button
                onClick={() => setConfirm('suspend')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                  isSuspended
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400'
                }`}
              >
                {isSuspended ? <UserCheck size={14} /> : <UserX size={14} />}
                {isSuspended ? 'Réactiver' : 'Suspendre'}
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setConfirm('delete')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 transition-colors"
              >
                <Trash2 size={14} /> Supprimer
              </button>
            )}
            {professional && (
              <a
                href={`/app/coiffeur/${professional.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
              >
                <ExternalLink size={14} /> Profil public
              </a>
            )}
            {professional && (
              <Link
                href={`/admin/coiffeurs/${professional.profile_id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
              >
                Fiche pro complète
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatBox label="RDV (client)" value={stats.appointments_as_client} />
        {professional && <StatBox label="RDV (pro)" value={stats.appointments_as_hairdresser} />}
        <StatBox label="Avis donnés" value={stats.reviews_given} />
        {professional && <StatBox label="Avis reçus" value={stats.reviews_received} />}
        <StatBox label="Filleuls" value={stats.referrals_count} />
        <StatBox label="Favoris" value={stats.saved_profiles + stats.saved_posts} />
        <StatBox label="Abonnements" value={stats.follows} />
      </div>

      {/* Volet professionnel */}
      {professional && (
        <Card className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">Profil professionnel</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill status={professional.identity_verified ? 'verified' : 'pending'} labelOverride={professional.identity_verified ? 'Identité vérifiée' : 'Identité non vérifiée'} />
              <StatusPill status={professional.diploma_status} labelOverride={`Diplôme : ${professional.diploma_status}`} />
              {professional.is_hidden && <StatusPill status="hidden" labelOverride="Profil masqué" />}
              {professional.is_chair_plus && <StatusPill status="verified" labelOverride="CHAIR+" />}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <StatBox label="Score CHAIR" value={professional.chair_score} sub={professional.chair_score_adjustment !== 0 ? `dont ${professional.chair_score_adjustment > 0 ? '+' : ''}${professional.chair_score_adjustment} admin` : undefined} />
            <StatBox label="Niveau" value={professional.chair_level.name} />
            <StatBox label="Note moyenne" value={professional.avg_rating ? `★ ${professional.avg_rating.toFixed(1)}` : '—'} />
            <StatBox label="Followers" value={professional.followers_count} />
          </div>
          {professional.salon && (
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mb-3 flex items-center gap-1.5">
              <Building2 size={13} />
              Membre du salon{' '}
              <Link href={`/admin/salons/${professional.salon.id}`} className="underline hover:text-neutral-800 dark:hover:text-neutral-200">
                {professional.salon.name}
              </Link>
            </p>
          )}
          {professional.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {professional.specialties.map((s) => (
                <span key={s.id} className="text-[11px] font-medium px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {s.name}
                </span>
              ))}
            </div>
          )}

          {canAdjustPoints && (
            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
              {!pointsOpen ? (
                <button
                  onClick={() => setPointsOpen(true)}
                  className="flex items-center gap-2 text-[13px] font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors"
                >
                  <Award size={14} /> Corriger les points manuellement
                </button>
              ) : (
                <div className="flex flex-col gap-2 max-w-md">
                  <p className="text-[12px] text-neutral-400">Correction additive (peut être négative) — journalisée dans l&apos;audit log avec la raison.</p>
                  {pointsError && <ErrorBanner message={pointsError} />}
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={pointsDelta}
                      onChange={(e) => setPointsDelta(e.target.value)}
                      placeholder="Delta (ex: -50 ou 200)"
                      className={`${inputCls} w-40`}
                    />
                    <input value={pointsReason} onChange={(e) => setPointsReason(e.target.value)} placeholder="Raison (obligatoire)" className={inputCls} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={submitPoints}
                      disabled={pointsSaving}
                      className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
                    >
                      {pointsSaving ? 'Enregistrement…' : 'Appliquer'}
                    </button>
                    <button onClick={() => setPointsOpen(false)} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {professional.badges.length > 0 && (
            <div className="mt-4 border-t border-neutral-100 dark:border-neutral-800 pt-4">
              <BadgesGrid userId={String(id)} badges={professional.badges} onChanged={load} />
            </div>
          )}
        </Card>
      )}

      {/* Salon possédé */}
      {salon_owned && (
        <Card className="p-5 flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50 mb-1">Salon géré</h2>
            <p className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">{salon_owned.name}</p>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              {salon_owned.city} · {salon_owned.hairdressers_count} membre(s)
            </p>
          </div>
          <Link
            href={`/admin/salons/${salon_owned.id}`}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            Voir le salon
          </Link>
        </Card>
      )}

      {/* Réservations récentes */}
      {recent_appointments.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <CalendarCheck size={15} className="text-neutral-400" />
            <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">Réservations récentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase">Rôle</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase">Avec</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase">Date</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recent_appointments.map((a, i) => {
                  const asClient = a.client_id === user.id;
                  return (
                    <tr key={a.id} className={i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''}>
                      <td className="px-5 py-2.5 text-[12px] text-neutral-400">{asClient ? 'Client' : 'Coiffeur'}</td>
                      <td className="px-3 py-2.5 text-[13px] text-neutral-900 dark:text-neutral-100">
                        {asClient ? a.hairdresser?.user?.name ?? '—' : a.client?.name ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-neutral-400">
                        {formatDate(a.appointment_date)} {a.appointment_time?.slice(0, 5)}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusPill status={a.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Avis récents */}
      {recent_reviews.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <Star size={15} className="text-neutral-400" />
            <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">Avis récents</h2>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {recent_reviews.map((r) => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                    {r.client?.id === user.id ? r.hairdresser?.user?.name ?? 'Coiffeur' : r.client?.name ?? 'Client'}
                  </span>
                  <span className="text-amber-500 text-[12px]">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{r.comment}</p>
                <p className="text-[11px] text-neutral-300 mt-1">{formatDate(r.created_at)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filleuls */}
      {referrals.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <UsersIcon size={15} className="text-neutral-400" />
            <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">Filleuls ({referrals.length})</h2>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {referrals.map((r) => (
              <Link key={r.id} href={`/admin/utilisateurs/${r.id}`} className="flex items-center justify-between px-5 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors">
                <div>
                  <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{r.name}</span>
                  <span className="text-[12px] text-neutral-400 ml-2">{r.email}</span>
                </div>
                <RolePill role={r.role} />
              </Link>
            ))}
          </div>
        </Card>
      )}

      <ConfirmModal
        open={!!confirm}
        title={confirm === 'delete' ? "Supprimer l'utilisateur" : isSuspended ? "Réactiver l'utilisateur" : "Suspendre l'utilisateur"}
        message={
          confirm === 'delete' ? (
            <>
              Supprimer définitivement <strong>{user.name}</strong> ? Cette action est <strong>irréversible</strong>.
            </>
          ) : isSuspended ? (
            <>Réactiver le compte de <strong>{user.name}</strong> ?</>
          ) : (
            <>Suspendre le compte de <strong>{user.name}</strong> ?</>
          )
        }
        confirmLabel={confirm === 'delete' ? 'Supprimer définitivement' : 'Confirmer'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === 'delete') handleDelete();
          else handleSuspend();
        }}
        loading={actionLoading}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/admin/utilisateurs" className="flex items-center gap-2 text-[13px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors w-fit">
      <ArrowLeft size={15} /> Retour aux utilisateurs
    </Link>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm p-4 text-center">
      <div className="text-[20px] font-bold text-neutral-900 dark:text-neutral-50 tabular-nums">{value}</div>
      <div className="text-[12px] text-neutral-400 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-neutral-300 mt-0.5">{sub}</div>}
    </div>
  );
}

/** Attribution/retrait manuel de badge — voir AdminUserController::assignBadge/removeBadge. */
function BadgesGrid({
  userId,
  badges,
  onChanged,
}: {
  userId: string;
  badges: BadgeCatalogEntry[];
  onChanged: () => void;
}) {
  const admin = getStoredAdminUser();
  const canManage = hasPermission(admin, PERMISSIONS.HAIRDRESSERS_BADGES_MANAGE);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  async function toggle(code: string, unlocked: boolean) {
    setBusyCode(code);
    try {
      if (unlocked) {
        await adminApi.delete(`/admin/users/${userId}/badges/${code}`);
      } else {
        await adminApi.post(`/admin/users/${userId}/badges`, { badge_code: code });
      }
      onChanged();
    } finally {
      setBusyCode(null);
      setConfirmRemove(null);
    }
  }

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-neutral-700 dark:text-neutral-300">
          Badges ({unlockedCount}/{badges.length})
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {badges.map((b) => (
          <div
            key={b.code}
            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[12px] ${
              b.unlocked
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-900 dark:text-emerald-300'
                : 'bg-neutral-50 border-neutral-100 text-neutral-400 dark:bg-neutral-900 dark:border-neutral-800'
            }`}
          >
            <span className="truncate font-medium">{b.name}</span>
            {canManage && (
              <button
                disabled={busyCode === b.code}
                onClick={() => (b.unlocked ? setConfirmRemove(b.code) : toggle(b.code, false))}
                className="flex-shrink-0 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-40"
                title={b.unlocked ? 'Retirer' : 'Attribuer manuellement'}
              >
                {b.unlocked ? <Minus size={13} /> : <Plus size={13} />}
              </button>
            )}
          </div>
        ))}
      </div>

      <ConfirmModal
        open={!!confirmRemove}
        title="Retirer le badge"
        message="Retirer ce badge attribué manuellement ? S'il est réellement débloqué par un critère organique, il pourra réapparaître au prochain recalcul."
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove && toggle(confirmRemove, true)}
        loading={!!busyCode}
      />
    </div>
  );
}
