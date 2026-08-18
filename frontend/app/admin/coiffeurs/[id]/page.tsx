'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, ShieldOff, Eye, EyeOff, Sparkles, FlaskConical, ExternalLink, Star, Building2 } from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  formatDate,
  hasPermission,
  getStoredAdminUser,
  PERMISSIONS,
  type AdminHairdresserDetail,
} from '@/lib/adminApi';
import { Card, ConfirmModal, ErrorBanner, PermissionDenied, Skeleton, StatusPill, inputCls } from '../../_components/ui';

type ConfirmType = 'verify' | 'unverify' | 'hide' | 'unhide' | 'chair_pick_set' | 'chair_pick_remove' | 'chair_plus_test_set' | 'chair_plus_test_remove';

export default function HairdresserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const admin = getStoredAdminUser();
  const canVerify = hasPermission(admin, PERMISSIONS.HAIRDRESSERS_VERIFY);
  const canVisibility = hasPermission(admin, PERMISSIONS.HAIRDRESSERS_VISIBILITY);
  const canChairPick = hasPermission(admin, PERMISSIONS.HAIRDRESSERS_CHAIR_PICK);
  const canChairPlusTest = hasPermission(admin, PERMISSIONS.HAIRDRESSERS_CHAIR_PLUS_TEST);

  const [detail, setDetail] = useState<AdminHairdresserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmType | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [chairPickDays, setChairPickDays] = useState('14');
  const [hideReason, setHideReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .get<AdminHairdresserDetail>(`/admin/hairdressers/${id}`)
      .then(setDetail)
      .catch((e) => {
        if (e instanceof AdminApiError && e.isForbidden) setForbidden(true);
        else setError('Profil introuvable');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    // Chargement initial de la fiche — fetch au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function run() {
    if (!confirm || !detail) return;
    setActionLoading(true);
    try {
      if (confirm === 'verify') await adminApi.post(`/admin/hairdressers/${id}/verify`);
      else if (confirm === 'unverify') await adminApi.post(`/admin/hairdressers/${id}/unverify`);
      else if (confirm === 'hide') await adminApi.post(`/admin/hairdressers/${id}/hide`, { reason: hideReason || undefined });
      else if (confirm === 'unhide') await adminApi.post(`/admin/hairdressers/${id}/unhide`);
      else if (confirm === 'chair_pick_set') await adminApi.post(`/admin/hairdressers/${id}/chair-pick`, { days: parseInt(chairPickDays, 10) || 14 });
      else if (confirm === 'chair_pick_remove') await adminApi.delete(`/admin/hairdressers/${id}/chair-pick`);
      else if (confirm === 'chair_plus_test_set') await adminApi.post(`/admin/hairdressers/${id}/chair-plus-test`);
      else if (confirm === 'chair_plus_test_remove') await adminApi.delete(`/admin/hairdressers/${id}/chair-plus-test`);
      load();
    } catch {
      setError('Action impossible');
    } finally {
      setActionLoading(false);
      setConfirm(null);
      setHideReason('');
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
        <ErrorBanner message={error || 'Profil introuvable'} />
      </div>
    );
  }

  const { profile, stats, chair_score, chair_score_adjustment, chair_level, badges, is_chair_plus, recent_reviews } = detail;
  const unlockedBadges = badges.filter((b) => b.unlocked);
  const chairPickActive = !!profile.chair_pick_until && new Date(profile.chair_pick_until) > new Date();

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[24px] font-bold text-neutral-600 dark:text-neutral-300">
            {profile.user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-[20px] font-bold text-neutral-900 dark:text-neutral-50">{profile.user?.name}</h1>
              <StatusPill status={profile.user?.suspended_at ? 'suspended' : 'active'} />
              {profile.identity_verified && <StatusPill status="verified" labelOverride="Identité vérifiée" />}
              {profile.is_hidden && <StatusPill status="hidden" labelOverride="Masqué" />}
              {is_chair_plus && <StatusPill status="verified" labelOverride="CHAIR+" />}
              {profile.chair_plus_test_mode && <StatusPill status="pending" labelOverride="CHAIR+ mode test" />}
              {chairPickActive && <StatusPill status="verified" labelOverride="Coup de cœur actif" />}
            </div>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{profile.user?.email}</p>
            {profile.city && <p className="text-[13px] text-neutral-400 mt-0.5">{profile.city}</p>}
            {profile.salon && (
              <p className="text-[13px] text-neutral-400 mt-1 flex items-center gap-1.5">
                <Building2 size={13} />
                <Link href={`/admin/salons/${profile.salon.id}`} className="underline hover:text-neutral-700 dark:hover:text-neutral-200">
                  {profile.salon.name}
                </Link>
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <a
              href={`/app/coiffeur/${profile.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <ExternalLink size={14} /> Profil public
            </a>
            <Link
              href={`/admin/utilisateurs/${profile.user_id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Fiche utilisateur
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800">
          {canVerify && (
            <ActionButton
              tone="blue"
              icon={profile.identity_verified ? ShieldOff : ShieldCheck}
              label={profile.identity_verified ? "Retirer l'identité vérifiée" : 'Vérifier identité'}
              onClick={() => setConfirm(profile.identity_verified ? 'unverify' : 'verify')}
            />
          )}
          {canVisibility && (
            <ActionButton
              tone="amber"
              icon={profile.is_hidden ? Eye : EyeOff}
              label={profile.is_hidden ? 'Rendre visible' : 'Masquer le profil'}
              onClick={() => setConfirm(profile.is_hidden ? 'unhide' : 'hide')}
            />
          )}
          {canChairPick && (
            <ActionButton
              tone="violet"
              icon={Sparkles}
              label={chairPickActive ? 'Retirer coup de cœur' : 'Mettre en Coup de cœur CHAIR'}
              onClick={() => setConfirm(chairPickActive ? 'chair_pick_remove' : 'chair_pick_set')}
            />
          )}
          {canChairPlusTest && (
            <ActionButton
              tone="slate"
              icon={FlaskConical}
              label={profile.chair_plus_test_mode ? 'Désactiver CHAIR+ (test)' : 'Activer CHAIR+ (test)'}
              onClick={() => setConfirm(profile.chair_plus_test_mode ? 'chair_plus_test_remove' : 'chair_plus_test_set')}
            />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBox label="Score CHAIR" value={chair_score} sub={chair_score_adjustment !== 0 ? `dont ${chair_score_adjustment > 0 ? '+' : ''}${chair_score_adjustment} admin` : undefined} />
        <StatBox label="Niveau" value={chair_level.name} />
        <StatBox label="Note moyenne" value={stats.avg_rating ? `★ ${stats.avg_rating.toFixed(1)}` : '—'} />
        <StatBox label="Avis" value={stats.reviews_count} />
        <StatBox label="RDV" value={stats.appointments_count} />
        <StatBox label="Services" value={stats.services_count} />
        <StatBox label="Followers" value={stats.followers_count} />
        <StatBox label="Visites vérifiées" value={stats.verified_visits_count} />
      </div>

      {profile.specialties.length > 0 && (
        <Card className="p-5">
          <h2 className="text-[13px] font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Spécialités</h2>
          <div className="flex flex-wrap gap-1.5">
            {profile.specialties.map((s) => (
              <span key={s.id} className="text-[11px] font-medium px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                {s.name}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="text-[13px] font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
          Badges ({unlockedBadges.length}/{badges.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {badges.map((b) => (
            <div
              key={b.code}
              className={`px-3 py-2 rounded-xl border text-[12px] font-medium truncate ${
                b.unlocked
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-900 dark:text-emerald-300'
                  : 'bg-neutral-50 border-neutral-100 text-neutral-400 dark:bg-neutral-900 dark:border-neutral-800'
              }`}
            >
              {b.name}
            </div>
          ))}
        </div>
      </Card>

      {recent_reviews.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <Star size={15} className="text-neutral-400" />
            <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">Avis reçus récents</h2>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {recent_reviews.map((r) => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{r.client?.name ?? 'Client'}</span>
                  <span className="text-amber-500 text-[12px]">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{r.comment}</p>
                <p className="text-[11px] text-neutral-300 mt-1">{formatDate(r.created_at)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <ConfirmModal
        open={!!confirm}
        title={confirmTitle(confirm)}
        danger={confirm === 'hide' || confirm === 'unverify' || confirm === 'chair_pick_remove' || confirm === 'chair_plus_test_remove'}
        message={
          confirm === 'hide' ? (
            <div className="flex flex-col gap-2">
              <p>Masquer ce profil des listings publics ? Réversible à tout moment.</p>
              <input value={hideReason} onChange={(e) => setHideReason(e.target.value)} placeholder="Raison (optionnel)" className={inputCls} />
            </div>
          ) : confirm === 'chair_pick_set' ? (
            <div className="flex flex-col gap-2">
              <p>Mettre ce profil en avant (badge Coup de cœur CHAIR) pendant :</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={chairPickDays}
                  onChange={(e) => setChairPickDays(e.target.value)}
                  className={`${inputCls} w-24`}
                />
                <span className="text-[13px] text-neutral-500">jours (max 90)</span>
              </div>
            </div>
          ) : (
            confirmMessage(confirm)
          )
        }
        confirmLabel="Confirmer"
        onCancel={() => setConfirm(null)}
        onConfirm={run}
        loading={actionLoading}
      />
    </div>
  );
}

function confirmTitle(c: ConfirmType | null): string {
  switch (c) {
    case 'verify':
      return "Vérifier l'identité";
    case 'unverify':
      return "Retirer l'identité vérifiée";
    case 'hide':
      return 'Masquer le profil';
    case 'unhide':
      return 'Rendre le profil visible';
    case 'chair_pick_set':
      return 'Coup de cœur CHAIR';
    case 'chair_pick_remove':
      return 'Retirer le Coup de cœur';
    case 'chair_plus_test_set':
      return 'Activer CHAIR+ en mode test';
    case 'chair_plus_test_remove':
      return 'Désactiver le mode test CHAIR+';
    default:
      return '';
  }
}

function confirmMessage(c: ConfirmType | null): React.ReactNode {
  switch (c) {
    case 'verify':
      return "Marquer l'identité comme vérifiée (badge de confiance) ?";
    case 'unverify':
      return "Retirer le badge d'identité vérifiée ?";
    case 'unhide':
      return 'Rendre ce profil à nouveau visible publiquement ?';
    case 'chair_pick_remove':
      return 'Retirer la mise en avant Coup de cœur CHAIR immédiatement ?';
    case 'chair_plus_test_set':
      return "Débloquer toutes les fonctionnalités CHAIR+ sur ce compte sans passer par Stripe — réservé aux tests. Aucun paiement réel, aucune facturation.";
    case 'chair_plus_test_remove':
      return 'Retirer immédiatement CHAIR+ (mode test) de ce compte ? Un abonnement Stripe réel ou une récompense de parrainage banquée resteraient inchangés.';
    default:
      return '';
  }
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  tone: 'blue' | 'amber' | 'violet' | 'slate';
}) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400',
    violet: 'bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-400',
    // Mode test CHAIR+ — délibérément neutre/sobre, pas de couleur "excitante"
    // comme violet (Coup de cœur) : ce n'est pas une récompense, c'est un
    // outil de QA réservé admin.
    slate: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300',
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors ${tones[tone]}`}>
      <Icon size={14} /> {label}
    </button>
  );
}

function BackLink() {
  return (
    <Link href="/admin/coiffeurs" className="flex items-center gap-2 text-[13px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors w-fit">
      <ArrowLeft size={15} /> Retour aux professionnels
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
