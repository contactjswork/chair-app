'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUp, ArrowDown, RotateCcw, Plus } from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  hasPermission,
  getStoredAdminUser,
  PERMISSIONS,
  type AdminFeatureFlag,
  type AdminAppSetting,
} from '@/lib/adminApi';
import { Card, ConfirmModal, EffectBadge, ErrorBanner, InfoTip, PermissionDenied, Skeleton, Toggle, inputCls } from '../_components/ui';

type Tab = 'flags' | 'settings' | 'home';

const GROUP_LABELS: Record<string, string> = {
  recherche: 'Recherche & algorithme',
  home: 'Home',
  gamification: 'Gamification',
  professionnels: 'Professionnels',
  moderation: 'Modération',
  general: 'Général',
};

const HOME_SECTION_LABELS: Record<string, string> = {
  home_personalized: 'Recommandations personnalisées',
  specialty_quick_links: 'Raccourcis spécialités',
  coup_de_coeur: 'Coup de cœur CHAIR',
  ranking: 'Classement local',
  nearby_map: 'Carte à proximité',
  realisations: 'Réalisations du moment',
  new_talents: 'Nouveaux talents',
};

interface HomeSection {
  key: string;
  enabled: boolean;
  order: number;
  title: string | null;
  limit: number | null;
}

function ConfigurationPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab = params.get('tab') === 'settings' ? 'settings' : params.get('tab') === 'home' ? 'home' : 'flags';
  const admin = getStoredAdminUser();
  const canFlags = hasPermission(admin, PERMISSIONS.FEATURE_FLAGS_MANAGE);
  const canSettings = hasPermission(admin, PERMISSIONS.SETTINGS_UPDATE);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Configuration</h1>
          <p className="text-[13px] text-neutral-400 mt-0.5">Réglages dynamiques — voir l&apos;étiquette Instantané / Build requis sur chaque paramètre</p>
        </div>
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
          {canFlags && (
            <TabButton active={tab === 'flags'} onClick={() => router.push('/admin/configuration?tab=flags')}>
              Feature Flags
            </TabButton>
          )}
          {canSettings && (
            <>
              <TabButton active={tab === 'settings'} onClick={() => router.push('/admin/configuration?tab=settings')}>
                App Settings
              </TabButton>
              <TabButton active={tab === 'home'} onClick={() => router.push('/admin/configuration?tab=home')}>
                Home
              </TabButton>
            </>
          )}
        </div>
      </div>

      {tab === 'flags' && canFlags && <FeatureFlagsTab />}
      {tab === 'settings' && canSettings && <AppSettingsTab />}
      {tab === 'home' && canSettings && <HomeTab />}
      {((tab === 'flags' && !canFlags) || ((tab === 'settings' || tab === 'home') && !canSettings)) && <PermissionDenied />}
    </div>
  );
}

// ─── Feature Flags ───────────────────────────────────────────────────────────

