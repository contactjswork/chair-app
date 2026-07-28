'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ChairLogo from '@/components/ui/ChairLogo';
import AppDownload from '@/components/ui/AppDownload';
import { detectOS, storeUrlFor, isAppPublished } from '@/lib/appDownload';

export default function DownloadPage() {
  const [redirecting] = useState(() => isAppPublished() && !!storeUrlFor(detectOS()));

  useEffect(() => {
    if (!redirecting) return;
    const url = storeUrlFor(detectOS());
    if (!url) return;
    const t = setTimeout(() => { window.location.href = url; }, 900);
    return () => clearTimeout(t);
  }, [redirecting]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <div className="px-6 pt-6">
        <ChairLogo href="/" dark size="md" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center mb-8">
          <span className="text-white text-[22px] font-black">C</span>
        </div>

        <h1 className="text-white text-[26px] md:text-[32px] font-bold tracking-tight max-w-md leading-tight">
          {redirecting ? 'Redirection vers votre store…' : 'CHAIR est une application mobile'}
        </h1>
        <p className="text-white/50 text-[14.5px] mt-3 max-w-sm leading-relaxed">
          {redirecting
            ? 'Si rien ne se passe, utilisez le bouton ci-dessous.'
            : "L'expérience complète — feed, réservation, avis certifiés — se vit sur l'app. Téléchargez-la pour continuer."}
        </p>

        <div className="mt-10">
          <AppDownload variant="full" className="justify-center" qrSize={120} />
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 w-full max-w-xs">
          <p className="text-white/30 text-[12px] mb-2">Vous êtes professionnel ?</p>
          <Link href="/pro/connexion" className="text-white text-[13px] font-semibold underline underline-offset-4 decoration-white/30 hover:decoration-white/70 transition-colors">
            Accéder à CHAIR PRO sur le web →
          </Link>
        </div>
      </div>
    </main>
  );
}
