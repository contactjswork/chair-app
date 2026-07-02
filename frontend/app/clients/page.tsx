import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import LandingFooter from '@/components/landing/LandingFooter';
import PhoneMockup from '@/components/landing/PhoneMockup';
import { ArrowRight, Heart, MapPin, ShieldCheck, Star, Bookmark, Calendar, Sparkles, Search } from 'lucide-react';

const FEATURES = [
  {
    icon: <Sparkles size={20} className="text-white" />,
    title: 'Feed d’inspiration',
    desc: 'Parcours des centaines de réalisations réelles. Likes, sauvegardes, découvertes. Comme Instagram, mais pour trouver ton coiffeur.',
    bg: 'bg-neutral-900',
  },
  {
    icon: <Search size={20} className="text-white" />,
    title: 'Recherche avancée',
    desc: 'Filtre par ville, spécialité (coupe femme, barbe, locks, coloration...), note, distance. Trouve exactement ce que tu veux.',
    bg: 'bg-neutral-800',
  },
  {
    icon: <MapPin size={20} className="text-white" />,
    title: 'Géolocalisation',
    desc: 'Découvre les coiffeurs près de chez toi. Voir les distances en temps réel. Plus besoin de chercher manuellement.',
    bg: 'bg-neutral-700',
  },
  {
    icon: <ShieldCheck size={20} className="text-white" />,
    title: 'Avis 100% certifiés',
    desc: 'Chaque avis est lié à une vraie visite via QR code unique. Zero faux avis. Tu sais exactement à qui tu fais confiance.',
    bg: 'bg-neutral-900',
  },
  {
    icon: <Bookmark size={20} className="text-white" />,
    title: 'Favoris & inspirations',
    desc: 'Sauvegarde les réalisations qui t\'inspirent. Retrouve-les facilement. Montre-les à ton coiffeur le jour du rendez-vous.',
    bg: 'bg-neutral-800',
  },
  {
    icon: <Calendar size={20} className="text-white" />,
    title: 'Réservation directe',
    desc: 'Prends rendez-vous en 2 clics depuis l\'app. Confirmation immédiate. Rappels automatiques. Zéro appel, zéro attente.',
    bg: 'bg-neutral-700',
  },
];

const JOURNEY = [
  {
    step: '01',
    title: 'Tu explores',
    desc: 'Tu scrolles le feed. Tu vois des coupes, des colorations, des barbes. Tu likes, tu sauvegardes, tu découvres.',
  },
  {
    step: '02',
    title: 'Tu choisis',
    desc: 'Tu cliques sur un profil. Tu vois le portfolio complet, les avis certifiés, les spécialités, la localisation.',
  },
  {
    step: '03',
    title: 'Tu réserves',
    desc: 'En 2 clics depuis l\'app. Date, heure, service. Confirmation immédiate. Le coiffeur reçoit une notification.',
  },
  {
    step: '04',
    title: 'Tu valides',
    desc: 'Après ta visite, tu reçois un QR code pour laisser un avis certifié. Ton témoignage aide la communauté.',
  },
];

export default function ClientsPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />

      {/* ── Hero clients ── */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-neutral-50">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-neutral-100/60 rounded-full blur-3xl -translate-x-1/3 -translate-y-1/3" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-4">
                Pour les clients
              </p>
              <h1 className="text-[48px] md:text-[58px] font-black text-neutral-900 leading-[1.05] tracking-tight mb-6">
                Trouve le coiffeur<br />
                <span className="text-neutral-400">que tu cherches</span><br />
                vraiment.
              </h1>
              <p className="text-[16px] text-neutral-500 leading-relaxed mb-8 max-w-md">
                Fini de choisir un coiffeur au hasard. Avec CHAIR, tu vois le vrai travail
                avant de réserver. Les photos ne mentent pas.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/inscription"
                  className="inline-flex items-center justify-center gap-2 bg-neutral-900 text-white font-semibold text-[15px] px-7 py-4 rounded-2xl hover:bg-neutral-700 transition-all hover:scale-[1.02] shadow-lg shadow-neutral-900/20"
                >
                  Créer mon compte
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
                <Link
                  href="/app/feed"
                  className="inline-flex items-center justify-center gap-2 bg-white text-neutral-900 font-semibold text-[15px] px-7 py-4 rounded-2xl border border-neutral-200 hover:border-neutral-400 transition-all"
                >
                  Explorer le feed
                </Link>
              </div>
            </div>
            <div className="hidden lg:flex justify-center items-center relative">
              <PhoneMockup gradient="from-neutral-700 to-neutral-950" label="Recherche & filtres" rotate="right" />
              {/* Floating */}
              <div className="absolute -left-10 top-1/3 bg-white rounded-2xl shadow-xl shadow-black/10 p-3.5 flex items-center gap-3 border border-neutral-100">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <Heart size={15} className="text-neutral-900 fill-neutral-900" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-neutral-900">237 inspirations</p>
                  <p className="text-[10px] text-neutral-400">sauvegardées</p>
                </div>
              </div>
              {/* Rating */}
              <div className="absolute -right-8 bottom-1/4 bg-white rounded-2xl shadow-xl shadow-black/10 p-3.5 border border-neutral-100">
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map(i => <Star key={i} size={11} className="fill-neutral-900 stroke-neutral-900" />)}
                </div>
                <p className="text-[11px] font-bold text-neutral-900">Avis certifié</p>
                <p className="text-[10px] text-neutral-400">via QR code unique</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-3">Fonctionnalités</p>
            <h2 className="text-[36px] md:text-[44px] font-black text-neutral-900 leading-tight tracking-tight">
              Tout ce qu&apos;il te faut pour<br />
              <span className="text-neutral-400">bien choisir.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-7 rounded-3xl bg-neutral-50 border border-neutral-100 hover:border-neutral-200 hover:shadow-md hover:shadow-black/5 transition-all">
                <div className={`w-11 h-11 ${f.bg} rounded-2xl flex items-center justify-center mb-5`}>
                  {f.icon}
                </div>
                <h3 className="text-[16px] font-bold text-neutral-900 mb-2">{f.title}</h3>
                <p className="text-[13px] text-neutral-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Parcours client ── */}
      <section className="py-24 bg-neutral-950 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-3">Ton parcours</p>
            <h2 className="text-[36px] md:text-[44px] font-black leading-tight tracking-tight">
              De zéro à ton rendez-vous<br />
              <span className="text-neutral-500">en quelques minutes.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {JOURNEY.map((j, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-[11px] font-black text-neutral-600 tracking-widest mb-4">{j.step}</span>
                <div className="w-px h-8 bg-white/10 mb-4" />
                <h3 className="text-[18px] font-bold text-white mb-2">{j.title}</h3>
                <p className="text-[13px] text-neutral-400 leading-relaxed">{j.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="py-24 bg-white text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-[36px] md:text-[44px] font-black text-neutral-900 leading-tight tracking-tight mb-4">
            Prêt à trouver<br />
            <span className="text-neutral-400">ton coiffeur idéal ?</span>
          </h2>
          <p className="text-neutral-500 text-[15px] mb-8 leading-relaxed">
            Rejoins CHAIR gratuitement. Explore, favoris, réserve. Ton prochain coiffeur t&apos;attend.
          </p>
          <Link
            href="/inscription"
            className="inline-flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold text-[15px] px-8 py-4 rounded-2xl hover:bg-neutral-700 transition-all hover:scale-[1.02] shadow-lg shadow-neutral-900/20"
          >
            Créer mon compte — c&apos;est gratuit
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
