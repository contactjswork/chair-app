'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, BadgeCheck, Check, HelpCircle, Trophy, X } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api, leaderboard, specialtyProgress } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/types';
import type {
  ApiSpecialty, ApiSpecialtyLeaderboardEntry, ApiMySpecialtyRank, ApiSpecialtyProgress,
} from '@/lib/types';
import BottomSheet from '@/components/ui/BottomSheet';
import ProSection from '@/components/pro/ProSection';
import { CARTE, CARTE_TAP, CARTE_SOMBRE } from '@/lib/proStyle';

/**
 * Classement à l'intérieur de CHAIR PRO. Le seul accès existant pointait vers
 * /app/classements, c'est-à-dire l'app CLIENT ouverte dans un autre onglet :
 * un coiffeur qui voulait voir sa place sortait de son espace pro et n'y
 * revenait pas. Même donnée, mêmes endpoints — mais posée dans le shell pro
 * et cadrée sur la vraie question d'un pro : où je me situe, et à combien de
 * points est la place au-dessus.
 */

type GeoScope = 'city' | 'country';

// ── Une ligne de classement ─────────────────────────────────────────────────
function RankRow({ entry, isMe }: { entry: ApiSpecialtyLeaderboardEntry; isMe: boolean }) {
  const avatar = resolveMediaUrl(entry.avatar);
  const initial = (entry.name ?? '?').charAt(0).toUpperCase();

  return (
    <Link
      href={`/app/coiffeur/${entry.slug}`}
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${isMe ? 'bg-neutral-50' : 'active:bg-neutral-50'}`}
    >
      <span className={`w-7 flex-shrink-0 text-center text-[13px] tabular-nums ${entry.rank <= 3 ? 'font-bold text-neutral-900' : 'text-neutral-400'}`}>
        {entry.rank}
      </span>

      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center flex-shrink-0">
        {avatar
          ? <Image src={avatar} alt={entry.name} fill className="object-cover" sizes="40px" />
          : <span className="text-[13px] font-semibold text-neutral-500">{initial}</span>}
      </div>

      <div className="flex-1 min-w-0">
        <p className="flex items-center gap-1.5 min-w-0">
          <span className="text-[15px] text-neutral-900 truncate">{entry.name}</span>
          {entry.is_verified && <BadgeCheck size={13} className="text-neutral-900 flex-shrink-0" />}
          {isMe && (
            <span className="text-[10px] font-semibold text-white bg-neutral-900 px-1.5 py-0.5 rounded-full flex-shrink-0">Vous</span>
          )}
        </p>
        <p className="text-[12px] text-neutral-400 truncate mt-0.5">
          {entry.is_reference ? 'Référence — Top 1%' : entry.level_name}
          {entry.city && <> · {entry.city}</>}
        </p>
      </div>
    </Link>
  );
}

// ── Sélecteur (spécialité / zone) ───────────────────────────────────────────
function PickerSheet({
  title, options, selected, onSelect, onClose,
}: {
  title: string;
  options: { value: string; label: string; hint?: string }[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet onClose={onClose} maxHeight="max-h-[75vh]">
      <div className="p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[17px] font-bold text-neutral-900 tracking-tight">{title}</p>
          <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100">
            <X size={15} />
          </button>
        </div>
        <div className={`${CARTE} overflow-hidden divide-y divide-neutral-50`}>
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onSelect(o.value); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-neutral-100/70 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[15px] text-neutral-900 truncate">{o.label}</p>
                {o.hint && <p className="text-[12px] text-neutral-400 mt-0.5 truncate">{o.hint}</p>}
              </div>
              {o.value === selected && <Check size={16} className="text-neutral-900 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}

function ExplainSheet({ onClose }: { onClose: () => void }) {
  const points = [
    "La qualité et la quantité des avis vérifiés — un avis isolé ne dépasse jamais un profil aux avis constants.",
    "L'activité récente et la régularité des publications.",
    'La qualité du profil et du portfolio.',
    'La pertinence dans la spécialité concernée.',
    'La zone géographique quand un filtre local est appliqué.',
  ];
  return (
    <BottomSheet onClose={onClose}>
      <div className="p-5 pb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[17px] font-bold text-neutral-900 tracking-tight">Comment fonctionne le classement ?</p>
          <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 flex-shrink-0">
            <X size={15} />
          </button>
        </div>
        <p className="text-[13px] text-neutral-500 mb-4 leading-relaxed">
          Votre position dépend de plusieurs signaux combinés, jamais d&apos;un seul chiffre :
        </p>
        <ul className="space-y-2.5 mb-4">
          {points.map((p, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] text-neutral-700 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 mt-1.5 flex-shrink-0" />
              {p}
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-neutral-400 leading-relaxed">
          Une activité forte fait progresser vite : l&apos;ancienneté seule ne garantit aucune place.
        </p>
      </div>
    </BottomSheet>
  );
}

export default function ProClassementsPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);

  const city = user?.hairdresser_profile?.city ?? null;
  const myProfileId = user?.hairdresser_profile?.id ?? null;

  const [specialties,  setSpecialties]  = useState<ApiSpecialty[]>([]);
  const [mine,         setMine]         = useState<ApiSpecialtyProgress[]>([]);
  const [specialtyId,  setSpecialtyId]  = useState<number | null>(null);
  const [scope,        setScope]        = useState<GeoScope>(city ? 'city' : 'country');
  const [entries,      setEntries]      = useState<ApiSpecialtyLeaderboardEntry[]>([]);
  const [myRank,       setMyRank]       = useState<ApiMySpecialtyRank | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState(false);
  const [sheet,        setSheet]        = useState<'specialty' | 'scope' | 'explain' | null>(null);

  // Spécialité par défaut : celle où le coiffeur est le plus fort (la liste
  // arrive déjà triée par score décroissant du backend). Le classement
  // s'ouvre donc directement sur la vue qui le concerne, pas sur un choix.
  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      api.get<ApiSpecialty[]>('/specialties'),
      specialtyProgress.mine(),
    ]).then(([all, own]) => {
      const catalog = all.status === 'fulfilled' && Array.isArray(all.value) ? all.value : [];
      const ownRows = own.status === 'fulfilled' ? own.value.specialties : [];
      setSpecialties(catalog);
      setMine(ownRows);
      // Repli sur le catalogue quand le coiffeur n'a encore déclaré aucune
      // spécialité : la page montre un vrai classement plutôt qu'un squelette
      // figé, et la carte du haut l'invite à en ajouter une.
      const fallback = ownRows[0]?.specialty_id ?? catalog[0]?.id ?? null;
      setSpecialtyId((cur) => cur ?? fallback);
      if (fallback === null) setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !specialtyId) return;
    let cancelled = false;

    async function load(id: number) {
      setLoading(true);
      setLoadError(false);

      // Le rang privé doit être calculé sur EXACTEMENT la même vue que la
      // liste publique (même spécialité, même zone), sinon "vous êtes 3e"
      // ne correspond à rien de ce qui est affiché dessous.
      const geoParams = scope === 'city' && city
        ? { geo: 'city' as const, geoValue: city }
        : { geo: 'country' as const };

      const [list, rank] = await Promise.allSettled([
        leaderboard.bySpecialty({ specialtyId: id, limit: 30, ...geoParams }),
        leaderboard.mySpecialtyRank({ specialtyId: id, ...geoParams }),
      ]);
      if (cancelled) return;

      if (list.status === 'fulfilled') setEntries(list.value.results);
      else { setEntries([]); setLoadError(true); }
      setMyRank(rank.status === 'fulfilled' ? rank.value : null);
      setLoading(false);
    }

    load(specialtyId);

    return () => { cancelled = true; };
  }, [user, specialtyId, scope, city]);

  const specialtyName = useMemo(
    () => specialties.find((s) => s.id === specialtyId)?.name
      ?? mine.find((s) => s.specialty_id === specialtyId)?.specialty_name
      ?? null,
    [specialties, mine, specialtyId],
  );

  const zoneLabel = scope === 'city' && city ? city : 'France';
  const visibleIds = new Set(entries.map((e) => e.id));
  const isMine = !!mine.find((s) => s.specialty_id === specialtyId);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Options de spécialité : les siennes d'abord (avec son score), puis le
  // reste du catalogue.
  const mineIds = new Set(mine.map((s) => s.specialty_id));
  const specialtyOptions = [
    ...mine.map((s) => ({
      value: String(s.specialty_id),
      label: s.specialty_name ?? 'Spécialité',
      hint: 'Votre spécialité',
    })),
    ...specialties
      .filter((s) => !mineIds.has(s.id))
      .map((s) => ({ value: String(s.id), label: s.name })),
  ];

  return (
    <>
      <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 h-14 flex items-center md:hidden">
        <Link href="/pro" aria-label="Retour" className="relative before:absolute before:-inset-2.5 before:content-[''] flex items-center text-neutral-500 hover:text-neutral-900 transition-colors mr-auto p-1 -ml-1 rounded-lg">
          <ArrowLeft size={18} />
        </Link>
        <span className="text-sm font-bold tracking-tight text-neutral-900 absolute left-1/2 -translate-x-1/2">Classement</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-12">

        <div className="hidden md:flex items-center gap-3 mb-8">
          <Link href="/pro" aria-label="Retour" className="flex items-center text-neutral-400 hover:text-neutral-700 transition-colors p-1 -ml-1 rounded-lg">
            <ArrowLeft size={16} />
          </Link>
          <span className="text-neutral-200">/</span>
          <h1 className="text-lg font-bold text-neutral-900">Classement</h1>
        </div>

        {/* ── Ma position ── */}
        <p className="text-[13px] text-neutral-400">{specialtyName ?? 'Classement'} · {zoneLabel}</p>
        <h2 className="text-[28px] font-bold text-neutral-900 tracking-[-0.02em] leading-tight mt-0.5">
          Où je me situe
        </h2>

        <div className={`mt-6 ${CARTE_SOMBRE} px-6 py-7`}>
          {loading ? (
            <div className="h-12 flex items-center">
              <div className="h-3 w-32 bg-white/10 rounded-full animate-pulse" />
            </div>
          ) : !isMine ? (
            <>
              <p className="text-[15px] text-white/60 leading-relaxed">
                {specialtyName ?? 'Cette spécialité'} n&apos;est pas sur votre profil : vous regardez le classement des autres.
              </p>
              <Link href="/pro/profil" className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white transition-colors">
                Ajouter cette spécialité <ArrowRight size={14} />
              </Link>
            </>
          ) : myRank?.ranked ? (
            <>
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/40">Votre position</p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="text-[56px] font-bold text-white tracking-[-0.04em] leading-none tabular-nums">
                  #{myRank.rank}
                </p>
                <p className="text-[13px] text-white/40 flex-shrink-0 pb-1.5">
                  sur {myRank.total} coiffeur{(myRank.total ?? 0) > 1 ? 's' : ''}
                </p>
              </div>
              <p className="mt-5 pt-5 border-t border-white/10 text-[13px] text-white/60 leading-relaxed">
                {myRank.points_to_next
                  ? <>Encore <span className="text-white font-semibold">{myRank.points_to_next} point{myRank.points_to_next > 1 ? 's' : ''}</span> pour prendre la {(myRank.rank ?? 1) - 1}<sup>e</sup> place.</>
                  : 'Personne devant vous sur cette spécialité.'}
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/40">Votre position</p>
              <p className="mt-2 text-[19px] font-semibold text-white leading-snug">Pas encore classé</p>
              <Link href="/pro/portfolio" className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white transition-colors">
                Publiez et récoltez des avis vérifiés <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>

        {/* ── Filtres ── */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setSheet('specialty')}
            className={`flex-1 min-w-0 ${CARTE_TAP} px-4 py-3 text-left`}
          >
            <p className="text-[11px] text-neutral-400">Spécialité</p>
            <p className="text-[14px] font-semibold text-neutral-900 truncate mt-0.5">{specialtyName ?? '—'}</p>
          </button>
          <button
            onClick={() => setSheet('scope')}
            disabled={!city}
            className={`flex-1 min-w-0 ${CARTE_TAP} px-4 py-3 text-left disabled:opacity-60`}
          >
            <p className="text-[11px] text-neutral-400">Zone</p>
            <p className="text-[14px] font-semibold text-neutral-900 truncate mt-0.5">{zoneLabel}</p>
          </button>
        </div>

        {/* ── Le classement ── */}
        <ProSection title="Le classement">
          {loading ? (
            <div className={`${CARTE} divide-y divide-neutral-50`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[58px] flex items-center px-4">
                  <div className="h-3 w-40 bg-neutral-200 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className={`${CARTE} px-5 py-5`}>
              <p className="text-[15px] text-neutral-900">Classement indisponible</p>
              <p className="text-[13px] text-neutral-400 mt-1">Vérifiez votre connexion et réessayez.</p>
            </div>
          ) : entries.length === 0 ? (
            <div className={`${CARTE} px-5 py-5`}>
              <p className="text-[15px] text-neutral-900">Pas encore de classement ici</p>
              <p className="text-[13px] text-neutral-400 mt-1">
                Il faut assez d&apos;avis vérifiés sur {specialtyName ?? 'cette spécialité'} à {zoneLabel} pour en établir un.
              </p>
            </div>
          ) : (
            <div className={`${CARTE} overflow-hidden divide-y divide-neutral-50`}>
              {entries.map((e) => (
                <RankRow key={e.id} entry={e} isMe={e.id === myProfileId} />
              ))}
              {/* Hors du top affiché : sa ligne est ajoutée en pied, avec le
                  même rang réel — se situer ne doit pas dépendre du fait
                  d'être dans les 30 premiers. */}
              {isMine && myRank?.ranked && myProfileId && !visibleIds.has(myProfileId) && (
                <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50">
                  <span className="w-7 flex-shrink-0 text-center text-[13px] font-bold text-neutral-900 tabular-nums">{myRank.rank}</span>
                  <div className="flex-1 min-w-0">
                    <p className="flex items-center gap-1.5">
                      <span className="text-[15px] text-neutral-900 truncate">{user.name}</span>
                      <span className="text-[10px] font-semibold text-white bg-neutral-900 px-1.5 py-0.5 rounded-full flex-shrink-0">Vous</span>
                    </p>
                    <p className="text-[12px] text-neutral-400 mt-0.5">sur {myRank.total} coiffeurs</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setSheet('explain')}
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <HelpCircle size={13} />Comment fonctionne le classement ?
          </button>
        </ProSection>

        <ProSection title="Progresser">
          <div className={`${CARTE} overflow-hidden divide-y divide-neutral-50`}>
            <Link href="/pro/portfolio" className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-100/70 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] text-neutral-900">Publier une réalisation</p>
              </div>
              <ArrowRight size={16} className="text-neutral-300 flex-shrink-0" />
            </Link>
            <Link href="/pro/mon-qr" className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-100/70 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] text-neutral-900">Récolter un avis vérifié</p>
                <p className="text-[12px] text-neutral-400 mt-0.5">Le signal qui pèse le plus dans le classement</p>
              </div>
              <ArrowRight size={16} className="text-neutral-300 flex-shrink-0" />
            </Link>
            <Link href="/pro/badges" className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-100/70 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] text-neutral-900">Voir mes badges et mon niveau</p>
              </div>
              <Trophy size={16} className="text-neutral-300 flex-shrink-0" />
            </Link>
          </div>
        </ProSection>
      </div>

      {sheet === 'specialty' && (
        <PickerSheet
          title="Spécialité"
          options={specialtyOptions}
          selected={String(specialtyId ?? '')}
          onSelect={(v) => setSpecialtyId(Number(v))}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'scope' && city && (
        <PickerSheet
          title="Zone"
          options={[
            { value: 'city', label: city, hint: 'Votre ville' },
            { value: 'country', label: 'France', hint: 'Tous les coiffeurs CHAIR' },
          ]}
          selected={scope}
          onSelect={(v) => setScope(v as GeoScope)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'explain' && <ExplainSheet onClose={() => setSheet(null)} />}
    </>
  );
}
