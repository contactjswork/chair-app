'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const FAQS = [
  {
    q: "CHAIR est-il gratuit ?",
    a: "Oui, CHAIR est entièrement gratuit pour les clients. Téléchargez l'application, créez votre compte et commencez à explorer des coiffeurs sans frais.",
  },
  {
    q: "Comment les avis sont-ils certifiés ?",
    a: "Chaque avis est généré automatiquement après un rendez-vous terminé. Le coiffeur scanne un QR code unique qui déverrouille la demande d'avis côté client. Impossible de laisser un avis sans avoir réellement visité le salon.",
  },
  {
    q: "Je suis coiffeur indépendant, CHAIR PRO est-il fait pour moi ?",
    a: "Absolument. CHAIR PRO est conçu pour les coiffeurs indépendants comme pour les salons. Gérez votre agenda, publiez votre portfolio, recevez des réservations directes et développez votre réputation grâce aux avis certifiés.",
  },
  {
    q: "Je travaille en salon, puis-je quand même utiliser CHAIR PRO ?",
    a: "Oui. CHAIR PRO est disponible en mode salarié de salon. Votre profil est rattaché à votre salon, et votre employeur peut gérer les disponibilités collectives.",
  },
  {
    q: "Comment fonctionne la réservation ?",
    a: "Le client choisit un créneau disponible sur le profil du coiffeur. La demande est envoyée au coiffeur qui confirme. Le client reçoit une notification de confirmation instantanée. Zéro appel, zéro attente.",
  },
  {
    q: "CHAIR est-il disponible dans ma ville ?",
    a: "CHAIR est disponible partout en France. La carte des coiffeurs s'enrichit chaque semaine. Si votre coiffeur n'est pas encore sur CHAIR, invitez-le à rejoindre la plateforme.",
  },
];

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="divide-y divide-neutral-100">
      {FAQS.map((faq, i) => (
        <div key={i}>
          <button
            className="w-full flex items-start justify-between gap-6 py-5 text-left group"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className={`text-[15px] font-medium leading-snug transition-colors ${open === i ? 'text-neutral-900' : 'text-neutral-700 group-hover:text-neutral-900'}`}>
              {faq.q}
            </span>
            <span className="flex-shrink-0 mt-0.5 text-neutral-400 group-hover:text-neutral-700 transition-colors">
              {open === i ? <Minus size={16} /> : <Plus size={16} />}
            </span>
          </button>
          {open === i && (
            <p className="pb-5 text-[14px] text-neutral-500 leading-relaxed max-w-2xl">
              {faq.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
