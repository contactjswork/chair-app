'use client';

import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { resolveMediaUrl, apptDateStr, formatApptDate, type ApiAppointment, type ApiPost } from '@/lib/types';
import { appointments as appointmentsApi, interactions, savedPosts as savedPostsApi } from '@/lib/api';
import type { SavedHairdresser } from '@/lib/api';
import { useEffect, useState } from 'react';
import {
  User, LogIn, UserPlus, LayoutDashboard, ChevronRight, LogOut,
  Clock, CalendarDays, Bell, Bookmark, Heart, Settings, Lock,
  MapPin, Edit3, Check,
} from 'lucide-react';
import { computeClientAchievements } from '@/components/ui/ChairBadges';
import { LEVEL_STYLES } from '@/lib/chairLevel';
import { useNotificationCount } from '@/contexts/NotificationContext';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  declined: 'Refusé',
  cancelled: 'Annulé',
  no_show: 'Absent',
  pending_payment: 'Paiement en attente',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  declined: 'bg-red-50 text-red-600 border-red-200',
  cancelled: 'bg-neutral-100 text-neutral-400 border-neutral-200',
  no_show: 'bg-orange-50 text-orange-600 border-orange-200',
  pending_payment: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function ComptePage() {
  const { user, isLoading, logout } = useAuth();
  const { unreadCount } = useNotificationCount();
  const [myAppointments, setMyAppointments] = useState<ApiAppointment[]>([]);
  const [followedHairdressers, setFollowedHairdressers] = useState<SavedHairdresser[]>([]);
  const [inspirations, setInspirations] = useState<ApiPost[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);

    const promises: Promise<void>[] = [];

    if (user.role === 'client') {
      promises.push(
        appointmentsApi.myList()
          .then((data) => setMyAppointments(data as ApiAppointment[]))
          .catch(() => {}),
        interactions.followedList()
          .then((data) => setFollowedHairdressers(data as SavedHairdresser[]))
          .catch(() => {}),
        savedPostsApi.list()
          .then((data) => setInspirations(data as ApiPost[]))
          .catch(() => {}),
      );
    }

    Promise.all(promises).finally(() => setDataLoading(false));
  }, [user]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 pt-6 space-y-3">
          <div className="h-40 bg-neutral-100 rounded-2xl animate-pulse" />
          <div className="h-14 bg-neutral-100 rounded-xl animate-pulse" />
          <div className="h-14 bg-neutral-100 rounded-xl animate-pulse" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto pb-28">

        {/* ── Non connecté ── */}
        {!user ? (
          <div className="px-4 pt-6 space-y-4">
            <div className="bg-neutral-50 rounded-2xl p-8 text-center mb-2">
              <div className="w-20 h-20 rounded-full bg-neutral-200 flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-neutral-400" />
              </div>
              <h3 className="font-bold text-neutral-900 mb-1.5">Connectez-vous à CHAIR</h3>
              <p className="text-sm text-neutral-500">Accédez à votre profil, vos inspirations et vos réservations.</p>
            </div>
            <Link
              href="/connexion"
              className="flex items-center justify-between w-full bg-neutral-900 text-white px-5 py-4 rounded-xl hover:bg-neutral-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <LogIn size={18} />
                <span className="font-semibold">Se connecter</span>
              </div>
              <ChevronRight size={18} />
            </Link>
            <Link
              href="/inscription"
              className="flex items-center justify-between w-full bg-white border border-neutral-200 text-neutral-900 px-5 py-4 rounded-xl hover:border-neutral-400 transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserPlus size={18} />
                <span className="font-semibold">Créer un compte</span>
              </div>
              <ChevronRight size={18} />
            </Link>
            <div className="border-t border-neutral-100 pt-4 mt-6">
              <p className="text-xs text-neutral-400 text-center mb-4">Vous êtes coiffeur ?</p>
              <Link
                href="/inscription?role=hairdresser"
                className="flex items-center justify-between w-full border border-neutral-200 text-neutral-700 px-5 py-4 rounded-xl hover:border-neutral-400 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard size={18} />
                  <div>
                    <p className="font-semibold text-sm">Créer mon profil professionnel</p>
                    <p className="text-xs text-neutral-400">Développez votre visibilité sur CHAIR</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-neutral-300" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════
                BLOC PROFIL
            ══════════════════════════════════════ */}
            <div className="relative bg-neutral-50 pt-10 pb-6 px-5">
              {/* Avatar */}
              <div className="relative w-[88px] h-[88px] mx-auto mb-4">
                <div className="w-full h-full rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center">
                  {resolveMediaUrl(user.avatar) ? (
                    <Image
                      src={resolveMediaUrl(user.avatar)!}
                      alt={user.name}
                      fill
                      className="object-cover"
                      sizes="88px"
                    />
                  ) : (
                    <span className="text-[32px] font-bold text-neutral-400 select-none">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Nom */}
              <div className="text-center mb-5">
                <h1 className="text-[22px] font-bold text-neutral-900 leading-tight">{user.name}</h1>
                {user.city && (
                  <p className="flex items-center justify-center gap-1 text-sm text-neutral-400 mt-1">
                    <MapPin size={12} />
                    {user.city}
                  </p>
                )}
                {user.role === 'hairdresser' && (
                  <span className="inline-block mt-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
                    Coiffeur
                  </span>
                )}
              </div>

              {/* Bouton modifier */}
              <div className="flex justify-center gap-3">
                <Link
                  href="/compte/modifier"
                  className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-semibold hover:bg-neutral-700 transition-colors"
                >
                  <Edit3 size={14} />
                  Modifier mon profil
                </Link>
                {user.role === 'hairdresser' && (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-5 py-2.5 border border-neutral-200 text-neutral-700 rounded-xl text-sm font-semibold hover:border-neutral-400 transition-colors"
                  >
                    <LayoutDashboard size={14} />
                    Dashboard
                  </Link>
                )}
              </div>
            </div>

            {/* ══════════════════════════════════════
                MES ABONNEMENTS (clients uniquement)
            ══════════════════════════════════════ */}
            {user.role === 'client' && (
              <section className="mt-6 px-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
                    Mes abonnements
                  </p>
                  {followedHairdressers.length > 0 && (
                    <span className="text-[11px] text-neutral-400">{followedHairdressers.length}</span>
                  )}
                </div>

                {dataLoading ? (
                  <div className="flex gap-3 overflow-x-hidden">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex-shrink-0 w-[72px] h-[72px] rounded-full bg-neutral-100 animate-pulse" />
                    ))}
                  </div>
                ) : followedHairdressers.length === 0 ? (
                  <div className="border border-dashed border-neutral-200 rounded-2xl p-6 text-center">
                    <p className="text-sm text-neutral-400">Aucun abonnement</p>
                    <Link href="/rechercher" className="text-xs font-medium text-neutral-900 mt-1 block hover:underline">
                      Découvrir des coiffeurs
                    </Link>
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
                    {followedHairdressers.map((h) => (
                      <Link
                        key={h.id}
                        href={`/coiffeur/${h.slug}`}
                        className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[68px]"
                      >
                        <div className="relative w-[60px] h-[60px] rounded-full overflow-hidden bg-neutral-100 ring-2 ring-neutral-100">
                          {h.user.avatar && resolveMediaUrl(h.user.avatar) ? (
                            <Image
                              src={resolveMediaUrl(h.user.avatar)!}
                              alt={h.user.name}
                              fill
                              className="object-cover"
                              sizes="60px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                              <span className="text-[18px] font-bold text-neutral-500">
                                {h.user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] font-medium text-neutral-600 text-center leading-tight line-clamp-2 w-full">
                          {h.user.name.split(' ')[0]}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ══════════════════════════════════════
                MES INSPIRATIONS (clients uniquement)
            ══════════════════════════════════════ */}
            {user.role === 'client' && (
              <section className="mt-6 px-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
                    Mes inspirations
                  </p>
                  {inspirations.length > 0 && (
                    <Link
                      href="/mes-inspirations"
                      className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 hover:text-neutral-900 transition-colors"
                    >
                      Voir tout <ChevronRight size={11} />
                    </Link>
                  )}
                </div>

                {dataLoading ? (
                  <div className="grid grid-cols-3 gap-1">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="aspect-square bg-neutral-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : inspirations.length === 0 ? (
                  <div className="border border-dashed border-neutral-200 rounded-2xl p-6 text-center">
                    <Heart size={24} className="mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm text-neutral-400">Aucune inspiration</p>
                    <p className="text-xs text-neutral-300 mt-1">Sauvegardez des réalisations qui vous inspirent</p>
                    <Link href="/" className="text-xs font-medium text-neutral-900 mt-2 block hover:underline">
                      Explorer le feed
                    </Link>
                  </div>
                ) : (
                  <InspirationGrid inspirations={inspirations.slice(0, 9)} />
                )}
              </section>
            )}

            {/* ══════════════════════════════════════
                MES RÉSERVATIONS (clients uniquement)
            ══════════════════════════════════════ */}
            {user.role === 'client' && (
              <section className="mt-6 px-4">
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
                  Mes réservations
                </p>

                {dataLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-24 bg-neutral-100 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : myAppointments.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-neutral-200 rounded-2xl">
                    <CalendarDays size={26} className="mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm text-neutral-400">Aucune réservation</p>
                    <p className="text-xs text-neutral-300 mt-1">Vos prochains rendez-vous apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myAppointments.map((appt) => (
                      <ClientAppointmentCard key={appt.id} appt={appt} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ══════════════════════════════════════
                ACHIEVEMENTS CLIENT
            ══════════════════════════════════════ */}
            {user.role === 'client' && !dataLoading && (() => {
              const completedBookings = myAppointments.filter((a) => a.status === 'completed').length;
              const reviewsLeft = myAppointments.filter((a) => a.review != null).length;
              const { achievements, points, level } = computeClientAchievements({
                hasAvatar: !!user.avatar,
                hasCity: !!user.city,
                savedCount: 0, // uses followedHairdressers as proxy
                followsCount: followedHairdressers.length,
                reviewsCount: reviewsLeft,
                bookingsCount: completedBookings,
              });
              const levelStyle = LEVEL_STYLES[
                level === 'Expert CHAIR' ? 'gold' : level === 'Régulier' ? 'silver' : level === 'Découvreur' ? 'bronze' : 'neutral'
              ];
              const doneCount = achievements.filter((a) => a.done).length;
              return (
                <section className="mt-6 px-4">
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
                    Mon parcours CHAIR
                  </p>
                  <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
                    {/* Level header */}
                    <div className={`px-5 py-4 flex items-center justify-between border-b border-neutral-50 ${levelStyle.bg}`}>
                      <div>
                        <p className={`text-xs font-bold ${levelStyle.text}`}>{level}</p>
                        <p className="text-[11px] text-neutral-500">{points} pts · {doneCount}/{achievements.length} objectifs</p>
                      </div>
                      <div className={`text-lg font-bold ${levelStyle.text}`}>{points} pts</div>
                    </div>
                    {/* Achievement list */}
                    {achievements.map((a) => {
                      const Icon = a.icon;
                      return (
                        <div key={a.name} className="flex items-center gap-3 px-5 py-3.5 border-b border-neutral-50 last:border-0">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${a.done ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-200'}`}>
                            {a.done ? <Check size={10} className="text-white" strokeWidth={3} /> : null}
                          </div>
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${a.done ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
                            <Icon size={13} className={a.done ? 'text-white' : 'text-neutral-400'} strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${a.done ? 'text-neutral-900' : 'text-neutral-400'}`}>{a.name}</p>
                            <p className="text-[11px] text-neutral-400">{a.desc}</p>
                          </div>
                          <span className={`text-[11px] font-bold flex-shrink-0 ${a.done ? 'text-green-600' : 'text-neutral-300'}`}>
                            +{a.pts} pts
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })()}

            {/* ══════════════════════════════════════
                PARAMÈTRES
            ══════════════════════════════════════ */}
            <section className="mt-6 px-4">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
                Paramètres
              </p>
              <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50 overflow-hidden">
                <Link
                  href="/notifications"
                  className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-neutral-900">
                    <Bell size={17} className="text-neutral-400" />
                    <span className="font-medium text-sm">Notifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    <ChevronRight size={15} className="text-neutral-300" />
                  </div>
                </Link>

                <Link
                  href="/mes-inspirations"
                  className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-neutral-900">
                    <Bookmark size={17} className="text-neutral-400" />
                    <span className="font-medium text-sm">Mes inspirations</span>
                  </div>
                  {inspirations.length > 0 && (
                    <span className="text-xs text-neutral-400 mr-1">{inspirations.length}</span>
                  )}
                  <ChevronRight size={15} className="text-neutral-300" />
                </Link>

                <Link
                  href="/confidentialite"
                  className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-neutral-900">
                    <Lock size={17} className="text-neutral-400" />
                    <span className="font-medium text-sm">Confidentialité</span>
                  </div>
                  <ChevronRight size={15} className="text-neutral-300" />
                </Link>

                <Link
                  href="/cgu"
                  className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-neutral-900">
                    <Settings size={17} className="text-neutral-400" />
                    <span className="font-medium text-sm">Conditions d&apos;utilisation</span>
                  </div>
                  <ChevronRight size={15} className="text-neutral-300" />
                </Link>
              </div>
            </section>

            {/* Déconnexion */}
            <div className="mt-4 px-4">
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full px-5 py-4 rounded-xl border border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <LogOut size={17} />
                <span className="font-medium text-sm">Se déconnecter</span>
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// ── Grille inspirations ───────────────────────────────────────────────

function InspirationGrid({ inspirations }: { inspirations: ApiPost[] }) {
  return (
    <div className="grid grid-cols-3 gap-[2px]">
      {inspirations.map((post) => {
        const url = resolveMediaUrl(
          post.images.find((i) => i.type === 'after' || i.type === 'result')?.url ?? post.cover_image
        );
        return (
          <Link
            key={post.id}
            href={`/realisation/${post.id}`}
            className="relative aspect-square overflow-hidden rounded-sm bg-neutral-100 group"
          >
            {url ? (
              <Image
                src={url}
                alt={post.specialty?.name ?? ''}
                fill
                className="object-cover group-hover:scale-[1.05] transition-transform duration-500"
                sizes="33vw"
              />
            ) : (
              <div className="absolute inset-0 bg-neutral-200" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

// ── Carte réservation client ─────────────────────────────────────────

function ClientAppointmentCard({ appt }: { appt: ApiAppointment }) {
  const hairdresserName = appt.hairdresser?.user?.name ?? 'Coiffeur';
  const hairdresserSlug = appt.hairdresser?.slug;
  const hairdresserCity = appt.hairdresser?.city;
  const dateLabel = formatApptDate(appt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const startTime = appt.appointment_time?.slice(0, 5);

  const endTime = (() => {
    if (!startTime || !appt.duration_minutes) return null;
    const [h, m] = startTime.split(':').map(Number);
    const total = h * 60 + m + appt.duration_minutes;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  })();

  return (
    <div className="border border-neutral-200 rounded-2xl overflow-hidden">
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-neutral-900 truncate">{hairdresserName}</p>
            {hairdresserCity && <p className="text-xs text-neutral-400">{hairdresserCity}</p>}
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLOR[appt.status] ?? 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
            {STATUS_LABEL[appt.status] ?? appt.status}
          </span>
        </div>
        <p className="text-sm text-neutral-700 font-medium">{appt.service}</p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {dateLabel && <span className="text-xs text-neutral-500 capitalize">{dateLabel}</span>}
          {startTime && (
            <span className="flex items-center gap-1 text-xs font-semibold text-neutral-900">
              <Clock size={11} />
              {startTime && endTime ? `${startTime} — ${endTime}` : startTime}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          {appt.duration_minutes && <span className="text-xs text-neutral-400">{appt.duration_minutes} min</span>}
          {appt.price && <span className="text-xs font-semibold text-neutral-900">{parseFloat(appt.price).toFixed(0)} €</span>}
        </div>
        {hairdresserSlug && (
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <Link
              href={`/coiffeur/${hairdresserSlug}`}
              className="text-xs font-medium text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
            >
              Voir le profil du coiffeur <ChevronRight size={12} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
