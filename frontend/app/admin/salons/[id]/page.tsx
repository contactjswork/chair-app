'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, ShieldOff, UserX, UserCheck, ExternalLink, Users, Briefcase, Sofa, Trash2 } from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  formatDate,
  hasPermission,
  getStoredAdminUser,
  PERMISSIONS,
  type AdminSalonDetail,
} from '@/lib/adminApi';
import { Card, ConfirmModal, ErrorBanner, PermissionDenied, Skeleton, StatusPill, inputCls } from '../../_components/ui';

type ConfirmAction = { type: 'verify' | 'unverify' | 'suspend' | 'unsuspend' } | { type: 'remove_member'; profileId: number; name: string };

export default function SalonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const admin = getStoredAdminUser();
  const canManage = hasPermission(admin, PERMISSIONS.SALONS_MANAGE);

  const [detail, setDetail] = useState<AdminSalonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .get<AdminSalonDetail>(`/admin/salons/${id}`)
      .then(setDetail)
      .catch((e) => {
        if (e instanceof AdminApiError && e.isForbidden) setForbidden(true);
        else setError('Salon introuvable');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    // Chargement initial de la fiche — fetch au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function run() {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.type === 'verify') await adminApi.post(`/admin/salons/${id}/verify`);
      else if (confirm.type === 'unverify') await adminApi.post(`/admin/salons/${id}/unverify`);
      else if (confirm.type === 'suspend') await adminApi.post(`/admin/salons/${id}/suspend`, { reason: suspendReason || undefined });
      else if (confirm.type === 'unsuspend') await adminApi.post(`/admin/salons/${id}/unsuspend`);
      else if (confirm.type === 'remove_member') await adminApi.delete(`/admin/salons/${id}/members/${confirm.profileId}`);
      load();
    } catch {
      setError('Action impossible');
    } finally {
      setActionLoading(false);
      setConfirm(null);
      setSuspendReason('');
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
        <ErrorBanner message={error || 'Salon introuvable'} />
      </div>
    );
  }

  const { salon, stats, team, job_offers, chair_rentals } = detail;

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[24px] font-bold text-neutral-600 dark:text-neutral-300">
            {salon.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-[20px] font-bold text-neutral-900 dark:text-neutral-50">{salon.name}</h1>
              <StatusPill status={salon.suspended_at ? 'suspended' : 'active'} />
              {salon.is_verified && <StatusPill status="verified" />}
              {salon.is_chair_business && <StatusPill status="verified" labelOverride="CHAIR BUSINESS" />}
            </div>
            {salon.city && <p className="text-[13px] text-neutral-400">{salon.city}</p>}
            {salon.owner && (
              <p className="text-[13px] text-neutral-400 mt-0.5">
                Gérant :{' '}
                <Link href={`/admin/utilisateurs/${salon.owner.id}`} className="underline hover:text-neutral-700 dark:hover:text-neutral-200">
                  {salon.owner.name}
                </Link>{' '}
                ({salon.owner.email})
              </p>
            )}
            <p className="text-[12px] text-neutral-300 mt-1">Créé le {formatDate(salon.created_at, { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a
              href={`/app/salon/${salon.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <ExternalLink size={14} /> Profil public
            </a>
          </div>
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800">
            <ActionButton
              tone="blue"
              icon={salon.is_verified ? ShieldOff : ShieldCheck}
              label={salon.is_verified ? 'Retirer la vérification' : 'Vérifier le salon'}
              onClick={() => setConfirm({ type: salon.is_verified ? 'unverify' : 'verify' })}
            />
            <ActionButton
              tone="amber"
              icon={salon.suspended_at ? UserCheck : UserX}
              label={salon.suspended_at ? 'Réactiver' : 'Suspendre'}
              onClick={() => setConfirm({ type: salon.suspended_at ? 'unsuspend' : 'suspend' })}
            />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatBox label="Équipe" value={stats.hairdressers_count} />
        <StatBox label="Note moyenne" value={stats.avg_rating ? `★ ${stats.avg_rating.toFixed(1)}` : '—'} />
        <StatBox label="Avis cumulés" value={stats.reviews_count} />
        <StatBox label="Offres d'emploi" value={stats.job_offers_count} />
        <StatBox label="Fauteuils en location" value={stats.chair_rentals_count} />
      </div>

      {/* Équipe */}
      <Card>
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
          <Users size={15} className="text-neutral-400" />
          <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">Équipe ({team.length})</h2>
        </div>
        {team.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-neutral-400">Aucun membre</div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {team.map((m) => (
              <div key={m.profile_id} className="flex items-center justify-between gap-3 px-5 py-3">
                <Link href={`/admin/coiffeurs/${m.profile_id}`} className="flex-1 min-w-0 hover:underline">
                  <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{m.name}</p>
                  <p className="text-[12px] text-neutral-400">{m.email}</p>
                </Link>
                <span className="text-[11px] text-neutral-400">{m.is_independent ? 'Indépendant' : 'Salarié'}</span>
                {m.suspended && <StatusPill status="suspended" />}
                <span className="text-[13px] text-amber-500 font-medium">★ {m.avg_rating?.toFixed(1) ?? '—'}</span>
                {canManage && (
                  <button
                    onClick={() => setConfirm({ type: 'remove_member', profileId: m.profile_id, name: m.name })}
                    className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    title="Retirer de l'équipe"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {job_offers.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <Briefcase size={15} className="text-neutral-400" />
            <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">Offres d&apos;emploi ({job_offers.length})</h2>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {job_offers.map((j) => (
              <div key={j.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{j.title}</p>
                  <p className="text-[12px] text-neutral-400">
                    {j.job_type} · {j.contract_type} · {formatDate(j.created_at)}
                  </p>
                </div>
                <StatusPill status={j.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {chair_rentals.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <Sofa size={15} className="text-neutral-400" />
            <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">Annonces fauteuil ({chair_rentals.length})</h2>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {chair_rentals.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{c.title}</p>
                  <p className="text-[12px] text-neutral-400">
                    {c.space_type} · {formatDate(c.created_at)}
                  </p>
                </div>
                <StatusPill status={c.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <ConfirmModal
        open={!!confirm}
        title={
          confirm?.type === 'verify'
            ? 'Vérifier le salon'
            : confirm?.type === 'unverify'
            ? 'Retirer la vérification'
            : confirm?.type === 'suspend'
            ? 'Suspendre le salon'
            : confirm?.type === 'unsuspend'
            ? 'Réactiver le salon'
            : "Retirer de l'équipe"
        }
        danger={confirm?.type === 'suspend' || confirm?.type === 'unverify' || confirm?.type === 'remove_member'}
        message={
          confirm?.type === 'suspend' ? (
            <div className="flex flex-col gap-2">
              <p>Suspendre ce salon ? Il disparaît des listings publics, son équipe et son historique restent intacts.</p>
              <input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Raison (optionnel)" className={inputCls} />
            </div>
          ) : confirm?.type === 'remove_member' ? (
            <>
              Retirer <strong>{confirm.name}</strong> de l&apos;équipe ? Le coiffeur redevient indépendant, son compte n&apos;est pas touché.
            </>
          ) : confirm?.type === 'verify' ? (
            'Marquer ce salon comme vérifié (badge de confiance) ?'
          ) : confirm?.type === 'unverify' ? (
            'Retirer le badge de vérification ?'
          ) : (
            'Réactiver ce salon ?'
          )
        }
        onCancel={() => setConfirm(null)}
        onConfirm={run}
        loading={actionLoading}
      />
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, tone }: { icon: React.ElementType; label: string; onClick: () => void; tone: 'blue' | 'amber' }) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400',
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors ${tones[tone]}`}>
      <Icon size={14} /> {label}
    </button>
  );
}

function BackLink() {
  return (
    <Link href="/admin/salons" className="flex items-center gap-2 text-[13px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors w-fit">
      <ArrowLeft size={15} /> Retour aux salons
    </Link>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm p-4 text-center">
      <div className="text-[20px] font-bold text-neutral-900 dark:text-neutral-50 tabular-nums">{value}</div>
      <div className="text-[12px] text-neutral-400 mt-0.5">{label}</div>
    </div>
  );
}
