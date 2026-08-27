'use client';

/**
 * Panneau d'administration des notifications push APNs.
 *
 * Trois sections, dans l'ordre où on s'en sert :
 *   1. État de la chaîne push  — la configuration serveur est-elle prête ?
 *   2. Appareils enregistrés   — à qui peut-on réellement envoyer ?
 *   3. Envoyer une notification — l'envoi lui-même, avec aperçu et compte rendu.
 *
 * Parti pris d'honnêteté : « configuration prête » et « des appareils sont
 * joignables » sont deux choses DIFFÉRENTES, affichées séparément. Tant
 * qu'aucun appareil n'a enregistré de jeton, la page le dit et explique
 * pourquoi, au lieu de laisser croire à une panne.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Check,
  Info,
  Link2,
  Send,
  Smartphone,
  UserRound,
  X,
} from 'lucide-react';
import {
  AdminApiError,
  formatDateTime,
  pushApi,
  type Paginated,
  type PushDevice,
  type PushDiagnostics,
  type PushHistoryRow,
  type PushRecipient,
  type PushSendResult,
  type PushTarget,
} from '@/lib/adminApi';
import {
  Card,
  CardHeader,
  ConfirmModal,
  EmptyState,
  ErrorBanner,
  Pagination,
  PermissionDenied,
  RolePill,
  SearchInput,
  Skeleton,
  StatTile,
  Th,
  inputCls,
} from '../_components/ui';

const MAX_TITLE = 80;
const MAX_MESSAGE = 300;

/** Ligne de vérification du diagnostic — verte si OK, rouge sinon. */
function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string | null }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span
        className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
          ok
            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
            : 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
        }`}
      >
        {ok ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
      </span>
      <span className="text-[13px] text-neutral-700 dark:text-neutral-300 leading-snug">
        {label}
        {detail ? <span className="text-neutral-400"> — {detail}</span> : null}
      </span>
    </div>
  );
}

/** Aperçu de la bannière telle qu'elle apparaîtra sur l'écran verrouillé. */
function NotificationPreview({ title, message, url }: { title: string; message: string; url: string }) {
  return (
    <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2.5">Aperçu sur l&apos;appareil</p>
      <div className="rounded-2xl bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200/70 dark:border-neutral-700 p-3.5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-4 h-4 rounded-[5px] bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[8px] font-bold flex items-center justify-center">
            C
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">CHAIR</span>
          <span className="text-[11px] text-neutral-300 ml-auto">maintenant</span>
        </div>
        <p className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50 break-words">
          {title.trim() || 'Titre de la notification'}
        </p>
        <p className="text-[13px] text-neutral-600 dark:text-neutral-400 break-words mt-0.5">
          {message.trim() || 'Corps du message affiché sous le titre.'}
        </p>
      </div>
      <p className="text-[11.5px] text-neutral-400 mt-2.5 flex items-center gap-1.5">
        <Link2 size={12} className="flex-shrink-0" />
        Au tap, l&apos;application ouvrira {url.trim() ? <code className="text-neutral-500">{url.trim()}</code> : 'la page par défaut du type de notification'}
      </p>
    </div>
  );
}

export default function NotificationsPushPage() {
  // ─── Diagnostic ───────────────────────────────────────────────────────────
  const [diag, setDiag] = useState<PushDiagnostics | null>(null);
  const [diagLoading, setDiagLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');

  // ─── Appareils ────────────────────────────────────────────────────────────
  const [devices, setDevices] = useState<Paginated<PushDevice> | null>(null);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [devicePage, setDevicePage] = useState(1);

  // ─── Formulaire d'envoi ───────────────────────────────────────────────────
  const [target, setTarget] = useState<PushTarget>('user');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipients, setRecipients] = useState<PushRecipient[]>([]);
  const [selected, setSelected] = useState<PushRecipient | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [result, setResult] = useState<PushSendResult | null>(null);

  // ─── Historique ───────────────────────────────────────────────────────────
  const [history, setHistory] = useState<Paginated<PushHistoryRow> | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadDiagnostics = useCallback(async () => {
    setDiagLoading(true);
    try {
      setDiag(await pushApi.diagnostics());
    } catch (e) {
      if (e instanceof AdminApiError && e.isForbidden) setForbidden(true);
      else setError("Impossible de charger l'état de la chaîne push.");
    } finally {
      setDiagLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await pushApi.history({ per_page: 15 }));
    } catch {
      // L'historique est secondaire : son échec ne doit pas masquer le reste.
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadDevices = useCallback(async () => {
    setDevicesLoading(true);
    try {
      setDevices(await pushApi.devices({ search: deviceSearch, page: devicePage, per_page: 20 }));
    } catch (e) {
      if (e instanceof AdminApiError && e.isForbidden) setForbidden(true);
      else setError('Impossible de charger la liste des appareils.');
    } finally {
      setDevicesLoading(false);
    }
  }, [deviceSearch, devicePage]);

  // Chargements initiaux différés d'un tick : appeler loadDiagnostics()
  // directement dans le corps de l'effet déclencherait un setState
  // synchrone (règle react-hooks/set-state-in-effect), comme pour les
  // appareils juste en dessous.
  useEffect(() => {
    const t = setTimeout(() => {
      loadDiagnostics();
      loadHistory();
    }, 0);
    return () => clearTimeout(t);
  }, [loadDiagnostics, loadHistory]);

  useEffect(() => {
    const t = setTimeout(loadDevices, deviceSearch ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadDevices, deviceSearch]);

  // Recherche de destinataire (debounce 300 ms, minimum 2 caractères côté API).
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (target !== 'user' || recipientSearch.trim().length < 2) {
        if (!cancelled) setRecipients([]);
        return;
      }
      try {
        const json = await pushApi.recipients(recipientSearch.trim());
        if (!cancelled) {
          setRecipients(json.data);
          setShowSuggestions(true);
        }
      } catch {
        if (!cancelled) setRecipients([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [recipientSearch, target]);

  async function handleSend() {
    if (sending) return; // anti double-tap
    setSending(true);
    setSendError('');
    setResult(null);
    try {
      const payload = await pushApi.send({
        target,
        user_id: target === 'user' ? selected?.id ?? null : null,
        title: title.trim(),
        message: message.trim(),
        url: url.trim() || null,
      });
      setResult(payload);
      setTitle('');
      setMessage('');
      setUrl('');
      loadHistory();
      loadDevices();
      loadDiagnostics();
    } catch (e) {
      if (e instanceof AdminApiError) {
        const firstFieldError = e.errors ? Object.values(e.errors)[0]?.[0] : undefined;
        setSendError(firstFieldError ?? e.message);
      } else {
        setSendError("Erreur réseau : l'envoi n'a pas pu être effectué.");
      }
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  }

  if (forbidden) return <PermissionDenied />;

  const noDevices = diag !== null && diag.devices.total === 0;
  const canSend =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    (target !== 'user' || selected !== null) &&
    !sending;

  const targetLabel = target === 'user' ? selected?.name ?? 'un utilisateur' : 'tous les appareils actifs';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Notifications push</h1>
        <p className="text-[13px] text-neutral-400 mt-0.5">
          Vérifier la chaîne APNs, consulter les appareils enregistrés et envoyer une notification.
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* ─── 1. État de la chaîne push ─────────────────────────────────── */}
      <Card>
        <CardHeader
          title="État de la chaîne push"
          subtitle="Configuration Apple du serveur — recalculée à chaque ouverture de la page"
        />
        {diagLoading ? (
          <div className="p-5 flex flex-col gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-32" />
          </div>
        ) : !diag ? (
          <EmptyState text="État indisponible" />
        ) : (
          <div className="p-5 flex flex-col gap-5">
            {/* Verdict global */}
            <div
              className={`rounded-xl px-4 py-3.5 flex items-start gap-3 ${
                diag.ready
                  ? 'bg-emerald-50 dark:bg-emerald-500/10'
                  : 'bg-red-50 dark:bg-red-500/10'
              }`}
            >
              {diag.ready ? (
                <Check size={17} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" strokeWidth={3} />
              ) : (
                <AlertTriangle size={17} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={`text-[14px] font-semibold ${
                    diag.ready ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {diag.ready
                    ? 'Configuration serveur opérationnelle'
                    : 'Configuration serveur incomplète — aucun envoi possible'}
                </p>
                <p
                  className={`text-[12.5px] mt-0.5 ${
                    diag.ready ? 'text-emerald-700/80 dark:text-emerald-400/80' : 'text-red-600/80 dark:text-red-400/80'
                  }`}
                >
                  {diag.ready
                    ? "Apple accepte les demandes de ce serveur. Reste à ce que des appareils s'enregistrent."
                    : 'Corrigez les points ci-dessous, puis rechargez cette page.'}
                </p>
                {diag.blocking_issues.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {diag.blocking_issues.map((issue) => (
                      <li key={issue} className="text-[12.5px] text-red-700 dark:text-red-400 flex gap-2">
                        <span className="text-red-400">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {diag.warnings.map((w) => (
              <div
                key={w}
                className="rounded-xl px-4 py-3 bg-amber-50 dark:bg-amber-500/10 text-[12.5px] text-amber-800 dark:text-amber-400 flex items-start gap-2.5"
              >
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                {w}
              </div>
            ))}

            {/* Détail des vérifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Identifiants Apple</p>
                <CheckRow ok={diag.config.key_id_present} label="Identifiant de clé (Key ID) renseigné" />
                <CheckRow ok={diag.config.team_id_present} label="Identifiant d'équipe (Team ID) renseigné" />
                <CheckRow
                  ok={diag.config.key_readable}
                  label="Fichier de clé privée présent et lisible"
                  detail={diag.config.key_filename}
                />
                <CheckRow ok={diag.config.key_parseable} label="Clé privée au bon format" />
                <CheckRow ok={diag.config.jwt_signable} label="Signature d'authentification Apple fonctionnelle" />
              </div>
              <div className="mt-4 md:mt-0">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Serveur et cibles</p>
                <CheckRow ok={diag.config.curl_http2} label="Support HTTP/2 disponible sur ce serveur" />
                <CheckRow
                  ok={diag.config.environment === 'production'}
                  label="Environnement Apple"
                  detail={diag.config.environment}
                />
                <div className="pt-1.5 text-[12.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  <div>
                    Application client : <code className="text-[11.5px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">{diag.config.topic_client}</code>
                  </div>
                  <div className="mt-1">
                    Application pro : <code className="text-[11.5px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">{diag.config.topic_pro}</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Compteurs d'appareils */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile icon={Smartphone} value={diag.devices.total} label="Appareils enregistrés" />
              <StatTile icon={BellRing} value={diag.devices.active} label="Joignables" tone={diag.devices.active > 0 ? 'emerald' : 'neutral'} />
              <StatTile icon={X} value={diag.devices.disabled} label="Jetons périmés" tone={diag.devices.disabled > 0 ? 'amber' : 'neutral'} />
              <StatTile icon={UserRound} value={diag.devices.users_with_devices} label="Comptes équipés" />
            </div>

            {/* Encart honnêteté : 0 appareil n'est pas une panne. */}
            {noDevices && (
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700 px-4 py-3.5 flex items-start gap-3">
                <Info size={16} className="text-neutral-400 flex-shrink-0 mt-0.5" />
                <div className="text-[12.5px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-[13px]">
                    Aucun appareil enregistré pour l&apos;instant — ce n&apos;est pas une panne.
                  </p>
                  <p className="mt-1">
                    Un appareil n&apos;apparaît ici qu&apos;après avoir transmis son jeton Apple, ce que fait
                    l&apos;application au lancement une fois que la personne a accepté les notifications. Les versions
                    actuellement installées ne contiennent pas encore le module qui effectue cet envoi : les premiers
                    appareils apparaîtront après l&apos;installation du prochain build TestFlight.
                  </p>
                  <p className="mt-1">
                    D&apos;ici là, la partie serveur peut être vérifiée ci-dessus, mais aucune notification ne peut
                    atteindre un téléphone : il n&apos;y a personne à qui l&apos;adresser.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ─── 2. Appareils enregistrés ──────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Appareils enregistrés"
          subtitle="Un appareil par ligne. Les jetons sont volontairement tronqués."
        />
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <SearchInput
            value={deviceSearch}
            onChange={(v) => {
              setDeviceSearch(v);
              setDevicePage(1);
            }}
            placeholder="Rechercher par nom ou email…"
            className="max-w-md"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                <Th>Utilisateur</Th>
                <Th>Rôle</Th>
                <Th>Plateforme</Th>
                <Th>Appareil</Th>
                <Th>Application</Th>
                <Th>Jeton</Th>
                <Th>État</Th>
                <Th>Dernier envoi</Th>
                <Th>Enregistré le</Th>
              </tr>
            </thead>
            <tbody>
              {devicesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !devices?.data.length ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      text={
                        deviceSearch
                          ? 'Aucun appareil pour cette recherche'
                          : "Aucun appareil enregistré — voir l'explication dans l'état de la chaîne push"
                      }
                    />
                  </td>
                </tr>
              ) : (
                devices.data.map((d, i) => (
                  <tr
                    key={d.id}
                    className={i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''}
                  >
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{d.user_name ?? '—'}</p>
                      <p className="text-[11.5px] text-neutral-400">{d.user_email ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">{d.user_role ? <RolePill role={d.user_role} /> : '—'}</td>
                    <td className="px-4 py-3 text-[12.5px] text-neutral-600 dark:text-neutral-400">{d.platform ?? '—'}</td>
                    <td className="px-4 py-3 text-[12.5px] text-neutral-600 dark:text-neutral-400">{d.device_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <code className="text-[11.5px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                        {d.bundle_id ?? '—'}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-[11.5px] text-neutral-400">{d.token_masked}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                          d.enabled
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                            : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {d.enabled ? 'Joignable' : 'Jeton périmé'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-neutral-400">
                      {d.last_used_at ? formatDateTime(d.last_used_at) : 'Jamais'}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-neutral-400">{formatDateTime(d.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {devices && devices.last_page > 1 && (
          <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800">
            <Pagination page={devicePage} totalPages={devices.last_page} onChange={setDevicePage} />
          </div>
        )}
      </Card>

      {/* ─── 3. Envoyer une notification ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader title="Envoyer une notification" subtitle="Envoi push uniquement — aucune notification n'est ajoutée dans l'application." />
          <div className="p-5 flex flex-col gap-4">
            {sendError && <ErrorBanner message={sendError} />}

            {/* Destinataire */}
            <div>
              <label className="block text-[12px] font-semibold text-neutral-500 dark:text-neutral-400 mb-2">Destinataire</label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: 'user', label: 'Un utilisateur' },
                    { key: 'all_devices', label: 'Tous les appareils' },
                  ] as Array<{ key: PushTarget; label: string }>
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setTarget(opt.key);
                      setResult(null);
                      setSendError('');
                    }}
                    className={`min-h-[44px] px-3 rounded-xl text-[13px] font-semibold transition-colors ${
                      target === opt.key
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Règle des préférences, explicite selon le mode choisi. */}
              <p className="text-[11.5px] text-neutral-400 mt-2 leading-relaxed">
                {target === 'user' ? (
                  <>
                    Envoi ciblé de test ou de support : il part toujours, à toute heure, car aucun réglage de
                    notification ne couvre ce cas. À réserver aux vérifications et aux messages individuels.
                  </>
                ) : (
                  <>
                    Diffusion traitée comme une notification « promotions » : seules les personnes ayant activé ce
                    réglage la reçoivent, et rien ne part entre 21 h et 9 h.
                    {diag ? ` Plafonné à ${diag.limits.broadcast_max_users} destinataires par envoi.` : ''}
                  </>
                )}
              </p>
            </div>

            {target === 'user' && (
              <div>
                <label className="block text-[12px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                  Rechercher la personne
                </label>
                {selected ? (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100 truncate">{selected.name}</p>
                      <p className="text-[11.5px] text-neutral-400 truncate">{selected.email}</p>
                      <p className="text-[11.5px] text-neutral-400 mt-0.5">
                        {selected.active_devices_count === 0
                          ? 'Aucun appareil joignable sur ce compte'
                          : `${selected.active_devices_count} appareil${selected.active_devices_count > 1 ? 's' : ''} joignable${
                              selected.active_devices_count > 1 ? 's' : ''
                            }`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(null);
                        setRecipientSearch('');
                      }}
                      className="min-h-[44px] px-3 rounded-xl text-[12px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600 transition-colors flex-shrink-0"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      onFocus={() => recipients.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder="Nom ou adresse email…"
                      className={inputCls}
                    />
                    {showSuggestions && recipients.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-20 mt-1 overflow-hidden">
                        {recipients.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onMouseDown={() => {
                              setSelected(r);
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2.5 min-h-[44px] hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{r.name}</p>
                            <p className="text-[11.5px] text-neutral-400">
                              {r.email} · {r.active_devices_count} appareil{r.active_devices_count > 1 ? 's' : ''}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[12px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">Titre</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={MAX_TITLE}
                placeholder="Ex : Votre rendez-vous de demain"
                className={inputCls}
              />
              <div className="text-right text-[11px] text-neutral-300 mt-1 tabular-nums">
                {title.length}/{MAX_TITLE}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={MAX_MESSAGE}
                rows={3}
                placeholder="Corps de la notification…"
                className={`${inputCls} resize-none`}
              />
              <div className="text-right text-[11px] text-neutral-300 mt-1 tabular-nums">
                {message.length}/{MAX_MESSAGE}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                Lien de destination <span className="font-normal text-neutral-400">(facultatif)</span>
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                maxLength={200}
                placeholder="/app/notifications"
                className={inputCls}
              />
              <p className="text-[11.5px] text-neutral-400 mt-1">
                Chemin interne à l&apos;application, commençant par « / ». Laissé vide, la page par défaut du type de
                notification est utilisée.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!canSend}
              className="flex items-center justify-center gap-2 w-full min-h-[48px] bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-xl text-[14px] font-semibold hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white dark:border-neutral-900/30 dark:border-t-neutral-900 rounded-full animate-spin" />
                  Envoi en cours…
                </>
              ) : (
                <>
                  <Send size={15} /> Envoyer la notification
                </>
              )}
            </button>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <NotificationPreview title={title} message={message} url={url} />
          </Card>

          {/* Compte rendu détaillé du dernier envoi */}
          {result && (
            <Card>
              <CardHeader title="Résultat du dernier envoi" subtitle={result.title} />
              <div className="p-5 flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Tentés', value: result.attempted, tone: 'text-neutral-900 dark:text-neutral-50' },
                    { label: 'Réussis', value: result.sent, tone: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Échoués', value: result.failed, tone: 'text-red-500 dark:text-red-400' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 px-3 py-3 text-center">
                      <div className={`text-[22px] font-bold leading-none tabular-nums ${s.tone}`}>{s.value}</div>
                      <div className="text-[11.5px] text-neutral-400 mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>

                <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                  {result.recipients} destinataire{result.recipients > 1 ? 's' : ''} traité
                  {result.recipients > 1 ? 's' : ''}
                  {result.truncated
                    ? ` sur ${result.recipients_total} — le plafond par envoi a été atteint, relancez pour couvrir les suivants.`
                    : '.'}
                </p>

                {result.attempted === 0 && result.skipped.length === 0 && (
                  <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                    Aucun appareil à joindre : rien n&apos;a été envoyé.
                  </p>
                )}

                {result.failures.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Échecs</p>
                    <ul className="flex flex-col gap-1.5">
                      {result.failures.map((f) => (
                        <li key={f.device_id} className="text-[12.5px] text-neutral-600 dark:text-neutral-400">
                          <span className="text-neutral-900 dark:text-neutral-100 font-medium">{f.name}</span>
                          {f.device_name ? ` · ${f.device_name}` : ''} ·{' '}
                          <code className="text-[11.5px] text-neutral-400">{f.token_masked}</code>
                          <br />
                          {f.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.skipped.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Non envoyés</p>
                    <ul className="flex flex-col gap-1.5">
                      {result.skipped.map((s) => (
                        <li key={s.user_id} className="text-[12.5px] text-neutral-600 dark:text-neutral-400">
                          <span className="text-neutral-900 dark:text-neutral-100 font-medium">{s.name}</span> — {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Historique — reconstruit depuis le journal d'audit admin. */}
          <Card>
            <CardHeader title="Envois précédents" subtitle="Reconstitués depuis le journal d'audit administrateur" />
            {historyLoading ? (
              <div className="p-5 flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : !history?.data.length ? (
              <EmptyState text="Aucun envoi effectué depuis ce panneau" />
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {history.data.map((h) => (
                  <div key={h.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {h.title ?? '—'}
                        </p>
                        <p className="text-[12px] text-neutral-500 dark:text-neutral-400 line-clamp-1">{h.message ?? ''}</p>
                        <p className="text-[11.5px] text-neutral-400 mt-1">
                          {h.target === 'all_devices' ? 'Tous les appareils' : 'Un utilisateur'} · {h.sent} réussi
                          {h.sent > 1 ? 's' : ''} sur {h.attempted} tenté{h.attempted > 1 ? 's' : ''}
                          {h.skipped > 0 ? ` · ${h.skipped} non envoyé${h.skipped > 1 ? 's' : ''}` : ''} · par{' '}
                          {h.admin_name}
                        </p>
                      </div>
                      <span className="text-[11.5px] text-neutral-300 flex-shrink-0">{formatDateTime(h.sent_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Confirmer l'envoi"
        danger={target === 'all_devices'}
        confirmLabel="Envoyer"
        message={
          <>
            <p>
              Envoyer <span className="font-semibold text-neutral-900 dark:text-neutral-100">« {title.trim()} »</span> à{' '}
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{targetLabel}</span> ?
            </p>
            <p className="mt-2">
              {target === 'all_devices'
                ? "Cet envoi part vers tous les comptes ayant activé les notifications « promotions » et au moins un appareil joignable. Il ne peut pas être annulé une fois parti."
                : "Une notification envoyée ne peut pas être rappelée."}
            </p>
          </>
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleSend}
        loading={sending}
      />
    </div>
  );
}
