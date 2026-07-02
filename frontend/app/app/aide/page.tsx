'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { ArrowLeft, Mail, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const FAQS = [
  {
    q: 'Comment réserver un rendez-vous ?',
    a: "Va sur le profil d'un coiffeur, choisis une date et un créneau disponible, puis confirme ta réservation. Tu recevras une notification de confirmation.",
  },
  {
    q: 'Comment annuler une réservation ?',
    a: "Rends-toi dans Compte → Mes réservations, sélectionne le rendez-vous et appuie sur Annuler. Vérifie la politique d'annulation du coiffeur.",
  },
  {
    q: 'Comment laisser un avis ?',
    a: "Les avis sont certifiés : tu peux en laisser un uniquement après un rendez-vous vérifié via QR code. Tu recevras une invitation par email ou notification.",
  },
  {
    q: 'Comment fonctionne la géolocalisation ?',
    a: "CHAIR utilise ta position uniquement quand tu l'autorises, pour afficher les coiffeurs proches. Tu peux aussi rechercher par ville. Ta position n'est jamais partagée.",
  },
  {
    q: 'Comment modifier mon profil ?',
    a: "Va dans Compte → Modifier mon profil. Tu peux y changer ton nom, ta photo, ta ville et ton numéro de téléphone.",
  },
  {
    q: "Comment signaler un contenu inapproprié ?",
    a: "Appuie longuement sur le contenu concerné ou utilise le menu ⋯ pour le signaler. Notre équipe le traitera sous 72h.",
  },
  {
    q: "Comment supprimer mon compte ?",
    a: "Va dans Compte → Supprimer mon compte. Cette action est irréversible. Tu peux aussi envoyer une demande à contact@getchair.app.",
  },
  {
    q: "L'app est-elle gratuite ?",
    a: "CHAIR est 100% gratuit pour les clients. Les coiffeurs peuvent créer un profil gratuitement et accéder à des fonctionnalités avancées via un abonnement pro.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left px-5 py-4 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[14px] font-semibold text-neutral-900 leading-snug">{q}</p>
        {open
          ? <ChevronUp size={16} className="text-neutral-400 flex-shrink-0 mt-0.5" />
          : <ChevronDown size={16} className="text-neutral-400 flex-shrink-0 mt-0.5" />
        }
      </div>
      {open && (
        <p className="text-[13px] text-neutral-500 leading-relaxed mt-2.5 pr-4">{a}</p>
      )}
    </button>
  );
}

export default function AidePage() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="max-w-lg mx-auto pb-28">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-6">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[18px] font-bold text-neutral-900">Aide & Support</h1>
        </div>

        {/* Contact */}
        <div className="mx-4 mb-6">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Nous contacter</p>
          <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50 overflow-hidden">
            <a
              href="mailto:contact@getchair.app"
              className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
                <Mail size={17} className="text-white" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-neutral-900">Email</p>
                <p className="text-[12px] text-neutral-400 mt-0.5">contact@getchair.app</p>
              </div>
            </a>
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <Clock size={17} className="text-neutral-400" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-neutral-900">Disponibilité</p>
                <p className="text-[12px] text-neutral-400 mt-0.5">Lun–Ven, 9h–18h · Réponse sous 72h</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-4">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Questions fréquentes</p>
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            {FAQS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-neutral-300 mt-8 px-4">
          CHAIR · Version 1.0 · <a href="/confidentialite" className="underline">Confidentialité</a> · <a href="/cgu" className="underline">CGU</a>
        </p>

      </div>
    </AppShell>
  );
}
