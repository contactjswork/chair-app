'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { Mail, Clock, ChevronDown, ShieldCheck, FileText, Users, Scale, ShieldOff } from 'lucide-react';
import {
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
  SUPPORT_HOURS,
  SUPPORT_RESPONSE_DELAY,
  MODERATION_DELAY,
} from '@/lib/contact';

const FAQS = [
  {
    q: 'Comment réserver un rendez-vous ?',
    a: "Va sur le profil d'un coiffeur, choisis une date et un créneau disponible, puis confirme ta réservation. Tu recevras une notification de confirmation.",
  },
  {
    q: 'Comment annuler une réservation ?',
    a: "Retrouve ton rendez-vous dans Compte → Mes réservations, puis appuie sur « Annuler ce rendez-vous ». C'est possible tant que le rendez-vous n'a pas eu lieu ; une fois passé, il n'est plus annulable. Pour le décaler, contacte directement le coiffeur : c'est lui qui gère son agenda.",
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
    a: 'Va dans Compte → Modifier mon profil. Tu peux y changer ton nom, ta photo, ta ville et ton numéro de téléphone.',
  },
  {
    q: 'Comment signaler un contenu inapproprié ?',
    a: `Ouvre le menu ⋯ présent sur la réalisation, le profil ou l'avis concerné, puis choisis Signaler et indique le motif. Notre équipe examine chaque signalement ${MODERATION_DELAY}.`,
  },
  {
    q: 'Comment bloquer quelqu’un ?',
    a: "Depuis le profil de la personne, ouvre le menu ⋯ puis Bloquer. Ses publications disparaissent immédiatement de ton fil. Tu peux le débloquer à tout moment dans les règles de communauté.",
  },
  {
    q: 'Comment supprimer mon compte ?',
    a: `Va dans Compte → Supprimer mon compte. Cette action est irréversible. Tu peux aussi envoyer une demande à ${SUPPORT_EMAIL}.`,
  },
  {
    q: "L'app est-elle gratuite ?",
    a: 'CHAIR est 100% gratuit pour les clients : découvrir, réserver et laisser des avis ne coûte rien. Les coiffeurs disposent de leur propre espace, CHAIR PRO, pour gérer leur activité.',
  },
];

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full text-left px-5 py-4 border-b border-neutral-50 last:border-0 active:bg-neutral-50 transition-colors"
      aria-expanded={open}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[14px] font-semibold text-neutral-900 leading-snug">{q}</p>
        <ChevronDown
          size={16}
          className={`text-neutral-400 flex-shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>
      <div className={`grid transition-all duration-200 ease-out ${open ? 'grid-rows-[1fr] opacity-100 mt-2.5' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <p className="text-[13px] text-neutral-500 leading-relaxed pr-4">{a}</p>
        </div>
      </div>
    </button>
  );
}

export default function AidePage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 pb-28">

        <PageHeader title="Aide & Support" backHref="/app/compte" />

        {/* Contact */}
        <div className="mt-4 mb-6">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Nous contacter</p>
          <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50 overflow-hidden">
            <a
              href={SUPPORT_MAILTO}
              className="flex items-center gap-4 px-5 py-4 active:bg-neutral-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
                <Mail size={17} className="text-white" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-neutral-900">Email</p>
                <p className="text-[12px] text-neutral-400 mt-0.5">{SUPPORT_EMAIL}</p>
              </div>
            </a>
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <Clock size={17} className="text-neutral-400" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-neutral-900">Disponibilité</p>
                <p className="text-[12px] text-neutral-400 mt-0.5">{SUPPORT_HOURS} · Réponse {SUPPORT_RESPONSE_DELAY}</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Questions fréquentes</p>
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            {FAQS.map((item, i) => (
              <FaqItem
                key={item.q}
                q={item.q}
                a={item.a}
                open={openIndex === i}
                onToggle={() => setOpenIndex((cur) => (cur === i ? null : i))}
              />
            ))}
          </div>
        </div>

        {/* Légal */}
        <div className="mt-6">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Légal</p>
          <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50 overflow-hidden">
            <Link href="/confidentialite" className="flex items-center gap-4 px-5 py-4 active:bg-neutral-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={17} className="text-neutral-400" />
              </div>
              <p className="text-[14px] font-semibold text-neutral-900">Confidentialité</p>
            </Link>
            <Link href="/cgu" className="flex items-center gap-4 px-5 py-4 active:bg-neutral-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <FileText size={17} className="text-neutral-400" />
              </div>
              <p className="text-[14px] font-semibold text-neutral-900">Conditions générales</p>
            </Link>
            <Link href="/app/regles-communaute" className="flex items-center gap-4 px-5 py-4 active:bg-neutral-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <Users size={17} className="text-neutral-400" />
              </div>
              <p className="text-[14px] font-semibold text-neutral-900">Règles de communauté</p>
            </Link>
            {/* App Store 1.2 : la gestion des comptes bloqués doit être
                atteignable sans deviner qu'elle vit au bas des règles de
                communauté. Elle est aussi listée dans Compte → Sécurité. */}
            <Link href="/app/regles-communaute#comptes-bloques" className="flex items-center gap-4 px-5 py-4 active:bg-neutral-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <ShieldOff size={17} className="text-neutral-400" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-neutral-900">Comptes bloqués</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Voir et débloquer les comptes que tu as bloqués</p>
              </div>
            </Link>
            <Link href="/mentions-legales" className="flex items-center gap-4 px-5 py-4 active:bg-neutral-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <Scale size={17} className="text-neutral-400" />
              </div>
              <p className="text-[14px] font-semibold text-neutral-900">Mentions légales</p>
            </Link>
          </div>
        </div>

        <p className="text-center text-[11px] text-neutral-300 mt-8">
          CHAIR · Version 1.0
        </p>

      </div>
    </AppShell>
  );
}
