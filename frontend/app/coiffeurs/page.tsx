import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import LandingFooter from '@/components/landing/LandingFooter';
import PhoneMockup from '@/components/landing/PhoneMockup';
import { ArrowRight, BarChart2, Star, ShieldCheck, Trophy, Users, Camera, Calendar, Zap } from 'lucide-react';

const FEATURES_HAIRDRESSER = [
  {
    icon: <Camera size={20} className="text-white" />,
    title: 'Portfolio professionnel',
    desc: 'Publie tes réalisations avant/après. Tes meilleures coupes, tes colorations, ton style. Construis ta vitrine visuelle.',
    bg: 'bg-neutral-900',
  },
  {
    icon: <ShieldCheck size={20} className="text-white" />,
    title: 'Avis certifiés QR',
    desc: 'Chaque client qui vient te voir reçoit un QR code unique. Son avis est certifié et lié à une vraie visite. Tes étoiles sont méritées.',
    bg: 'bg-neutral-800',
  },
  {
    icon: <Users size={20} className="text-white" />,
    title: 'Abonnés & communauté',
    desc: 'Tes clients s\'abonnent à ton profil. Ils sont notifiés quand tu postes. Construis ta communauté, fidélise ta clientèle.',
    bg: 'bg-neutral-700',
  },
  {
    icon: <Trophy size={20} className="text-white" />,
    title: 'Score & badges CHAIR',
    desc: 'Plus tu es actif, plus ton score monte. Badges de vérification, niveaux, classements. Montre que tu es un pro sérieux.',
    bg: 'bg-neutral-900',
  },
  {
    icon: <BarChart2 size={20} className="text-white" />,
    title: 'Dashboard & statistiques',
    desc: 'Vues de profil, abonnés, avis, rendez-vous. Toutes tes métriques en un coup d\'oeil. Prends les bonnes décisions.',
    bg: 'bg-neutral-800',
  },
  {
    icon: <Calendar size={20} className="text-white" />,
    title: 'Gestion des réservations',
    desc: 'Accepte, refuse, planifie. Gère tes rendez-vous directement depuis l\'app. Confirmation automatique pour le client.',
    bg: 'bg-neutral-700',
  },
];

const STATS = [
  { value: '500+', label: 'coiffeurs sur CHAIR' },
  { value: '4.9', label: 'note moyenne des profils' },
  { value: '100%', label: 'avis certifiés vérifiés' },
  { value: '2min', label: 'pour créer son profil' },
];

const PRO_FEATURES = [
  {
    icon: <Zap size={18} className="text-white" />,
    title: 'Location de fauteuil',
    desc: 'Tu cherches un espace pour travailler à ton compte ? Trouve des salons partenaires qui louent des fauteuils. Travaille librement, sans contrainte.',
  },
  {
    icon: <Users size={18} className="text-white" />,
    title: 'Marketplace pro',
    desc: 'Connexion entre indépendants et salons. Propose ton fauteuil ou trouve-en un. La flexibilité du freelance, avec la visibilité d\'un salon.',
  },
  {
    icon: <BarChart2 size={18} className="text-white" />,
    title: 'Visibilité maximale',
    desc: 'Profil PRO mis en avant dans les recherches. Badge CHAIR PRO. Plus de visibilité, plus de clients, plus de revenus.',
  },
];

