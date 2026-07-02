'use client';

import { useState } from 'react';
import LandingNav from '@/components/landing/LandingNav';
import LandingFooter from '@/components/landing/LandingFooter';
import { ArrowRight, Send, Mail, ExternalLink } from 'lucide-react';

const CONTACT_OPTIONS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="3.5"/>
        <circle cx="17.5" cy="6.5" r="0.5" fill="white" stroke="none"/>
      </svg>
    ),
    label: 'Instagram',
    handle: '@chair.app',
    href: 'https://instagram.com/chair.app',
    desc: 'Suis-nous et envoie un DM',
    bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.79a8.18 8.18 0 0 0 4.78 1.52V6.85a4.85 4.85 0 0 1-1.01-.16Z"/>
      </svg>
    ),
    label: 'TikTok',
    handle: '@chair.app',
    href: 'https://tiktok.com/@chair.app',
    desc: 'Nos dernières vidéos',
    bg: 'bg-neutral-900',
  },
  {
    icon: <Mail size={20} className="text-white" />,
    label: 'Email',
    handle: 'contact@chair-app.com',
    href: 'mailto:contact@chair-app.com',
    desc: 'Pour toute demande pro',
    bg: 'bg-neutral-700',
  },
];

const SUBJECTS = [
  'Je suis client et j\'ai une question',
  'Je suis coiffeur et je veux rejoindre CHAIR',
  'Je veux en savoir plus sur CHAIR PRO',
  'Je signale un problème technique',
  'Presse / Partenariat',
  'Autre',
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-neutral-50 via-white to-neutral-50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-4">Contact</p>
          <h1 className="text-[44px] md:text-[56px] font-black text-neutral-900 leading-tight tracking-tight mb-5">
            On est là<br />
            <span className="text-neutral-400">pour t&apos;aider.</span>
          </h1>
          <p className="text-neutral-500 text-[16px] leading-relaxed max-w-md mx-auto">
            Une question, un projet, une idée ? N&apos;hésite pas. On répond à tous les messages.
          </p>
        </div>
      </section>

      {/* ── Contact channels + Form ── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* Left — channels */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-2">Nous trouver</p>
              {CONTACT_OPTIONS.map((c, i) => (
                <a
                  key={i}
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-5 bg-neutral-50 border border-neutral-100 rounded-2xl hover:border-neutral-200 hover:shadow-md hover:shadow-black/5 transition-all group"
                >
                  <div className={`w-11 h-11 ${c.bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                    {c.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[14px] font-bold text-neutral-900">{c.label}</p>
                    </div>
                    <p className="text-[12px] text-neutral-500 font-medium truncate">{c.handle}</p>
                    <p className="text-[11px] text-neutral-400">{c.desc}</p>
                  </div>
                  <ExternalLink size={13} className="text-neutral-300 group-hover:text-neutral-500 transition-colors flex-shrink-0" />
                </a>
              ))}

              {/* Response time */}
              <div className="mt-2 p-5 bg-neutral-50 border border-neutral-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <p className="text-[12px] font-semibold text-neutral-900">Délai de réponse</p>
                </div>
                <p className="text-[12px] text-neutral-500 leading-snug">
                  On répond généralement sous <strong className="text-neutral-900">24h</strong> en semaine.
                  DM Instagram souvent plus rapide.
                </p>
              </div>
            </div>

            {/* Right — form */}
            <div className="lg:col-span-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-6">Envoyer un message</p>

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-neutral-900 rounded-3xl flex items-center justify-center mb-5">
                    <Send size={24} className="text-white" />
                  </div>
                  <h3 className="text-[22px] font-black text-neutral-900 mb-2">Message envoyé !</h3>
                  <p className="text-neutral-500 text-[14px] leading-relaxed max-w-xs">
                    Merci pour ton message. On te répond dans les plus brefs délais.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-semibold text-neutral-600 mb-1.5">Prénom & nom</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder="Julien Dupont"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-[14px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-neutral-600 mb-1.5">Email</label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        placeholder="julien@email.com"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-[14px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-600 mb-1.5">Sujet</label>
                    <select
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      required
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-[14px] text-neutral-900 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all appearance-none"
                    >
                      <option value="">Sélectionne un sujet</option>
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-600 mb-1.5">Message</label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Dis-nous tout..."
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-[14px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-semibold text-[15px] py-4 rounded-2xl hover:bg-neutral-700 transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-neutral-900/20"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        Envoyer le message
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
