'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { visits } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiScanInfo, ApiVisitConfirmed } from '@/lib/types';
import {
  Scissors, CheckCircle2, Star, AlertCircle,
  ChevronRight, ArrowRight, Loader2, LogIn, UserPlus,
} from 'lucide-react';

type Step = 'loading' | 'auth' | 'info' | 'review' | 'done' | 'error';

export default function ScanPage() {
  const { token }                       = useParams<{ token: string }>();
  const { user, isLoading: authLoading } = useAuth();

  const [step,        setStep]        = useState<Step>('loading');
  const [info,        setInfo]        = useState<ApiScanInfo | null>(null);
  const [confirmed,   setConfirmed]   = useState<ApiVisitConfirmed | null>(null);
  const [serviceType, setServiceType] = useState('');
  const [confirming,  setConfirming]  = useState(false);
  const [rating,      setRating]      = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment,     setComment]     = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [errorMsg,    setErrorMsg]    = useState('');

  // Charger les infos du token (public — pour afficher le coiffeur avant login)
  useEffect(() => {
    if (!token || authLoading) return;
    visits.getScanInfo(token)
      .then((data) => {
        setInfo(data);
        setStep(user ? 'info' : 'auth');
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setStep('error');
      });
  }, [token, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si le client se connecte depuis la page auth, passer à info
  useEffect(() => {
    if (user && step === 'auth' && info) {
      setStep('info');
    }
  }, [user, step, info]);

  function saveRedirectAndGo() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('chair_redirect', window.location.pathname);
    }
  }

  async function confirmVisit() {
    if (!token || !serviceType) return;
    setConfirming(true);
    setErrorMsg('');
    try {
      const data = await visits.confirmVisit(token, serviceType);
      setConfirmed(data);
      setStep('review');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la validation.');
      setStep('error');
    } finally {
      setConfirming(false);
    }
  }

  async function submitReview() {
    if (!confirmed || rating === 0 || comment.trim().length < 10) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await visits.submitReview({
        visit_id: confirmed.visit_id,
        rating,
        comment: comment.trim(),
      });
      setStep('done');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la publication.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-neutral-100 px-5 py-3.5 flex items-center justify-between">
        <Link href="/" className="text-base font-bold tracking-[0.12em] uppercase text-neutral-900">
          CHAIR
        </Link>
        {step === 'review' && (
          <button
            onClick={() => setStep('done')}
            className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            Passer
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 max-w-md mx-auto w-full">

        {/* LOADING */}
        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 text-neutral-400">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm">Vérification du QR Code...</p>
          </div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <div className="w-full flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 mb-1">Une erreur est survenue</h2>
              <p className="text-sm text-neutral-500 leading-relaxed">{errorMsg}</p>
            </div>
            <p className="text-xs text-neutral-400">
              Demandez au coiffeur d&apos;afficher un nouveau QR Code.
            </p>
          </div>
        )}

        {/* AUTH GATE — connexion requise */}
        {step === 'auth' && info && (
          <div className="w-full flex flex-col gap-6">
            <HairdresserCard info={info} />

            <div className="text-center">
              <h2 className="text-lg font-bold text-neutral-900 mb-2">
                Connectez-vous pour confirmer votre visite
              </h2>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Un compte CHAIR est nécessaire pour valider votre visite et laisser un avis certifié.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/connexion"
                onClick={saveRedirectAndGo}
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-4 rounded-2xl text-sm hover:bg-neutral-700 transition-colors"
              >
                <LogIn size={16} />
                Se connecter
              </Link>
              <Link
                href="/inscription"
                onClick={saveRedirectAndGo}
                className="w-full flex items-center justify-center gap-2 border border-neutral-200 text-neutral-700 font-bold py-4 rounded-2xl text-sm hover:bg-neutral-50 transition-colors"
              >
                <UserPlus size={16} />
                Créer un compte gratuit
              </Link>
            </div>

            <p className="text-[10px] text-neutral-400 text-center leading-relaxed">
              Gratuit · Aucune carte bancaire · Connexion sécurisée
            </p>
          </div>
        )}

        {/* INFO — sélection prestation + confirmation */}
        {step === 'info' && info && (
          <div className="w-full flex flex-col gap-5">
            <HairdresserCard info={info} />

            <div>
              <h2 className="text-lg font-bold text-neutral-900 mb-1">
                Vous venez d&apos;être coiffé(e) ?
              </h2>
              <p className="text-sm text-neutral-500">
                Sélectionnez la prestation reçue, puis confirmez votre visite.
              </p>
            </div>

            {/* Sélection prestation — obligatoire */}
            {info.services.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wide">
                  Quelle prestation ? <span className="text-red-500">*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {info.services.map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => setServiceType(svc.name === serviceType ? '' : svc.name)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                        serviceType === svc.name
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 hover:text-neutral-900'
                      }`}
                    >
                      {svc.name}
                    </button>
                  ))}
                </div>
                {!serviceType && (
                  <p className="text-[11px] text-neutral-400 mt-2">
                    Sélectionnez la prestation reçue pour continuer.
                  </p>
                )}
              </div>
            ) : (
              // Aucun service configuré → champ texte libre
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wide">
                  Quelle prestation ? <span className="text-red-500">*</span>
                </p>
                <input
                  type="text"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  placeholder="Ex : Coupe homme, Balayage..."
                  maxLength={100}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-all"
                />
              </div>
            )}

            <button
              type="button"
              onClick={confirmVisit}
              disabled={confirming || !serviceType.trim()}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-4 rounded-2xl text-sm hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {confirming
                ? <><Loader2 size={16} className="animate-spin" /> Validation...</>
                : <><CheckCircle2 size={16} /> Confirmer ma visite <ArrowRight size={15} /></>
              }
            </button>

            <p className="text-[10px] text-neutral-400 text-center leading-relaxed">
              En confirmant, vous certifiez avoir eu une prestation chez ce coiffeur aujourd&apos;hui.
              Anti-fraude : ce QR expire dans quelques minutes.
            </p>
          </div>
        )}

        {/* REVIEW */}
        {step === 'review' && confirmed && (
          <div className="w-full flex flex-col gap-5">
            <div className="bg-green-50 rounded-2xl p-5 flex items-start gap-4 border border-green-100">
              <CheckCircle2 size={22} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-green-800">Visite vérifiée ✓</p>
                <p className="text-xs text-green-600 mt-0.5">
                  Chez {confirmed.hairdresser_name}
                  {confirmed.service_type && ` · ${confirmed.service_type}`}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-neutral-900 mb-1">
                Laissez un avis certifié
              </h2>
              <p className="text-sm text-neutral-500">
                Votre avis sera marqué{' '}
                <span className="font-semibold text-neutral-700">&ldquo;Visite vérifiée&rdquo;</span>{' '}
                — il a plus de poids qu&apos;un avis ordinaire.
              </p>
            </div>

            {/* Étoiles */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={36}
                      strokeWidth={1.5}
                      className={`transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-neutral-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-xs text-neutral-500">
                  {['', 'Décevant', 'Passable', 'Bien', 'Très bien', 'Excellent !'][rating]}
                </p>
              )}
            </div>

            {/* Commentaire */}
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Décrivez votre expérience... (minimum 10 caractères)"
                rows={4}
                maxLength={1000}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-all resize-none"
              />
              <div className="flex justify-between mt-1">
                <span className={`text-[10px] ${comment.length >= 10 ? 'text-green-600 font-medium' : 'text-neutral-400'}`}>
                  {comment.length >= 10 ? '✓ Bonne longueur' : `${10 - comment.length} car. minimum`}
                </span>
                <span className="text-[10px] text-neutral-400">{comment.length}/1000</span>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-500 text-center">{errorMsg}</p>
            )}

            <button
              type="button"
              onClick={submitReview}
              disabled={submitting || rating === 0 || comment.trim().length < 10}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-4 rounded-2xl text-sm hover:bg-neutral-700 transition-colors disabled:opacity-40"
            >
              {submitting
                ? <><Loader2 size={16} className="animate-spin" /> Envoi...</>
                : <><Star size={15} /> Publier mon avis certifié</>
              }
            </button>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="w-full flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-neutral-900 mb-2">Merci !</h2>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Votre visite a été vérifiée{confirmed ? ` chez ${confirmed.hairdresser_name}` : ''}.
                {' '}Votre avis certifié est maintenant visible sur son profil.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {confirmed?.hairdresser_slug && (
                <Link
                  href={`/coiffeur/${confirmed.hairdresser_slug}`}
                  className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-neutral-700 transition-colors"
                >
                  Voir le profil <ChevronRight size={15} />
                </Link>
              )}
              <Link
                href="/"
                className="w-full flex items-center justify-center gap-2 border border-neutral-200 text-neutral-600 font-semibold py-3.5 rounded-2xl text-sm hover:bg-neutral-50 transition-colors"
              >
                Découvrir d&apos;autres coiffeurs
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Composant carte coiffeur ──────────────────────────────────────────────────

function HairdresserCard({ info }: { info: ApiScanInfo }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center gap-4">
      <div className="relative w-14 h-14 rounded-full overflow-hidden bg-neutral-100 flex-shrink-0">
        {info.avatar ? (
          <Image
            src={resolveMediaUrl(info.avatar)!}
            alt={info.hairdresser_name}
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Scissors size={20} className="text-neutral-300" />
          </div>
        )}
      </div>
      <div>
        <p className="font-bold text-neutral-900">{info.hairdresser_name}</p>
        {info.salon_name && <p className="text-xs text-neutral-500">{info.salon_name}</p>}
        {info.city && <p className="text-xs text-neutral-400">{info.city}</p>}
        {info.verified_visits_count > 0 && (
          <p className="text-[10px] text-green-600 font-semibold mt-1">
            ✓ {info.verified_visits_count} visite{info.verified_visits_count > 1 ? 's' : ''} vérifiée{info.verified_visits_count > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