export default function CoiffeursProPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />

      {/* ── Hero coiffeurs ── */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-neutral-950 text-white">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-4">
                Pour les coiffeurs
              </p>
              <h1 className="text-[48px] md:text-[58px] font-black leading-[1.05] tracking-tight mb-6">
                Ton profil pro.<br />
                <span className="text-neutral-500">Ton portfolio.</span><br />
                Tes clients.
              </h1>
              <p className="text-[16px] text-neutral-400 leading-relaxed mb-8 max-w-md">
                CHAIR est la seule plateforme qui te donne une vraie vitrine professionnelle,
                des avis certifiés et un dashboard pour gérer ton activité.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/inscription"
                  className="inline-flex items-center justify-center gap-2 bg-white text-neutral-900 font-bold text-[15px] px-7 py-4 rounded-2xl hover:bg-neutral-100 transition-all hover:scale-[1.02]"
                >
                  Rejoindre CHAIR — gratuit
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
                <Link
                  href="/connexion"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-semibold text-[15px] px-7 py-4 rounded-2xl hover:bg-white/20 transition-all border border-white/10"
                >
                  J&apos;ai déjà un compte
                </Link>
              </div>
            </div>
            <div className="hidden lg:flex justify-center items-center relative">
              <PhoneMockup gradient="from-neutral-700 to-neutral-950" label="Dashboard coiffeur" rotate="left" />
              {/* Floating stats */}
              <div className="absolute -right-4 top-1/4 bg-white rounded-2xl shadow-xl shadow-black/30 p-3.5 border border-neutral-100 w-44">
                <p className="text-[10px] text-neutral-400 mb-2 font-medium">Score CHAIR</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center">
                    <Trophy size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[14px] font-black text-neutral-900">305 pts</p>
                    <p className="text-[10px] text-neutral-400">Niveau Argent</p>
                  </div>
                </div>
              </div>
              {/* Avis */}
              <div className="absolute -left-6 bottom-1/3 bg-white rounded-2xl shadow-xl shadow-black/30 p-3.5 border border-neutral-100">
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map(i => <Star key={i} size={10} className="fill-neutral-900 stroke-neutral-900" />)}
                </div>
                <p className="text-[11px] font-bold text-neutral-900">+47 avis certifiés</p>
                <p className="text-[10px] text-neutral-400">note moyenne 4.9</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-14 bg-white border-b border-neutral-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-neutral-100 rounded-3xl overflow-hidden">
            {STATS.map((s, i) => (
              <div key={i} className="bg-white p-8 text-center">
                <p className="text-[32px] font-black text-neutral-900 leading-none mb-1">{s.value}</p>
                <p className="text-[12px] text-neutral-400 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-3">Ce que tu obtiens</p>
            <h2 className="text-[36px] md:text-[44px] font-black text-neutral-900 leading-tight tracking-tight">
              Tout ce qu&apos;il te faut pour<br />
              <span className="text-neutral-400">développer ton activité.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES_HAIRDRESSER.map((f, i) => (
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

      {/* ── CHAIR PRO ── */}
      <section id="chair-pro" className="py-24 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-neutral-900 text-white text-[11px] font-bold uppercase tracking-[0.15em] px-3.5 py-2 rounded-full mb-6">
                <Zap size={11} />
                Bientôt disponible
              </div>
              <h2 className="text-[36px] md:text-[44px] font-black text-neutral-900 leading-tight tracking-tight mb-4">
                CHAIR PRO.<br />
                <span className="text-neutral-400">La liberté du pro.</span>
              </h2>
              <p className="text-neutral-500 text-[15px] leading-relaxed mb-8">
                Tu travailles à ton compte ? CHAIR PRO connecte les coiffeurs indépendants
                aux salons qui louent des fauteuils. Flexibilité totale. Zéro engagement.
              </p>
              <div className="space-y-4">
                {PRO_FEATURES.map((f, i) => (
                  <div key={i} className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-neutral-100 hover:border-neutral-200 hover:shadow-sm transition-all">
                    <div className="w-9 h-9 bg-neutral-900 rounded-xl flex items-center justify-center flex-shrink-0">
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-neutral-900 mb-1">{f.title}</p>
                      <p className="text-[12px] text-neutral-500 leading-snug">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <p className="text-[13px] text-neutral-400 mb-3">Être notifié au lancement de CHAIR PRO :</p>
                <Link
                  href="/site-vitrine/contact"
                  className="inline-flex items-center gap-2 bg-neutral-900 text-white font-semibold text-[14px] px-6 py-3.5 rounded-xl hover:bg-neutral-700 transition-colors"
                >
                  Me tenir informé
                  <ArrowRight size={14} strokeWidth={2.5} />
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex justify-center">
              <PhoneMockup gradient="from-neutral-600 to-neutral-950" label="CHAIR PRO — Location fauteuil" rotate="right" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Témoignage coiffeur ── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-neutral-900 rounded-3xl p-10 text-white text-center">
            <div className="flex items-center justify-center gap-0.5 mb-6">
              {[1,2,3,4,5].map(i => <Star key={i} size={14} className="fill-white stroke-white" />)}
            </div>
            <blockquote className="text-[20px] md:text-[24px] font-bold leading-snug mb-6 max-w-2xl mx-auto">
              &ldquo;Depuis que je suis sur CHAIR, mes nouveaux clients arrivent en sachant exactement
              ce que je fais. Ils ont vu mon portfolio. Je n&apos;ai plus à me vendre. Le travail parle.&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold text-[13px]">JS</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-white text-[14px]">Julien S.</p>
                <p className="text-neutral-400 text-[12px]">Coiffeur indépendant — Bordeaux</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-neutral-50 text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-[36px] md:text-[42px] font-black text-neutral-900 leading-tight tracking-tight mb-4">
            Prêt à rejoindre<br />
            <span className="text-neutral-400">les meilleurs ?</span>
          </h2>
          <p className="text-neutral-500 text-[15px] mb-8">
            Crée ton profil en 2 minutes. C&apos;est gratuit. Tes futurs clients t&apos;attendent.
          </p>
          <Link
            href="/inscription"
            className="inline-flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold text-[15px] px-8 py-4 rounded-2xl hover:bg-neutral-700 transition-all hover:scale-[1.02] shadow-lg shadow-neutral-900/20"
          >
            Créer mon profil coiffeur
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
