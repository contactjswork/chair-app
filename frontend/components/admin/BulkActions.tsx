'use client';

/**
 * Actions de masse de la liste utilisateurs admin (POST /admin/users/bulk).
 *
 * Mécanique en trois temps, alignée sur le contrat backend
 * (AdminBulkController) :
 *  1. dry_run — le serveur résout le lot (ids cochés OU filtres de la
 *     recherche courante), applique les exclusions (admins, compte courant)
 *     et renvoie un aperçu chiffré + la liste des ids éligibles ;
 *  2. confirmation — pour delete : phrase « SUPPRIMER N COMPTES » recopiée
 *     à la main + mot de passe admin re-saisi (revérifiés CÔTÉ SERVEUR) ;
 *  3. exécution — le front envoie les ids éligibles LOT PAR LOT de 100 :
 *     progression « 74/112 » gratuite, requêtes rejouables, pas de job en
 *     file (QUEUE_CONNECTION=sync partout).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, Download, Eye, EyeOff, Trash2, UserCheck, UserX, X } from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  type BulkAction,
  type BulkFilters,
  type BulkPreview,
  type BulkResult,
} from '@/lib/adminApi';

const BATCH_SIZE = 100;

export type BulkSelection = { ids: number[] } | { filters: BulkFilters };

const ACTION_LABELS: Record<Exclude<BulkAction, 'export_csv'>, { title: string; verb: string }> = {
  suspend: { title: 'Suspendre les comptes sélectionnés', verb: 'Suspendre' },
  unsuspend: { title: 'Réactiver les comptes sélectionnés', verb: 'Réactiver' },
  hide: { title: 'Masquer les profils coiffeur sélectionnés', verb: 'Masquer' },
  unhide: { title: 'Rendre visibles les profils sélectionnés', verb: 'Rendre visible' },
  delete: { title: 'Supprimer les comptes sélectionnés', verb: 'Supprimer définitivement' },
};

const SKIP_REASONS: Record<string, string> = {
  deja_suspendu: 'déjà suspendu',
  deja_actif: 'déjà actif',
  deja_masque: 'déjà masqué',
  deja_visible: 'déjà visible',
  deja_supprime: 'déjà supprimé',
  pas_de_profil_coiffeur: 'pas de profil coiffeur',
};

// ─── Barre de sélection ─────────────────────────────────────────────────────

export function BulkSelectionBar({
  count,
  canSuspend,
  canHide,
  canDelete,
  onAction,
  onExport,
  onClear,
  exporting,
}: {
  count: number;
  canSuspend: boolean;
  canHide: boolean;
  canDelete: boolean;
  onAction: (action: Exclude<BulkAction, 'export_csv'>) => void;
  onExport: () => void;
  onClear: () => void;
  exporting?: boolean;
}) {
  const btn =
    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold transition-colors disabled:opacity-50 min-h-[36px]';
  return (
    <div className="sticky top-0 z-40 bg-neutral-900 dark:bg-neutral-800 text-white rounded-2xl px-4 py-2.5 flex items-center gap-3 flex-wrap shadow-lg">
      <span className="text-[13px] font-bold tabular-nums whitespace-nowrap">{count.toLocaleString('fr')} sélectionné{count > 1 ? 's' : ''}</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {canSuspend && (
          <>
            <button onClick={() => onAction('suspend')} className={`${btn} bg-white/10 hover:bg-white/20`}>
              <UserX size={13} /> Suspendre
            </button>
            <button onClick={() => onAction('unsuspend')} className={`${btn} bg-white/10 hover:bg-white/20`}>
              <UserCheck size={13} /> Réactiver
            </button>
          </>
        )}
        {canHide && (
          <>
            <button onClick={() => onAction('hide')} className={`${btn} bg-white/10 hover:bg-white/20`}>
              <EyeOff size={13} /> Masquer
            </button>
            <button onClick={() => onAction('unhide')} className={`${btn} bg-white/10 hover:bg-white/20`}>
              <Eye size={13} /> Rendre visible
            </button>
          </>
        )}
        <button onClick={onExport} disabled={exporting} className={`${btn} bg-white/10 hover:bg-white/20`}>
          <Download size={13} /> {exporting ? 'Export…' : 'Exporter CSV'}
        </button>
        {canDelete && (
          <button onClick={() => onAction('delete')} className={`${btn} bg-red-500/90 hover:bg-red-500`}>
            <Trash2 size={13} /> Supprimer
          </button>
        )}
      </div>
      <button onClick={onClear} className="ml-auto p-2 rounded-lg hover:bg-white/10 transition-colors" title="Effacer la sélection">
        <X size={15} />
      </button>
    </div>
  );
}

// ─── Modale aperçu → confirmation → exécution ───────────────────────────────

type Phase = 'preview' | 'running' | 'done' | 'error';

export function BulkActionModal({
  action,
  selection,
  onClose,
  onDone,
}: {
  action: Exclude<BulkAction, 'export_csv'>;
  selection: BulkSelection;
  onClose: () => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('preview');
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [error, setError] = useState('');
  const [phrase, setPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<{
    succeeded: number;
    skipped: Array<{ id: number; reason: string }>;
    failed: Array<{ id: number; reason: string }>;
    modes: { purged: number; anonymized: number };
  } | null>(null);
  // Anti double-lancement (double-tap sur « Confirmer »).
  const runningRef = useRef(false);

  const isDelete = action === 'delete';
  const labels = ACTION_LABELS[action];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await adminApi.post<BulkPreview>('/admin/users/bulk', { action, ...selection, dry_run: true });
        if (!cancelled) setPreview(p);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof AdminApiError ? e.message : 'Erreur de chargement de l’aperçu');
          setPhase('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(async () => {
    if (!preview || runningRef.current) return;
    runningRef.current = true;
    setPhase('running');
    setError('');

    const ids = preview.eligible_ids;
    setProgress({ done: 0, total: ids.length });

    const agg = { succeeded: 0, skipped: [] as Array<{ id: number; reason: string }>, failed: [] as Array<{ id: number; reason: string }>, modes: { purged: 0, anonymized: 0 } };

    try {
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const body: Record<string, unknown> = { action, ids: batch };
        if (isDelete) {
          body.password = password;
          body.confirm_phrase = phrase;
          body.confirm_total = preview.eligible_count;
        }
        const res = await adminApi.post<BulkResult>('/admin/users/bulk', body);
        agg.succeeded += res.succeeded;
        agg.skipped.push(...res.skipped);
        agg.failed.push(...res.failed);
        if (res.modes) {
          agg.modes.purged += res.modes.purged;
          agg.modes.anonymized += res.modes.anonymized;
        }
        setProgress({ done: Math.min(i + batch.length, ids.length), total: ids.length });
      }
      setSummary(agg);
      setPhase('done');
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Erreur pendant l’exécution — les lots déjà traités restent appliqués.');
      setSummary(agg);
      setPhase('error');
    } finally {
      runningRef.current = false;
    }
  }, [preview, action, isDelete, password, phrase]);

  const impactRows: Array<[string, number]> = preview
    ? [
        ['Utilisateurs', preview.impact.users],
        ['Profils coiffeur', preview.impact.hairdresser_profiles],
        ['Réservations', preview.impact.appointments],
        ['Avis', preview.impact.reviews],
        ['Réalisations', preview.impact.posts],
        ['Salons possédés', preview.impact.salons_owned],
      ]
    : [];

  const confirmDisabled =
    !preview ||
    preview.eligible_count === 0 ||
    (isDelete && (phrase.trim() !== preview.confirm_phrase_expected || password.length === 0));

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-lg w-full p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDelete ? 'bg-red-50 text-red-500 dark:bg-red-500/15' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15'}`}>
            <AlertTriangle size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">{labels.title}</h3>
            {phase === 'preview' && !preview && !error && <p className="text-[13px] text-neutral-400 mt-1">Calcul de l’aperçu…</p>}
          </div>
        </div>

        {error && (
          <div className="px-3.5 py-2.5 bg-red-50 dark:bg-red-500/10 rounded-xl text-[12.5px] text-red-600 dark:text-red-400">{error}</div>
        )}

        {/* ─── Aperçu (dry run) ─── */}
        {preview && phase === 'preview' && (
          <>
            <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
              {impactRows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-3.5 py-2">
                  <span className="text-[13px] text-neutral-500 dark:text-neutral-400">{label}</span>
                  <span className="text-[13px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{value.toLocaleString('fr')}</span>
                </div>
              ))}
            </div>

            {(preview.excluded.admin_ids.length > 0 || preview.excluded.current_admin || preview.excluded.already_deleted > 0) && (
              <div className="px-3.5 py-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-[12.5px] text-amber-700 dark:text-amber-400 flex flex-col gap-1">
                {preview.excluded.current_admin && <span>Votre propre compte est exclu de l’opération.</span>}
                {preview.excluded.admin_ids.length > 0 && (
                  <span>
                    {preview.excluded.admin_ids.length} compte{preview.excluded.admin_ids.length > 1 ? 's' : ''} admin exclu
                    {preview.excluded.admin_ids.length > 1 ? 's' : ''} d’office (#{preview.excluded.admin_ids.join(', #')}).
                  </span>
                )}
                {preview.excluded.already_deleted > 0 && <span>{preview.excluded.already_deleted} compte{preview.excluded.already_deleted > 1 ? 's' : ''} déjà supprimé{preview.excluded.already_deleted > 1 ? 's' : ''} ignoré{preview.excluded.already_deleted > 1 ? 's' : ''}.</span>}
              </div>
            )}

            {isDelete && preview.modes && (
              <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                Le mode est choisi par le serveur : <strong>{preview.modes.anonymize}</strong> compte{preview.modes.anonymize > 1 ? 's' : ''} réel
                {preview.modes.anonymize > 1 ? 's' : ''} anonymisé{preview.modes.anonymize > 1 ? 's' : ''} (stratégie RGPD, la ligne reste sans
                identité) et <strong>{preview.modes.purge}</strong> compte{preview.modes.purge > 1 ? 's' : ''} de démonstration purgé
                {preview.modes.purge > 1 ? 's' : ''} physiquement.
              </p>
            )}

            {isDelete && preview.eligible_count > 0 && (
              <div className="flex flex-col gap-2.5">
                <label className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                  Pour confirmer, saisissez exactement : <strong className="text-neutral-900 dark:text-neutral-100 select-none">{preview.confirm_phrase_expected}</strong>
                </label>
                <input
                  type="text"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder={preview.confirm_phrase_expected ?? ''}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-[13px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-300"
                  autoComplete="off"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe admin"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-[13px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-red-300"
                  autoComplete="current-password"
                />
              </div>
            )}

            {preview.eligible_count === 0 && (
              <p className="text-[13px] text-neutral-400">Aucun compte éligible après exclusions — rien à faire.</p>
            )}
          </>
        )}

        {/* ─── Progression ─── */}
        {phase === 'running' && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-neutral-600 dark:text-neutral-300 tabular-nums">
              {progress.done}/{progress.total} comptes traités…
            </p>
            <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-neutral-900 dark:bg-white transition-all"
                style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        )}

        {/* ─── Résumé ─── */}
        {(phase === 'done' || (phase === 'error' && summary)) && summary && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[13px] text-neutral-900 dark:text-neutral-100">
              {phase === 'done' ? <CheckCircle2 size={15} className="text-emerald-500" /> : <Ban size={15} className="text-red-500" />}
              <span>
                <strong>{summary.succeeded}</strong> compte{summary.succeeded > 1 ? 's' : ''} traité{summary.succeeded > 1 ? 's' : ''}
                {isDelete && (summary.modes.purged > 0 || summary.modes.anonymized > 0)
                  ? ` (${summary.modes.anonymized} anonymisé${summary.modes.anonymized > 1 ? 's' : ''}, ${summary.modes.purged} purgé${summary.modes.purged > 1 ? 's' : ''})`
                  : ''}
              </span>
            </div>
            {summary.skipped.length > 0 && (
              <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                {summary.skipped.length} ignoré{summary.skipped.length > 1 ? 's' : ''} :{' '}
                {summary.skipped
                  .slice(0, 8)
                  .map((s) => `#${s.id} (${SKIP_REASONS[s.reason] ?? s.reason})`)
                  .join(', ')}
                {summary.skipped.length > 8 ? '…' : ''}
              </p>
            )}
            {summary.failed.length > 0 && (
              <p className="text-[12.5px] text-red-600 dark:text-red-400">
                {summary.failed.length} échec{summary.failed.length > 1 ? 's' : ''} :{' '}
                {summary.failed.slice(0, 8).map((f) => `#${f.id}`).join(', ')}
                {summary.failed.length > 8 ? '…' : ''} — détail dans l’audit log.
              </p>
            )}
          </div>
        )}

        {/* ─── Boutons ─── */}
        <div className="flex gap-3 justify-end">
          {phase === 'preview' || (phase === 'error' && !summary) ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors min-h-[40px]"
              >
                Annuler
              </button>
              {preview && preview.eligible_count > 0 && (
                <button
                  onClick={run}
                  disabled={confirmDisabled}
                  className={`px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-50 min-h-[40px] ${
                    isDelete ? 'bg-red-500 hover:bg-red-600' : 'bg-neutral-900 hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200'
                  }`}
                >
                  {labels.verb} {preview.eligible_count.toLocaleString('fr')} compte{preview.eligible_count > 1 ? 's' : ''}
                </button>
              )}
            </>
          ) : phase === 'running' ? (
            <button disabled className="px-4 py-2 rounded-xl text-[13px] font-semibold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 min-h-[40px]">
              En cours…
            </button>
          ) : (
            <button
              onClick={onDone}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-neutral-900 hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors min-h-[40px]"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Export CSV (sélection ou tous les filtrés) ─────────────────────────────

export function downloadUsersCsv(rows: Array<{ id: number; name: string; email: string; role: string; city: string | null; created_at: string; suspended_at: string | null }>) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = 'ID,Nom,Email,Rôle,Ville,Inscrit le,Statut';
  const lines = rows.map((u) =>
    [u.id, esc(u.name ?? ''), esc(u.email ?? ''), u.role, esc(u.city ?? ''), esc(u.created_at ?? ''), u.suspended_at ? 'suspendu' : 'actif'].join(',')
  );
  const blob = new Blob(['﻿' + [header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `utilisateurs_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
