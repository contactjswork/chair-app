'use client';

/**
 * Maintenance — opérations de nettoyage de la base réservées au Super Admin.
 * Première section : purge des données de démonstration (@demo.getchair.app).
 *
 * Mécanique en deux temps, calquée sur le backend (AdminBulkController) :
 * Analyser (GET /admin/demo-data/analyze, lecture seule) → chiffres réels et
 * signalement des contenus de comptes RÉELS rattachés au périmètre démo,
 * puis Purger (POST /admin/demo-data/purge) avec confirmation forte : phrase
 * « SUPPRIMER N COMPTES » + mot de passe re-saisi, tous deux revérifiés côté
 * serveur. Le serveur refuse par construction tout compte hors du motif
 * @demo.getchair.app.
 */

import { useState } from 'react';
import { AlertTriangle, Database, RefreshCw, Trash2 } from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  formatDateTime,
  getStoredAdminUser,
  hasPermission,
  PERMISSIONS,
  type DemoDataAnalysis,
  type DemoPurgeResult,
} from '@/lib/adminApi';
import { Card, CardHeader, ErrorBanner, PermissionDenied } from '../_components/ui';

export default function MaintenancePage() {
  const admin = getStoredAdminUser();
  const canPurge = hasPermission(admin, PERMISSIONS.USERS_DELETE);

  const [analysis, setAnalysis] = useState<DemoDataAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [purgeOpen, setPurgeOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<DemoPurgeResult | null>(null);
  const [purgeError, setPurgeError] = useState('');

  async function analyze() {
    setAnalyzing(true);
    setError('');
    try {
      const res = await adminApi.get<DemoDataAnalysis>('/admin/demo-data/analyze');
      setAnalysis(res);
    } catch (e) {
      if (e instanceof AdminApiError && e.isForbidden) setForbidden(true);
      else setError('Analyse impossible');
    } finally {
      setAnalyzing(false);
    }
  }

  async function purge(): Promise<boolean> {
    if (!analysis || purging) return false;
    setPurging(true);
    setPurgeError('');
    try {
      const res = await adminApi.post<DemoPurgeResult>('/admin/demo-data/purge', {
        password,
        confirm_phrase: phrase,
      });
      setPurgeResult(res);
      setPhrase('');
      setPassword('');
      // Re-photographie la base : si remaining > 0 (budget de temps serveur
      // atteint), l'admin relance la purge avec la nouvelle phrase attendue.
      await analyze();
      return true;
    } catch (e) {
      setPurgeError(e instanceof AdminApiError ? e.message : 'Purge impossible');
      return false;
    } finally {
      setPurging(false);
    }
  }

  if (forbidden || !canPurge) return <PermissionDenied />;

  const crossLinkRows: Array<[string, number, string]> = analysis
    ? [
        ['Avis de clients réels sur des coiffeurs démo', analysis.cross_links.real_reviews_on_demo_hairdressers, 'supprimés avec le coiffeur'],
        ['RDV de clients réels chez des coiffeurs démo', analysis.cross_links.real_appointments_with_demo_hairdressers, 'supprimés avec le coiffeur'],
        ['Coiffeurs réels rattachés à un salon démo', analysis.cross_links.real_hairdressers_in_demo_salons, 'détachés du salon, pas supprimés'],
        ['Utilisateurs réels parrainés par un compte démo', analysis.cross_links.real_users_referred_by_demo, 'lien de parrainage effacé'],
      ]
    : [];
  const hasCrossLinks = crossLinkRows.some(([, n]) => n > 0);

  const countRows: Array<[string, number]> = analysis
    ? [
        ['Comptes de démonstration', analysis.counts.users],
        ['Profils coiffeur', analysis.counts.hairdresser_profiles],
        ['Salons (gérant démo)', analysis.counts.salons_owned],
        ['Réservations', analysis.counts.appointments],
        ['Avis émis par des clients démo', analysis.counts.reviews_by_demo_clients],
        ['Avis reçus par des coiffeurs démo', analysis.counts.reviews_on_demo_hairdressers],
        ['Réalisations', analysis.counts.posts],
        ['Offres d’emploi', analysis.counts.job_offers],
        ['Annonces de fauteuils', analysis.counts.chair_rentals],
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Maintenance</h1>
        <p className="text-[13px] text-neutral-400 mt-0.5">Opérations de nettoyage de la base — réservé Super Admin</p>
      </div>

      {error && <ErrorBanner message={error} />}

      <Card>
        <CardHeader
          title="Données de démonstration"
          subtitle={`Comptes dont l’email se termine par ${analysis?.suffix ?? '@demo.getchair.app'} — et uniquement ceux-là`}
          action={
            <button
              onClick={analyze}
              disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-[13px] font-semibold hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 min-h-[40px]"
            >
              {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
              {analysis ? 'Réanalyser' : 'Analyser'}
            </button>
          }
        />

        {!analysis && (
          <div className="px-5 py-10 text-center text-[13px] text-neutral-400">
            Lancez l’analyse pour photographier les données de démonstration avant toute purge. L’analyse ne modifie rien.
          </div>
        )}

        {analysis && (
          <div className="p-5 flex flex-col gap-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {countRows.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-neutral-100 dark:border-neutral-800 px-4 py-3">
                  <div className="text-[20px] font-bold text-neutral-900 dark:text-neutral-50 tabular-nums leading-none">{value.toLocaleString('fr')}</div>
                  <div className="text-[12px] text-neutral-400 mt-1.5">{label}</div>
                </div>
              ))}
            </div>

            {analysis.admin_in_scope_ids.length > 0 && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-[12.5px] text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                  {analysis.admin_in_scope_ids.length} compte(s) ADMIN matchent le motif démo (#{analysis.admin_in_scope_ids.join(', #')}) — ils
                  seront exclus de la purge, mais vérifiez pourquoi ils existent.
                </span>
              </div>
            )}

            {hasCrossLinks ? (
              <div className="px-4 py-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[12.5px] font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={13} /> Contenus de comptes réels rattachés au périmètre démo
                </div>
                {crossLinkRows
                  .filter(([, n]) => n > 0)
                  .map(([label, n, effect]) => (
                    <p key={label} className="text-[12.5px] text-amber-700 dark:text-amber-400">
                      {n.toLocaleString('fr')} — {label} ({effect}).
                    </p>
                  ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-neutral-400">
                Aucun contenu de compte réel n’est rattaché aux données de démonstration — la purge n’affecte que le périmètre démo.
              </p>
            )}

            <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-neutral-50/60 dark:bg-neutral-900/50 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Échantillon ({analysis.sample.length} premiers comptes)
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {analysis.sample.map((u) => (
                  <div key={u.id} className="px-4 py-2 flex items-center justify-between gap-3 text-[12.5px]">
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium truncate">{u.name}</span>
                    <span className="text-neutral-400 truncate">{u.email}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[12px] text-neutral-400">Analyse du {formatDateTime(analysis.generated_at)}</p>
              <button
                onClick={() => {
                  setPurgeResult(null);
                  setPurgeError('');
                  setPurgeOpen(true);
                }}
                disabled={analysis.purgeable_count === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-50 min-h-[40px]"
              >
                <Trash2 size={14} /> Purger les données de démonstration
              </button>
            </div>

            {purgeResult && (
              <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-[12.5px] text-neutral-600 dark:text-neutral-300 flex flex-col gap-1">
                <span>
                  Purge terminée : <strong>{purgeResult.succeeded}</strong> compte{purgeResult.succeeded > 1 ? 's' : ''} supprimé
                  {purgeResult.succeeded > 1 ? 's' : ''} définitivement.
                </span>
                {purgeResult.failed.length > 0 && (
                  <span className="text-red-600 dark:text-red-400">{purgeResult.failed.length} échec(s) — détail dans l’audit log.</span>
                )}
                {purgeResult.remaining > 0 && (
                  <span>
                    {purgeResult.remaining} compte{purgeResult.remaining > 1 ? 's' : ''} restant{purgeResult.remaining > 1 ? 's' : ''} (budget de
                    temps serveur atteint) — relancez la purge avec la nouvelle phrase affichée.
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ─── Modale de confirmation forte ─── */}
      {purgeOpen && analysis && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 dark:bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">Purger les données de démonstration</h3>
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Suppression <strong>physique et irréversible</strong> de {analysis.purgeable_count.toLocaleString('fr')} comptes démo et de tout
                  leur contenu (profils, salons, réservations, avis, réalisations). Le serveur refuse tout compte hors du motif{' '}
                  <code className="text-[11.5px] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">{analysis.suffix}</code>.
                </p>
              </div>
            </div>

            {purgeError && (
              <div className="px-3.5 py-2.5 bg-red-50 dark:bg-red-500/10 rounded-xl text-[12.5px] text-red-600 dark:text-red-400">{purgeError}</div>
            )}

            <div className="flex flex-col gap-2.5">
              <label className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                Pour confirmer, saisissez exactement :{' '}
                <strong className="text-neutral-900 dark:text-neutral-100 select-none">{analysis.confirm_phrase_expected}</strong>
              </label>
              <input
                type="text"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder={analysis.confirm_phrase_expected}
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

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPurgeOpen(false)}
                disabled={purging}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 min-h-[40px]"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  // Ne ferme la modale qu'en cas de succès — une erreur
                  // (phrase/mot de passe) reste visible pour être corrigée.
                  const ok = await purge();
                  if (ok) setPurgeOpen(false);
                }}
                disabled={purging || phrase.trim() !== analysis.confirm_phrase_expected || password.length === 0}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 min-h-[40px]"
              >
                {purging ? 'Purge en cours…' : 'Purger définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
