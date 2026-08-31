'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { loyalty } from '@/lib/api';
import type { ApiLoyaltyProgram, ApiLoyaltyReward } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/types';
import { CARTE, CARTE_SOMBRE, MICRO_TITRE, MICRO_TITRE_SOMBRE, RAIL_CREUX } from '@/lib/proStyle';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { Check, Gift, Minus, Plus, QrCode } from 'lucide-react';

/**
 * La carte de fidélité — le premier add-on payant de CHAIR PRO.
 *
 * La carte tamponnée du salon, mais infalsifiable : elle avance au scan du
 * QR, le seul événement que CHAIR sait prouver. Le coiffeur choisit le
 * nombre de passages et la récompense, en toutes lettres — c'est SA
 * promesse, pas un catalogue imposé.
 *
 * Trois états, trois écrans :
 * - add-on inactif → présentation honnête : ce que ça fait, et le fait que
 *   l'activation arrive (le paiement intégré n'existe pas encore) ;
 * - add-on actif sans programme → la configuration, directement ;
 * - programme en route → l'état, la config modifiable, et surtout les
 *   récompenses À HONORER — c'est une dette, elle passe en premier.
 */
export default function ProFidelitePage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);

  const [addonActive, setAddonActive] = useState(false);
  const [program, setProgram] = useState<ApiLoyaltyProgram | null>(null);
  const [rewards, setRewards] = useState<ApiLoyaltyReward[]>([]);
  const [chargement, setChargement] = useState(true);

  // Brouillon de configuration.
  const [passages, setPassages] = useState(10);
  const [recompense, setRecompense] = useState('');
  const [actif, setActif] = useState(true);
  const [enregistrement, setEnregistrement] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!user) return;
    let annule = false;
    loyalty
      .program()
      .then((d) => {
        if (annule) return;
        setAddonActive(d.addon_active);
        setProgram(d.program);
        setRewards(d.pending_rewards);
        if (d.program) {
          setPassages(d.program.visits_required);
          setRecompense(d.program.reward_label);
          setActif(d.program.is_active);
        }
      })
      .catch(() => {})
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [user]);

  function enregistrer() {
    if (recompense.trim().length < 3) {
      setEnregistrement('error');
      return;
    }
    setEnregistrement('saving');
    loyalty
      .saveProgram({ visits_required: passages, reward_label: recompense.trim(), is_active: actif })
      .then((p) => { setProgram(p); setEnregistrement('saved'); })
      .catch(() => setEnregistrement('error'));
  }

  function honorer(id: number) {
    // Retrait optimiste : la ligne part tout de suite, et revient si le
    // serveur refuse — au comptoir, l'attente est pire que le risque.
    const avant = rewards;
    setRewards(rewards.filter((r) => r.id !== id));
    loyalty.redeem(id).catch(() => setRewards(avant));
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-2 md:pt-10 pb-12">
      <DashboardPageHeader title="Carte de fidélité" backHref="/pro/plus" />

      {chargement ? (
        <div className="h-44 bg-neutral-100 rounded-[28px] animate-pulse mt-4" />
      ) : !addonActive ? (
        /* ── Add-on inactif : la présentation, sans survendre ── */
        <div className="mt-4 space-y-3">
          <div className={`${CARTE_SOMBRE} p-6`}>
            <p className={MICRO_TITRE_SOMBRE}>Add-on CHAIR PRO</p>
            <h2 className="text-[24px] font-bold leading-tight mt-3">
              La carte de fidélité, version infalsifiable
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed mt-3">
              Vos clients cumulent leurs passages en faisant scanner votre QR —
              celui qui vérifie déjà vos avis. Au palier que vous choisissez,
              la récompense que vous choisissez : « 10ᵉ coupe à −20 % »,
              « 5ᵉ brushing offert »… C&apos;est votre promesse, en toutes lettres.
            </p>
            <div className="flex items-center gap-2.5 mt-5 text-[13px] text-white/70">
              <QrCode size={16} className="shrink-0" />
              Chaque passage compté est un passage prouvé — pas un tampon qu&apos;on prête.
            </div>
          </div>
          <div className={`${CARTE} p-5`}>
            <p className="text-[14px] font-semibold text-neutral-900">L&apos;activation arrive</p>
            <p className="text-[13px] text-neutral-500 leading-relaxed mt-1.5">
              L&apos;add-on sera activable directement ici, avec le paiement intégré.
              En attendant, il n&apos;y a rien à faire de votre côté.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">

          {/* ── Les récompenses à honorer — la dette passe en premier ── */}
          {rewards.length > 0 && (
            <div className={`${CARTE} overflow-hidden`}>
              <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                <Gift size={15} className="text-neutral-400" />
                <p className={MICRO_TITRE}>À honorer au comptoir</p>
              </div>
              <div className="divide-y divide-neutral-50">
                {rewards.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                    <Avatar nom={r.client?.name ?? '?'} url={resolveMediaUrl(r.client?.avatar ?? null)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-neutral-900 truncate">{r.client?.name ?? 'Client'}</p>
                      <p className="text-[12.5px] text-neutral-500 truncate">{r.reward_label}</p>
                    </div>
                    <button
                      onClick={() => honorer(r.id)}
                      className="shrink-0 flex items-center gap-1.5 text-[12px] font-semibold text-white bg-neutral-900 px-3.5 min-h-[40px] rounded-xl active:scale-[0.97] transition-transform"
                    >
                      <Check size={13} />Utilisée
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── La configuration ── */}
          <div className={`${CARTE} p-5`}>
            <p className={MICRO_TITRE}>Votre programme</p>

            <div className="mt-4">
              <p className="text-[13px] font-medium text-neutral-500 mb-2">Passages avant récompense</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPassages(Math.max(3, passages - 1))}
                  aria-label="Moins de passages"
                  className="w-11 h-11 rounded-full bg-neutral-100 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Minus size={16} />
                </button>
                <span className="text-[34px] font-bold tabular-nums tracking-[-0.03em] text-neutral-900 min-w-[52px] text-center">
                  {passages}
                </span>
                <button
                  onClick={() => setPassages(Math.min(20, passages + 1))}
                  aria-label="Plus de passages"
                  className="w-11 h-11 rounded-full bg-neutral-100 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="recompense" className="text-[13px] font-medium text-neutral-500 mb-2 block">
                La récompense, en toutes lettres
              </label>
              <input
                id="recompense"
                value={recompense}
                onChange={(e) => { setRecompense(e.target.value); setEnregistrement('idle'); }}
                placeholder="Ex. : −20 % sur la prochaine coupe"
                maxLength={80}
                className="w-full border border-neutral-200 rounded-xl px-4 h-12 text-[16px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <label className="flex items-center justify-between gap-3 mt-5 cursor-pointer">
              <span className="text-[14px] font-semibold text-neutral-900">Programme actif</span>
              <input
                type="checkbox"
                checked={actif}
                onChange={(e) => { setActif(e.target.checked); setEnregistrement('idle'); }}
                className="w-5 h-5 accent-neutral-900"
              />
            </label>

            <button
              onClick={enregistrer}
              disabled={enregistrement === 'saving'}
              className="mt-5 w-full min-h-[48px] bg-neutral-900 text-white text-[14px] font-semibold rounded-2xl active:scale-[0.985] transition-transform disabled:opacity-50"
            >
              {enregistrement === 'saving' ? 'Enregistrement…' : enregistrement === 'saved' ? 'Enregistré ✓' : 'Enregistrer'}
            </button>
            {enregistrement === 'error' && (
              <p className="text-[12.5px] text-red-600 mt-2">
                La récompense doit faire au moins 3 caractères. Vérifiez et réessayez.
              </p>
            )}
            {program && (
              <p className="text-[12px] text-neutral-400 leading-relaxed mt-3">
                Les passages comptent depuis l&apos;activation. Une récompense déjà
                débloquée reste due, même si vous changez le programme.
              </p>
            )}
          </div>

          {/* ── Aperçu de ce que voit le client ── */}
          <div className={`${CARTE} p-5`}>
            <p className={MICRO_TITRE}>Ce que voit le client</p>
            <div className="flex items-center gap-1.5 mt-4">
              {Array.from({ length: Math.min(passages, 12) }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full ${i < 3 ? 'bg-neutral-900 shadow-[0_1px_3px_rgba(10,10,10,0.35)]' : RAIL_CREUX}`}
                />
              ))}
            </div>
            <p className="text-[13px] text-neutral-500 mt-3">
              3 passages sur {passages} — encore {Math.max(0, passages - 3)} avant :{' '}
              <span className="font-semibold text-neutral-900">{recompense.trim() || 'votre récompense'}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ nom, url }: { nom: string; url: string | null }) {
  if (url) {
    return (
      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-100 shrink-0">
        <Image src={url} alt={nom} fill className="object-cover" sizes="40px" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
      <span className="text-[14px] font-bold text-neutral-500">{nom.charAt(0).toUpperCase()}</span>
    </div>
  );
}
