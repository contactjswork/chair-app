'use client';

import { useState } from 'react';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/contact';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Check, Flag, Loader2, MoreHorizontal, ShieldOff, X } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import BlockConfirmSheet from '@/components/ui/BlockConfirmSheet';
import { moderation } from '@/lib/api';
import type { ReportReason, ReportTargetType } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';

/**
 * Signalement de contenu — exigence App Store Review Guideline 1.2 (UGC) :
 * "A mechanism to report offensive content and timely responses to concerns".
 *
 * Deux exports :
 *  - <ReportSheet>  : la feuille elle-même (motifs + détails + envoi réel).
 *  - <ContentMenu>  : le déclencheur "…" à poser sur un contenu (réalisation,
 *    avis, fiche coiffeur, carte du feed). Il ouvre un petit menu qui propose
 *    "Signaler" et, quand un auteur est identifié, "Bloquer ce compte".
 *
 * L'envoi est réel (POST /reports). Le bouton est verrouillé pendant l'appel
 * (anti double-tap) et l'écran de confirmation remplace le formulaire.
 */

const REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: 'inappropriate',        label: 'Contenu inapproprié',    hint: 'Nudité, violence, propos haineux' },
  { value: 'harassment',           label: 'Harcèlement',            hint: 'Intimidation, menaces, insultes visant une personne' },
  { value: 'spam',                 label: 'Spam',                   hint: 'Publicité, contenu répétitif ou hors sujet' },
  { value: 'misleading',           label: 'Contenu trompeur',       hint: 'Faux avis, fausse identité, résultat truqué' },
  { value: 'intellectual_property', label: 'Propriété intellectuelle', hint: 'Photo ou vidéo publiée sans autorisation' },
  { value: 'other',                label: 'Autre',                  hint: 'Décris le problème ci-dessous' },
];

const TARGET_LABEL: Record<ReportTargetType, string> = {
  post: 'cette réalisation',
  review: 'cet avis',
  profile: 'ce profil',
};

interface ReportSheetProps {
  type: ReportTargetType;
  /** post → id du post · review → id de l'avis · profile → id du profil coiffeur */
  contentId: number;
  onClose: () => void;
}