function FeatureFlagsTab() {
  const [flags, setFlags] = useState<AdminFeatureFlag[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newForm, setNewForm] = useState<{ key: string; description: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState<AdminFeatureFlag | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .get<{ data: AdminFeatureFlag[] }>('/admin/feature-flags')
      .then((r) => setFlags(r.data))
      .catch((e) => setError(e instanceof AdminApiError ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Chargement initial - fetch au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function applyToggle(flag: AdminFeatureFlag, enabled: boolean) {
    setToggling(true);
    setFlags((prev) => prev?.map((f) => (f.id === flag.id ? { ...f, enabled } : f)) ?? prev);
    try {
      await adminApi.patch(`/admin/feature-flags/${flag.id}`, { enabled });
    } catch {
      setError('Modification impossible');
      load();
    } finally {
      setToggling(false);
      setConfirmDisable(null);
    }
  }

  /** Activer un flag est réversible et sans risque immédiat pour l'affichage
   * courant des utilisateurs — appliqué directement. Le DÉSACTIVER retire une
   * fonctionnalité live pour tout le monde en quelques secondes (cache 60s),
   * donc c'est ce sens précis qui exige une confirmation explicite. */
  function toggle(flag: AdminFeatureFlag) {
    if (flag.enabled) setConfirmDisable(flag);
    else applyToggle(flag, true);
  }

  async function resetAll() {
    setResetting(true);
    try {
      await adminApi.post('/admin/feature-flags/reset');
      load();
    } catch {
      setError('Réinitialisation impossible');
    } finally {
      setResetting(false);
      setConfirmReset(false);
    }
  }

  async function createFlag() {
    if (!newForm?.key.trim()) return;
    setSaving(true);
    try {
      await adminApi.post('/admin/feature-flags', { key: newForm.key.trim(), description: newForm.description || null, enabled: false });
      setNewForm(null);
      load();
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Création impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorBanner message={error} />}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[12px] text-neutral-400 flex items-center gap-1.5">
          Chaque bascule invalide immédiatement le cache public (60s TTL) — aucun redéploiement nécessaire.
          <EffectBadge effect="instant" />
        </p>
        <div className="flex gap-2">
          <button onClick={() => setNewForm({ key: '', description: '' })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
            <Plus size={13} /> Nouveau flag
          </button>
          <button onClick={() => setConfirmReset(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
            <RotateCcw size={13} /> Mode Safe (tout activer)
          </button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="p-5 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {flags?.map((f) => (
              <div key={f.id} className="flex items-center gap-4 px-5 py-4">
                <Toggle checked={f.enabled} onChange={() => toggle(f)} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">{f.key}</p>
                  {f.description && <p className="text-[12px] text-neutral-400 mt-0.5">{f.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {newForm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-3">
            <h3 className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">Nouveau feature flag</h3>
            <input value={newForm.key} onChange={(e) => setNewForm({ ...newForm, key: e.target.value })} placeholder="clé (ex: new_feature_enabled)" className={inputCls} />
            <input value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} placeholder="description" className={inputCls} />
            <p className="text-[11px] text-neutral-400">Créé désactivé par défaut — à activer une fois prêt.</p>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setNewForm(null)} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors">
                Annuler
              </button>
              <button onClick={createFlag} disabled={saving} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-700 transition-colors disabled:opacity-50">
                {saving ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmReset}
        title="Mode Safe"
        danger={false}
        message="Réactiver tous les feature flags actuellement désactivés ? Utile pour revenir rapidement à un état de livraison connu en cas d'incident."
        confirmLabel="Tout réactiver"
        onCancel={() => setConfirmReset(false)}
        onConfirm={resetAll}
        loading={resetting}
      />

      <ConfirmModal
        open={!!confirmDisable}
        title="Désactiver la fonctionnalité"
        message={
          <>
            Désactiver <strong>{confirmDisable?.key}</strong> ? Cette fonctionnalité disparaît pour{' '}
            <strong>tous les utilisateurs</strong> en quelques secondes (cache 60s). {confirmDisable?.description}
          </>
        }
        confirmLabel="Désactiver"
        onCancel={() => setConfirmDisable(null)}
        onConfirm={() => confirmDisable && applyToggle(confirmDisable, false)}
        loading={toggling}
      />
    </div>
  );
}

// ─── App Settings ────────────────────────────────────────────────────────────

function AppSettingsTab() {
  const [settings, setSettings] = useState<AdminAppSetting[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmResetGroup, setConfirmResetGroup] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .get<{ data: AdminAppSetting[] }>('/admin/settings')
      .then((r) => setSettings(r.data.filter((s) => s.group !== 'home')))
      .catch((e) => setError(e instanceof AdminApiError ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Chargement initial - fetch au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function save(setting: AdminAppSetting, value: unknown) {
    try {
      await adminApi.patch(`/admin/settings/${setting.id}`, { value });
      load();
      return true;
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Enregistrement impossible');
      return false;
    }
  }

  async function resetGroup() {
    if (!confirmResetGroup) return;
    setResetting(true);
    try {
      await adminApi.post(`/admin/settings/${confirmResetGroup}/reset`);
      load();
    } catch {
      setError('Réinitialisation impossible');
    } finally {
      setResetting(false);
      setConfirmResetGroup(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (error) return <ErrorBanner message={error} />;

  const groups = Array.from(new Set(settings?.map((s) => s.group) ?? []));

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <Card key={group}>
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">{GROUP_LABELS[group] ?? group}</h2>
            <button
              onClick={() => setConfirmResetGroup(group)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <RotateCcw size={12} /> Mode Safe
            </button>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {settings
              ?.filter((s) => s.group === group)
              .map((s) => (
                <SettingRow key={s.id} setting={s} onSave={save} />
              ))}
          </div>
        </Card>
      ))}

      <ConfirmModal
        open={!!confirmResetGroup}
        title="Mode Safe"
        danger={false}
        message={`Réinitialiser tous les réglages du groupe "${GROUP_LABELS[confirmResetGroup ?? ''] ?? confirmResetGroup}" à leur valeur par défaut ?`}
        confirmLabel="Réinitialiser"
        onCancel={() => setConfirmResetGroup(null)}
        onConfirm={resetGroup}
        loading={resetting}
      />
    </div>
  );
}

function SettingRow({ setting, onSave }: { setting: AdminAppSetting; onSave: (s: AdminAppSetting, v: unknown) => Promise<boolean> }) {
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  const isCritical = setting.key.startsWith('recommendation_weight') || setting.key.includes('radius_tiers');

  async function handleSave(value: unknown) {
    setSaving(true);
    setLocalError('');
    const ok = await onSave(setting, value);
    if (!ok) setLocalError('Valeur refusée (bornes ou format invalide)');
    setSaving(false);
  }

  return (
    <div className="px-5 py-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">{setting.key}</p>
            {setting.description && <InfoTip text={setting.description} effect="instant" />}
          </div>
          {setting.min !== null && setting.min !== undefined && (
            <p className="text-[11px] text-neutral-400 mt-0.5">
              bornes : {setting.min} – {setting.max}
            </p>
          )}
        </div>
        <EffectBadge effect="instant" />
      </div>

      {localError && <p className="text-[11.5px] text-red-500">{localError}</p>}

      <SettingValueEditor setting={setting} saving={saving} onSave={handleSave} critical={isCritical} />
    </div>
  );
}

function SettingValueEditor({
  setting,
  saving,
  onSave,
  critical,
}: {
  setting: AdminAppSetting;
  saving: boolean;
  onSave: (v: unknown) => void;
  critical: boolean;
}) {
  const [value, setValue] = useState<unknown>(setting.value);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dirty = JSON.stringify(value) !== JSON.stringify(setting.value);

  function commit() {
    if (critical) setConfirmOpen(true);
    else onSave(value);
  }

  if (setting.type === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <Toggle checked={!!value} onChange={() => { const v = !value; setValue(v); onSave(v); }} disabled={saving} />
      </div>
    );
  }

  if (setting.type === 'integer' || setting.type === 'float') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value as number}
          step={setting.type === 'float' ? 0.01 : 1}
          onChange={(e) => setValue(setting.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value, 10))}
          className={`${inputCls} w-32`}
        />
        {dirty && (
          <button onClick={commit} disabled={saving} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 transition-colors disabled:opacity-50">
            {saving ? '…' : 'Appliquer'}
          </button>
        )}
        <ConfirmModal
          open={confirmOpen}
          title="Changer un paramètre d'algorithme"
          message="Ce réglage influence directement le classement des résultats de recherche pour tous les utilisateurs, en temps réel. Confirmer ?"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => { setConfirmOpen(false); onSave(value); }}
          loading={saving}
        />
      </div>
    );
  }

  if (setting.type === 'json' && setting.key.endsWith('_radius_tiers_km') && setting.key !== 'ranking_radius_tiers_km') {
    const arr = Array.isArray(value) ? (value as number[]) : [];
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {arr.map((km, i) => (
          <input
            key={i}
            type="number"
            value={km}
            onChange={(e) => {
              const next = [...arr];
              next[i] = Number(e.target.value);
              setValue(next);
            }}
            className={`${inputCls} w-20`}
          />
        ))}
        <span className="text-[11px] text-neutral-400">km, croissants</span>
        {dirty && (
          <button onClick={commit} disabled={saving} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 transition-colors disabled:opacity-50">
            {saving ? '…' : 'Appliquer'}
          </button>
        )}
        <ConfirmModal
          open={confirmOpen}
          title="Changer les paliers de rayon"
          message="Ce réglage influence directement la cascade géographique de recherche pour tous les utilisateurs, en temps réel. Confirmer ?"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => { setConfirmOpen(false); onSave(value); }}
          loading={saving}
        />
      </div>
    );
  }

  if (setting.key === 'ranking_radius_tiers_km') {
    const tiers = Array.isArray(value) ? (value as Array<{ km: number; label: string }>) : [];
    return (
      <div className="flex flex-col gap-2">
        {tiers.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="number" value={t.km} onChange={(e) => { const next = [...tiers]; next[i] = { ...t, km: Number(e.target.value) }; setValue(next); }} className={`${inputCls} w-20`} />
            <span className="text-[11px] text-neutral-400">km</span>
            <input value={t.label} onChange={(e) => { const next = [...tiers]; next[i] = { ...t, label: e.target.value }; setValue(next); }} className={inputCls} />
          </div>
        ))}
        {dirty && (
          <button onClick={() => onSave(value)} disabled={saving} className="self-start px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 transition-colors disabled:opacity-50">
            {saving ? '…' : 'Appliquer'}
          </button>
        )}
      </div>
    );
  }

  // Fallback générique JSON/string
  return (
    <div className="flex items-center gap-2">
      <input value={typeof value === 'string' ? value : JSON.stringify(value)} onChange={(e) => setValue(e.target.value)} className={inputCls} />
      {dirty && (
        <button onClick={() => onSave(value)} disabled={saving} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 transition-colors disabled:opacity-50">
          {saving ? '…' : 'Appliquer'}
        </button>
      )}
    </div>
  );
}

