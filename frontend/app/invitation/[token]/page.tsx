'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { invitations as invitationsApi } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiSalonInvitationPreview } from '@/lib/types';
import {
  Building2, CheckCircle2, XCircle, AlertCircle, Loader2, LogIn, UserPlus, Check, X,
} from 'lucide-react';

type FetchState = 'loading' | 'loaded' | 'error';
type ActionResult = 'accept' | 'decline' | null;

export default function InvitationTokenPage() {
  const { token } = useParams<{ token: string }>();
  const { user, isLoading: authLoading } = useAuth();

  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [preview, setPreview] = useState<ApiSalonInvitationPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false);
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState<ActionResult>(null);

  useEffect(() => {
    if (!token || authLoading) return;
    invitationsApi.previewByToken(token)
      .then((data) => {
        setPreview(data);
        setFetchState('loaded');
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'Invitation introuvable.');
        setFetchState('error');
      });
  }, [token, authLoading]);

  // Vue dérivée — jamais recalculée via un second effet, juste au rendu.
  const step =
    fetchState === 'loading' || authLoading         ? 'loading' :
    fetchState === 'error'                          ? 'error' :
    result === 'accept'                              ? 'done-accept' :
    result === 'decline'                             ? 'done-decline' :
    preview?.status !== 'pending'                    ? 'closed' :
    !user                                            ? 'auth' :
    'action';

  function saveRedirectAndGo() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('chair_redirect', window.location.pathname);
    }
  }

  async function handleAccept() {
    setActing(true);
    setErrorMsg('');
    setNeedsProfile(false);
    try {
      await invitationsApi.acceptByToken(token);
      setResult('accept');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'acceptation.';
      if (msg.includes('profil coiffeur')) setNeedsProfile(true);
      setErrorMsg(msg);
    } finally {
      setActing(false);
    }
  }

  async function handleDecline() {
    setActing(true);
    setErrorMsg('');
    try {
      await invitationsApi.declineByToken(token);
      setResult('decline');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <div className="bg-white border-b border-neutral-100 px-5 py-3.5">
        <Link href="/" className="text-base font-bold tracking-[0.12em] uppercase text-neutral-900">
          CHAIR
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 max-w-md mx-auto w-full">

        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 text-neutral-400">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm">Chargement de l&apos;invitation...</p>
          </div>
        )}

        {step === 'error' && (
          <div className="w-full flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 mb-1">Invitation introuvable</h2>
              <p className="text-sm text-neutral-500 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {step === 'closed' && preview && (
          <div className="w-full flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
              <XCircle size={28} className="text-neutral-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 mb-1">Invitation non disponible</h2>
              <p className="text-sm text-neutral-500 leading-relaxed">
                {preview.status === 'expired' && 'Cette invitation a expiré. Demandez au salon de vous en renvoyer une.'}
                {preview.status === 'cancelled' && 'Cette invitation a été annulée par le salon.'}
                {preview.status === 'accepted' && 'Cette invitation a déjà été acceptée.'}
                {preview.status === 'declined' && 'Cette invitation a déjà été déclinée.'}
              </p>
            </div>
          </div>
        )}

        {step === 'auth' && preview && (
          <div className="w-full flex flex-col gap-6">
            <SalonCard preview={preview} />
            <div className="text-center">
              <h2 className="text-lg font-bold text-neutral-900 mb-2">
                Connectez-vous pour répondre
              </h2>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Un compte coiffeur CHAIR est nécessaire pour rejoindre {preview.salon.name}.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/connexion" onClick={saveRedirectAndGo}
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-4 rounded-2xl text-sm hover:bg-neutral-700 transition-colors">
                <LogIn size={16} />Se connecter
              </Link>
              <Link href="/inscription" onClick={saveRedirectAndGo}
                className="w-full flex items-center justify-center gap-2 border border-neutral-200 text-neutral-700 font-bold py-4 rounded-2xl text-sm hover:bg-neutral-50 transition-colors">
                <UserPlus size={16} />Créer un compte coiffeur
              </Link>
            </div>
          </div>
        )}

        {step === 'action' && preview && (
          <div className="w-full flex flex-col gap-6">
            <SalonCard preview={preview} />

            {preview.message && (
              <div className="bg-white border border-neutral-100 rounded-2xl p-4">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">Message</p>
                <p className="text-sm text-neutral-700 leading-relaxed">{preview.message}</p>
              </div>
            )}

            <div className="text-center">
              <h2 className="text-lg font-bold text-neutral-900 mb-1">
                Rejoindre {preview.salon.name} ?
              </h2>
            </div>

            {errorMsg && !needsProfile && (
              <p className="text-xs text-red-500 text-center">{errorMsg}</p>
            )}

            {needsProfile ? (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                <p className="text-sm text-amber-800 font-semibold mb-1">Profil coiffeur requis</p>
                <p className="text-xs text-amber-700 leading-relaxed mb-3">
                  Votre compte n&apos;a pas encore de profil coiffeur — créez-en un pour rejoindre ce salon.
                </p>
                <Link href="/pro/inscription"
                  className="inline-flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-2.5 px-5 rounded-xl text-xs hover:bg-neutral-700 transition-colors">
                  Créer mon profil coiffeur
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button onClick={handleAccept} disabled={acting}
                  className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-4 rounded-2xl text-sm hover:bg-neutral-700 transition-colors disabled:opacity-40">
                  {acting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Accepter l&apos;invitation
                </button>
                <button onClick={handleDecline} disabled={acting}
                  className="w-full flex items-center justify-center gap-2 border border-neutral-200 text-neutral-600 font-semibold py-4 rounded-2xl text-sm hover:bg-neutral-50 transition-colors disabled:opacity-40">
                  <X size={16} />Décliner
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'done-accept' && preview && (
          <div className="w-full flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-neutral-900 mb-2">Bienvenue !</h2>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Vous avez rejoint {preview.salon.name}.
              </p>
            </div>
            <Link href="/pro"
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-neutral-700 transition-colors">
              Aller à mon espace pro
            </Link>
          </div>
        )}

        {step === 'done-decline' && (
          <div className="w-full flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center">
              <XCircle size={36} className="text-neutral-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-neutral-900 mb-2">Invitation déclinée</h2>
              <p className="text-sm text-neutral-500 leading-relaxed">Le salon a été informé de votre réponse.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SalonCard({ preview }: { preview: ApiSalonInvitationPreview }) {
  const logo = resolveMediaUrl(preview.salon.logo);
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center gap-4">
      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
        {logo ? (
          <Image src={logo} alt={preview.salon.name} fill sizes="56px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 size={20} className="text-neutral-300" />
          </div>
        )}
      </div>
      <div>
        <p className="font-bold text-neutral-900">{preview.salon.name}</p>
        {preview.salon.city && <p className="text-xs text-neutral-400">{preview.salon.city}</p>}
      </div>
    </div>
  );
}