export default function ReportSheet({ type, contentId, onClose }: ReportSheetProps) {
  const [reason, setReason]   = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const isAuthed = !!getStoredToken();

  async function submit() {
    if (!reason || sending) return; // anti double-tap
    setSending(true);
    setError(null);
    try {
      await moderation.report({
        type,
        content_id: contentId,
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      });
      setSent(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Une erreur est survenue.';
      // Le doublon (409) n'est pas un échec pour l'utilisateur : son
      // signalement est bien pris en compte, il l'a juste déjà envoyé.
      if (msg.toLowerCase().includes('déjà signalé')) {
        setSent(true);
      } else {
        setError(msg);
      }
    } finally {
      setSending(false);
    }
  }

  // Portalé dans body, au-dessus de la bottom nav (z-[60]) : le déclencheur
  // peut vivre dans un conteneur qui crée son propre contexte d'empilement
  // (la carte du feed est dans un `fixed z-50`) — sans portail, le bas de la
  // feuille, donc le bouton d'envoi, passe sous la barre de navigation.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <BottomSheet onClose={onClose} maxHeight="max-h-[88vh]" zIndexClassName="z-[120]">
      <div className="px-5 pb-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <p className="text-[16px] font-bold text-neutral-900">
              {sent ? 'Signalement envoyé' : `Signaler ${TARGET_LABEL[type]}`}
            </p>
            {!sent && (
              <p className="text-[12px] text-neutral-400 mt-1">
                Ton signalement est confidentiel. La personne concernée n&apos;en est pas informée.
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="pt-8 pb-2 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mx-auto mb-4">
              <Check size={22} className="stroke-white" />
            </div>
            <p className="text-[14px] text-neutral-800 font-semibold">
              Merci, ton signalement a été transmis à notre équipe.
            </p>
            <p className="text-[12px] text-neutral-500 leading-relaxed mt-2 max-w-xs mx-auto">
              Nous examinons chaque signalement sous 72 heures et retirons les contenus
              qui enfreignent nos règles de communauté.
            </p>
            <Link
              href="/app/regles-communaute"
              className="inline-block mt-4 text-[12px] text-neutral-500 underline underline-offset-2"
              onClick={onClose}
            >
              Lire les règles de communauté
            </Link>
            <button
              onClick={onClose}
              className="w-full mt-6 min-h-[48px] rounded-2xl bg-neutral-900 text-white text-[14px] font-semibold hover:bg-neutral-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            {!isAuthed && (
              <p className="mt-4 text-[12px] text-neutral-500 bg-neutral-50 rounded-xl px-3 py-2.5 leading-relaxed">
                Connecte-toi pour envoyer un signalement. Tu peux aussi nous écrire à{' '}
                <a href={SUPPORT_MAILTO} className="underline">{SUPPORT_EMAIL}</a>.
              </p>
            )}

            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mt-5 mb-2">
              Motif
            </p>
            <div className="space-y-2">
              {REASONS.map((r) => {
                const active = reason === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => setReason(r.value)}
                    aria-pressed={active}
                    className={`w-full text-left min-h-[48px] px-4 py-3 rounded-2xl border transition-colors ${
                      active
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="block text-[14px] font-semibold">{r.label}</span>
                    <span className={`block text-[11px] mt-0.5 ${active ? 'text-white/60' : 'text-neutral-400'}`}>
                      {r.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mt-6 mb-2">
              Détails (facultatif)
            </p>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              rows={4}
              aria-label="Détails du signalement (facultatif)"
              placeholder="Explique en quelques mots ce qui pose problème."
              className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-[14px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-900 resize-none"
            />
            <p className="text-[11px] text-neutral-300 text-right mt-1">{details.length}/1000</p>

            {error && (
              <p className="mt-3 text-[13px] text-red-600 bg-red-50 rounded-xl px-3 py-2.5">{error}</p>
            )}

            <button
              onClick={submit}
              disabled={!reason || sending || !isAuthed}
              className="w-full mt-5 min-h-[48px] rounded-2xl bg-neutral-900 text-white text-[14px] font-semibold hover:bg-neutral-700 transition-colors disabled:opacity-30 disabled:hover:bg-neutral-900 flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : null}
              {sending ? 'Envoi…' : 'Envoyer le signalement'}
            </button>

            <Link
              href="/app/regles-communaute"
              onClick={onClose}
              className="block text-center mt-4 text-[12px] text-neutral-400 underline underline-offset-2"
            >
              Que peut-on publier sur CHAIR ?
            </Link>
          </>
        )}
      </div>
    </BottomSheet>,
    document.body
  );
}

// ── Déclencheur "…" ───────────────────────────────────────────────────

interface ContentMenuProps {
  type: ReportTargetType;
  contentId: number;
  /** Auteur du contenu — active l'entrée "Bloquer ce compte" quand il est connu. */
  authorUserId?: number | null;
  authorName?: string | null;
  /** Le bouton est posé sur un média sombre (feed) → variante claire. */
  tone?: 'dark' | 'light';
  className?: string;
  label?: string;
}

/**
 * Bouton "…" discret mais VISIBLE, à poser directement sur le contenu.
 * Il ouvre un menu court : Signaler / Bloquer / Règles de communauté.
 * Cible tactile 44px minimum (règle DA CHAIR + accessibilité iOS).
 */
export function ContentMenu({
  type,
  contentId,
  authorUserId = null,
  authorName = null,
  tone = 'light',
  className = '',
  label = 'Plus d’options',
}: ContentMenuProps) {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen]   = useState(false);

  const buttonTone =
    tone === 'dark'
      ? 'text-white/90 hover:bg-white/15 drop-shadow-md'
      : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900';

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(true); }}
        className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors ${buttonTone} ${className}`}
      >
        <MoreHorizontal size={20} />
      </button>

      {menuOpen && createPortal(
        <BottomSheet onClose={() => setMenuOpen(false)} maxHeight="max-h-[70vh]" zIndexClassName="z-[110]">
          <div className="px-5 pb-8 pt-1">
            <button
              onClick={() => { setMenuOpen(false); setReportOpen(true); }}
              className="w-full min-h-[52px] flex items-center gap-3 px-4 rounded-2xl text-left hover:bg-neutral-50 transition-colors"
            >
              <Flag size={17} className="text-neutral-500 flex-shrink-0" />
              <span className="text-[14px] font-semibold text-neutral-900">
                Signaler {TARGET_LABEL[type]}
              </span>
            </button>

            {authorUserId ? (
              <button
                onClick={() => { setMenuOpen(false); setBlockOpen(true); }}
                className="w-full min-h-[52px] flex items-center gap-3 px-4 rounded-2xl text-left hover:bg-neutral-50 transition-colors"
              >
                <ShieldOff size={17} className="text-neutral-500 flex-shrink-0" />
                <span className="text-[14px] font-semibold text-neutral-900">
                  Bloquer {authorName ? authorName : 'ce compte'}
                </span>
              </button>
            ) : null}

            <Link
              href="/app/regles-communaute"
              onClick={() => setMenuOpen(false)}
              className="w-full min-h-[52px] flex items-center gap-3 px-4 rounded-2xl text-left hover:bg-neutral-50 transition-colors"
            >
              <span className="text-[14px] text-neutral-500">Règles de communauté</span>
            </Link>

            <button
              onClick={() => setMenuOpen(false)}
              className="w-full mt-3 min-h-[48px] rounded-2xl bg-neutral-100 text-neutral-700 text-[14px] font-semibold hover:bg-neutral-200 transition-colors"
            >
              Annuler
            </button>
          </div>
        </BottomSheet>,
        document.body
      )}

      {reportOpen && (
        <ReportSheet type={type} contentId={contentId} onClose={() => setReportOpen(false)} />
      )}

      {blockOpen && authorUserId ? (
        <BlockConfirmSheet
          userId={authorUserId}
          userName={authorName ?? 'ce compte'}
          onClose={() => setBlockOpen(false)}
        />
      ) : null}
    </>
  );
}