// ─── Home ────────────────────────────────────────────────────────────────────

function HomeTab() {
  const [setting, setSetting] = useState<AdminAppSetting | null>(null);
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .get<{ data: AdminAppSetting[] }>('/admin/settings', { group: 'home' })
      .then((r) => {
        const s = r.data.find((x) => x.key === 'home_sections');
        if (s) {
          setSetting(s);
          setSections([...(s.value as HomeSection[])].sort((a, b) => a.order - b.order));
        }
      })
      .catch((e) => setError(e instanceof AdminApiError ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Chargement initial - fetch au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next.map((s, i) => ({ ...s, order: i + 1 })));
  }

  function update(index: number, patch: Partial<HomeSection>) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function save() {
    if (!setting) return;
    setSaving(true);
    setError('');
    try {
      await adminApi.patch(`/admin/settings/${setting.id}`, { value: sections });
      load();
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-64" />;
  if (error) return <ErrorBanner message={error} />;
  if (!setting) return <ErrorBanner message="Réglage home_sections introuvable" />;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Présence, ordre, titre et limite des sections de la home client.</p>
        <InfoTip text="Pilote uniquement présence/ordre/titre/limite — le rendu de chaque section reste géré par le code. Pris en compte au prochain chargement de la home, sans build." effect="instant" />
      </div>
      <div className="flex flex-col gap-2 mt-4">
        {sections.map((s, i) => (
          <div key={s.key} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-neutral-400 hover:text-neutral-700 disabled:opacity-20">
                <ArrowUp size={13} />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === sections.length - 1} className="text-neutral-400 hover:text-neutral-700 disabled:opacity-20">
                <ArrowDown size={13} />
              </button>
            </div>
            <Toggle checked={s.enabled} onChange={() => update(i, { enabled: !s.enabled })} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">{HOME_SECTION_LABELS[s.key] ?? s.key}</p>
              <p className="text-[11px] text-neutral-400">{s.key}</p>
            </div>
            <input
              value={s.title ?? ''}
              onChange={(e) => update(i, { title: e.target.value || null })}
              placeholder="Titre affiché (défaut du code si vide)"
              className={`${inputCls} w-56`}
            />
            <input
              type="number"
              value={s.limit ?? ''}
              onChange={(e) => update(i, { limit: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="Limite"
              className={`${inputCls} w-20`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Card>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
        active ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700'
      }`}
    >
      {children}
    </button>
  );
}

export default function ConfigurationPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40" />}>
      <ConfigurationPageInner />
    </Suspense>
  );
}
