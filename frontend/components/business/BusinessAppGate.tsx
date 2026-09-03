'use client';

import { Building2, Users, Armchair, Briefcase, ExternalLink, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Écran affiché dans le binaire CHAIR PRO quand l'utilisateur est un GÉRANT :
 * son espace vit dans l'app CHAIR BUSINESS, pas ici. Plus AUCUNE transition
 * gérant/coiffeur à l'intérieur d'une app (décision Julien 02/09/2026) —
 * chaque app est un monde : CHAIR (clients), CHAIR PRO (coiffeurs),
 * CHAIR BUSINESS (gérants).
 *
 * Tant que CHAIR BUSINESS n'est pas publiée sur l'App Store, le bouton mène
 * à l'espace web (navigateur externe). Remplacer BUSINESS_APP_STORE_URL par
 * l'URL réelle de la fiche App Store dès qu'elle existe.
 */
const BUSINESS_APP_STORE_URL: string | null = null; // ex: 'https://apps.apple.com/fr/app/idXXXXXXXXX'

const POINTS = [
  { icon: Building2, label: 'Votre salon', desc: 'Page publique, photos, SIRET, avis.' },
  { icon: Users,     label: 'Votre équipe', desc: 'Membres, invitations, demandes.' },
  { icon: Armchair,  label: 'Location de fauteuil', desc: 'Annonces et demandes des coiffeurs.' },
  { icon: Briefcase, label: 'Recrutement', desc: 'Offres d’emploi et candidatures.' },
];

export default function BusinessAppGate() {
  const { logout } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0b] text-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <p className="text-[24px] font-black tracking-tight mb-5">
          CHAIR <span className="text-[#f5b942]">BUSINESS</span>
        </p>

        <h1 className="text-[26px] font-black leading-tight tracking-tight mb-2">
          Votre espace gérant<br />a sa propre app.
        </h1>
        <p className="text-[13px] text-white/50 leading-relaxed mb-7">
          CHAIR PRO est l&apos;app des coiffeurs. Tout ce qui concerne votre
          salon se gère dans <span className="text-white font-semibold">CHAIR BUSINESS</span>.
        </p>

        <div className="space-y-2.5 mb-8 text-left">
          {POINTS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 bg-white/[0.05] ring-1 ring-white/[0.06] rounded-2xl p-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#f5b942]/15 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-[#f5b942]" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold leading-tight">{label}</p>
                <p className="text-[11px] text-white/45 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {BUSINESS_APP_STORE_URL ? (
          <a
            href={BUSINESS_APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 font-black py-4 rounded-2xl text-[15px] text-black"
            style={{ background: 'linear-gradient(180deg, #f9cf6b 0%, #f5b942 55%, #e3a52e 100%)' }}
          >
            Télécharger CHAIR BUSINESS
          </a>
        ) : (
          <>
            <p className="text-[12px] font-semibold text-white/60 mb-3">
              CHAIR BUSINESS arrive très bientôt sur l&apos;App Store.
            </p>
            <a
              href="https://getchair.app/business"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-4 rounded-2xl text-[14px] hover:bg-neutral-200 transition-colors"
            >
              <ExternalLink size={15} />
              En attendant, gérer mon salon sur le web
            </a>
          </>
        )}

        <button
          onClick={() => logout()}
          className="mt-6 mx-auto flex items-center gap-1.5 text-[12px] font-semibold text-white/35 hover:text-white/70 transition-colors"
        >
          <LogOut size={12} /> Changer de compte
        </button>
      </div>
    </div>
  );
}
