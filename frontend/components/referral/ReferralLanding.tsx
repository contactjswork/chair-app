'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { redirectPathForRole } from '@/lib/auth';
import { captureReferralCodeFromPath } from '@/lib/referral';
import { referral } from '@/lib/api';
import { resolveMediaUrl, type ApiReferralInfo } from '@/lib/types';
import { Gift, ArrowRight, Scissors } from 'lucide-react';
import ChairLogo from '@/components/ui/ChairLogo';
import { PrimaryButton } from '@/components/ui/Button';
import AppDownload from '@/components/ui/AppDownload';

const ROLE_PITCH: Record<string, string> = {
  hairdresser: "coiffeur·euse sur CHAIR — l'app qui connecte les meilleurs coiffeurs à leurs clients.",
  salon_owner: 'gérant·e de salon sur CHAIR — la plateforme qui simplifie la vie des salons.',
  client: 'sur CHAIR — l\'app qui met en avant les coiffeurs près de chez vous.',
};

export default function ReferralLanding({ code }: { code: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const [info, setInfo] = useState<ApiReferralInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);

  useEffect(() => {
    // Capturé immédiatement, indépendamment du résultat du lookup ci-dessous
    // (survit à la navigation jusqu'à l'inscription réelle — voir
    // ReferralService::attributeSignup côté backend, qui ignore silencieusement
    // un code introuvable/périmé, donc aucun risque à toujours le mémoriser).
    captureReferralCodeFromPath(code);
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    referral.info(code)
      .then((data) => { if (!cancelled) setInfo(data); })
      .catch(() => { /* code invalide/inconnu — repli générique, jamais bloquant */ })
      .finally(() => { if (!cancelled) setInfoLoading(false); });
    return () => { cancelled = true; };
  }, [code]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Déjà connecté — pas de double compte, on le renvoie simplement chez lui.
  if (user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <ChairLogo size="lg" href="/" />
        <div className="mt-8 w-9 h-9 rounded-full bg-neutral-900 flex items-center justify-center">
          <Gift size={16} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-neutral-900 mt-4">Vous êtes déjà membre de CHAIR</h1>
        <p className="text-sm text-neutral-400 mt-1.5 max-w-xs leading-relaxed">
          Ce lien de parrainage ne peut plus rien vous offrir — mais vous pouvez continuer votre visite.
        </p>
        <PrimaryButton href={redirectPathForRole(user.role)} className="mt-6" icon={<ArrowRight size={15} />}>
          Retourner sur CHAIR
        </PrimaryButton>
      </div>
    );
  }

  const avatar = info ? resolveMediaUrl(info.avatar) : null;
  const pitch = info ? (ROLE_PITCH[info.role] ?? ROLE_PITCH.client) : null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-8 pb-4 flex justify-center">
        <ChairLogo size="lg" href="/" />
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-6 pb-10">
        <div className="bg-neutral-900 rounded-[28px] p-7 text-center shadow-[0_10px_30px_-14px_rgba(10,10,10,0.4)]">
          {infoLoading ? (
            <div className="w-16 h-16 rounded-full bg-white/10 mx-auto animate-pulse" />
          ) : info ? (
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white/10 mx-auto flex items-center justify-center">
              {avatar ? (
                <Image src={avatar} alt={info.name} fill className="object-cover" sizes="64px" />
              ) : (
                <span className="text-xl font-bold text-white">{info.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/10 mx-auto flex items-center justify-center">
              <Scissors size={22} className="text-white/70" />
            </div>
          )}

          <h1 className="text-[22px] font-bold text-white tracking-tight mt-4 leading-snug">
            {infoLoading ? 'Un instant…' : info ? (
              <>{info.name} vous invite<br />sur CHAIR</>
            ) : (
              'Bienvenue sur CHAIR'
            )}
          </h1>
          <p className="text-[13px] text-white/50 mt-2 leading-relaxed">
            {pitch ?? "L'app qui connecte les meilleurs coiffeurs à leurs clients."}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <PrimaryButton href="/inscription" fullWidth icon={<ArrowRight size={15} />}>
            Créer mon compte
          </PrimaryButton>
          <p className="text-center text-[12px] text-neutral-400">
            Vous êtes coiffeur·euse ou vous gérez un salon ?{' '}
            <Link href="/pro/inscription" className="font-semibold text-neutral-700 hover:text-neutral-900 underline underline-offset-2">
              Inscription professionnelle
            </Link>
          </p>
        </div>

        <div className="mt-8 bg-neutral-900 rounded-2xl px-5 py-4 flex flex-col items-center gap-3">
          <p className="text-[11px] font-semibold text-white/50 text-center">Aussi disponible sur mobile</p>
          <AppDownload variant="badges" />
        </div>
      </div>
    </div>
  );
}
