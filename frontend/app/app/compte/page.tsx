'use client';

import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { resolveMediaUrl, getAfterImage, formatApptDate, type ApiAppointment } from '@/lib/types';
import { appointments as appointmentsApi, interactions } from '@/lib/api';
import { hapticWarning } from '@/lib/haptics';
import type { SavedHairdresser } from '@/lib/api';
import { useEffect, useState } from 'react';
import {
  User, LogIn, UserPlus, LayoutDashboard, ChevronRight, LogOut,
  Clock, CalendarDays, Bell, HelpCircle, Scissors, Trash2,
  MapPin, Edit3, FileText, Shield, CalendarX, CalendarPlus, Loader2, X,
  ShieldOff, ScrollText, ChevronDown, Scale,
} from 'lucide-react';
import { BlockedAccountsList } from '@/components/ui/BlockConfirmSheet';
import BottomSheet from '@/components/ui/BottomSheet';
import { createPortal } from 'react-dom';
import { computeClientAchievements } from '@/components/ui/ChairBadges';
import { LEVEL_STYLES } from '@/lib/chairLevel';
import { Skeleton, SkeletonCircle } from '@/components/ui/Skeleton';
import PushOptInCard from '@/components/ui/PushOptInCard';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  declined: 'Refusé',
  cancelled: 'Annulé',
  no_show: 'Absent',
  // Statut vestigial : aucun code ne le produit (voir docs/app-store/PAYMENTS_AUDIT.md).
  // "Paiement en attente" laissait croire à un débit en cours dans l'app, alors
  // qu'aucune prestation n'est jamais payée ici — tout se règle au salon.
  pending_payment: 'À régler sur place',
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

/**
 * Statuts depuis lesquels le client peut encore annuler — miroir exact de la
 * machine à états du serveur (AppointmentController::STATUS_TRANSITIONS).
 * Le serveur reste seul juge : ceci évite juste d'afficher un bouton qui
 * échouerait à coup sûr.
 */
const CLIENT_CANCELLABLE_STATUSES: string[] = ['pending', 'pending_payment', 'confirmed'];

/** Instant de début du rendez-vous, ou null si aucune date n'est connue. */
function apptStartsAt(appt: ApiAppointment): Date | null {
  const day = appt.appointment_date ?? appt.desired_date;
  if (!day) return null;
  // Sans heure ferme (demande legacy avec un simple « matin »), le rendez-vous
  // n'est considéré passé qu'à la fin de la journée demandée — même règle que
  // le serveur, pour ne jamais proposer un bouton que l'API refuserait.
  const time = appt.appointment_time?.slice(0, 5) ?? '23:59';
  const parsed = new Date(`${day}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function canClientCancel(appt: ApiAppointment): boolean {
  if (!CLIENT_CANCELLABLE_STATUSES.includes(appt.status)) return false;
  const startsAt = apptStartsAt(appt);
  return startsAt === null || startsAt.getTime() > Date.now();
}

export default function ComptePage() {
  const { user, isLoading, logout } = useAuth();
  const [myAppointments, setMyAppointments] = useState<ApiAppointment[]>([]);
  const [followedHairdressers, setFollowedHairdressers] = useState<SavedHairdresser[]>([]);
  // Nombre de favoris — voir /app/objectifs : sans lui, trois objectifs sur
  // neuf restaient cadenasses alors que leur condition etait remplie.
  const [savedCount, setSavedCount] = useState(0);
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
        interactions.savedList()
          .then((data) => setSavedCount((data as unknown[]).length))
          .catch(() => {}),
      );
    }

    Promise.all(promises).finally(() => setDataLoading(false));
  }, [user]);

  /**
   * Coiffeurs déjà vus, pour reprendre rendez-vous en un tap.
   *
   * Dérivé des rendez-vous plutôt que d'un nouvel appel : la donnée est déjà
   * là. Un coiffeur n'apparaît qu'une fois, les plus récents d'abord — la
   * liste est déjà triée par date décroissante côté serveur.
   *
   * Les rendez-vous annulés ou refusés en sont exclus : reproposer quelqu'un
   * chez qui on n'est jamais allé n'a rien d'un raccourci utile.
   */
  const rebookables = (() => {
    const seen = new Set<string>();
    const out: { slug: string; name: string; avatar: string | null }[] = [];
    for (const a of myAppointments) {
      if (a.status === 'cancelled' || a.status === 'declined') continue;
      const slug = a.hairdresser?.slug;
      const name = a.hairdresser?.user?.name;
      if (!slug || !name || seen.has(slug)) continue;
      seen.add(slug);
      out.push({ slug, name, avatar: resolveMediaUrl(a.hairdresser?.user?.avatar) });
      if (out.length >= 8) break;
    }
    return out;
  })();

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 pt-6 space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
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
              <h3 className="font-bold text-neutral-900 mb-1.5">Connecte-toi à CHAIR</h3>
              <p className="text-sm text-neutral-500">Accède à ton profil, tes inspirations et tes réservations.</p>
            </div>
            <Link
              href="/connexion?returnTo=%2Fapp%2Fcompte"
              className="flex items-center justify-between w-full bg-neutral-900 text-white px-5 py-4 rounded-xl hover:bg-neutral-700 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <LogIn size={18} />
                <span className="font-semibold">Se connecter</span>
              </div>
              <ChevronRight size={18} />
            </Link>
            <Link
              href="/inscription"
              className="flex items-center justify-between w-full bg-white border border-neutral-200 text-neutral-900 px-5 py-4 rounded-xl hover:border-neutral-400 active:scale-[0.98] active:bg-neutral-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <UserPlus size={18} />
                <span className="font-semibold">Créer un compte</span>
              </div>
              <ChevronRight size={18} />
            </Link>
            <div className="border-t border-neutral-100 pt-4 mt-6">
              <p className="text-xs text-neutral-400 text-center mb-4">Tu es coiffeur ?</p>
              <Link
                href="/pro/inscription"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full border border-neutral-200 text-neutral-700 px-5 py-4 rounded-xl hover:border-neutral-400 active:scale-[0.98] active:bg-neutral-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard size={18} />
                  <div>
                    <p className="font-semibold text-sm">Créer mon profil professionnel</p>
                    <p className="text-xs text-neutral-400">Sur l&apos;app CHAIR PRO, séparée</p>
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
            <div className="relative bg-white pt-8 pb-6 px-5 border-b border-neutral-100">
              {/* Avatar */}
              <div className="relative w-[88px] h-[88px] rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center mx-auto mb-4">
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
                {user.role === 'salon_owner' && (
                  <span className="inline-block mt-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
                    Gérant salon
                  </span>
                )}
              </div>

              {/* Bouton modifier */}
              <div className="flex justify-center gap-3">
                <Link
                  href="/app/compte/modifier"
                  className="relative before:absolute before:-inset-y-[2px] before:inset-x-0 before:content-[''] flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-semibold hover:bg-neutral-700 active:scale-[0.97] transition-all"
                >
                  <Edit3 size={14} />
                  Modifier mon profil
                </Link>
                {user.role === 'hairdresser' && (
                  <Link
                    href="/pro"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 border border-neutral-200 text-neutral-700 rounded-xl text-sm font-semibold hover:border-neutral-400 active:scale-[0.97] active:bg-neutral-50 transition-all"
                  >
                    <LayoutDashboard size={14} />
                    Dashboard
                  </Link>
                )}
                {user.role === 'salon_owner' && (
                  <Link
                    href="/pro/salon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 border border-neutral-200 text-neutral-700 rounded-xl text-sm font-semibold hover:border-neutral-400 active:scale-[0.97] active:bg-neutral-50 transition-all"
                  >
                    <LayoutDashboard size={14} />
                    Mon salon
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
                      <SkeletonCircle key={i} size="w-[72px] h-[72px]" className="flex-shrink-0" />
                    ))}
                  </div>
                ) : followedHairdressers.length === 0 ? (
                  <div className="border border-dashed border-neutral-200 rounded-2xl p-6 text-center">
                    <p className="text-sm text-neutral-400">Aucun abonnement</p>
                    <Link href="/app/recherche" className="text-xs font-medium text-neutral-900 mt-1 block hover:underline">
                      Découvrir des coiffeurs
                    </Link>
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
                    {followedHairdressers.map((h) => (
                      <Link
                        key={h.id}
                        href={`/app/coiffeur/${h.slug}`}
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
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : myAppointments.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-neutral-200 rounded-2xl">
                    <CalendarDays size={26} className="mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm text-neutral-400">Aucune réservation</p>
                    <p className="text-xs text-neutral-500 mt-1">Tes prochains rendez-vous apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myAppointments.map((appt) => (
                      <ClientAppointmentCard
                        key={appt.id}
                        appt={appt}
                        onUpdated={(updated) =>
                          // Mise à jour en place : la liste reflète l'annulation
                          // immédiatement, sans recharger tout l'écran.
                          setMyAppointments((prev) =>
                            prev.map((a) => (a.id === updated.id ? updated : a))
                          )
                        }
                      />
                    ))}
                  </div>
                )}

                {/* ── Reprendre rendez-vous ──────────────────────────────
                    Un client satisfait devait refaire une recherche complète
                    pour revenir chez le même coiffeur : chercher, filtrer,
                    retrouver le bon profil. C'est absurde — c'est exactement
                    le client qu'on veut garder, et le seul dont on connaisse
                    déjà le choix. */}
                {!dataLoading && rebookables.length > 0 && (
                  <div className="mt-7">
                    <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
                      Reprendre rendez-vous
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                      {rebookables.map((h) => (
                        <Link
                          key={h.slug}
                          href={`/app/coiffeur/${h.slug}`}
                          className="flex-shrink-0 w-[76px] flex flex-col items-center gap-2 active:scale-[0.94] transition-transform"
                        >
                          <div className="relative w-[62px] h-[62px] rounded-full overflow-hidden bg-neutral-200 ring-1 ring-neutral-100">
                            {h.avatar ? (
                              <Image src={h.avatar} alt={h.name} fill className="object-cover" sizes="62px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-lg font-bold text-neutral-400">{h.name.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] font-semibold text-neutral-700 text-center leading-tight truncate w-full">
                            {h.name.split(' ')[0]}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ══════════════════════════════════════
                ACHIEVEMENTS CLIENT — carte compacte
            ══════════════════════════════════════ */}
            {user.role === 'client' && !dataLoading && (() => {
              const completedBookings = myAppointments.filter((a) => a.status === 'completed').length;
              const reviewsLeft = myAppointments.filter((a) => a.review != null).length;
              const { achievements, points, level } = computeClientAchievements({
                hasAvatar: !!user.avatar,
                hasCity: !!user.city,
                savedCount,
                followsCount: followedHairdressers.length,
                reviewsCount: reviewsLeft,
                bookingsCount: completedBookings,
              });
              const levelKey = level === 'Expert CHAIR' ? 'gold' : level === 'Régulier' ? 'silver' : level === 'Découvreur' ? 'bronze' : 'neutral';
              const levelStyle = LEVEL_STYLES[levelKey];
              const doneCount = achievements.filter((a) => a.done).length;
              const nextLevel = achievements.find((a) => !a.done);
              const progressPct = Math.round((doneCount / achievements.length) * 100);
              return (
                <section className="mt-4 px-4">
                  <Link href="/app/objectifs" className={`flex items-center gap-4 px-5 py-4 rounded-2xl border border-neutral-100 ${levelStyle.bg} active:opacity-80 transition-opacity`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className={`text-sm font-bold ${levelStyle.text}`}>{level}</p>
                        <span className="text-[10px] text-neutral-400 font-medium">{doneCount}/{achievements.length} objectifs</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                        <div className="h-full bg-neutral-900 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                      </div>
                      {nextLevel && (
                        <p className="text-[11px] text-neutral-400 mt-1.5 truncate">Prochain : <span className="font-semibold text-neutral-600">{nextLevel.name}</span></p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className={`text-xl font-bold ${levelStyle.text}`}>{points}</p>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">pts</p>
                      </div>
                      <ChevronRight size={16} className="text-neutral-300" />
                    </div>
                  </Link>
                </section>
              );
            })()}

            {/* Opt-in push contextualisé — ne s'affiche que dans un binaire
                natif avec le plugin, permission encore à 'prompt' et carte
                non écartée. Invisible sur le web (rend null : aucune marge
                fantôme, d'où les classes portées par la carte elle-même). */}
            <PushOptInCard className="mt-6 mx-4" />

            {/* ══════════════════════════════════════
                PARAMÈTRES
            ══════════════════════════════════════ */}
            <section className="mt-6 px-4">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Paramètres</p>
              <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50 overflow-hidden">
                {/* Pas de badge non-lu ici : cette entrée mène aux PARAMÈTRES
                    de notifications — le compteur vit sur la cloche du header
                    qui ouvre le vrai centre /app/notifications. */}
                <Link href="/app/notifications/preferences" className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Bell size={17} className="text-neutral-400" />
                    <span className="font-medium text-[14px] text-neutral-900">Notifications</span>
                  </div>
                  <ChevronRight size={15} className="text-neutral-300" />
                </Link>
                <Link href="/confidentialite" className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield size={17} className="text-neutral-400" />
                    <span className="font-medium text-[14px] text-neutral-900">Confidentialité</span>
                  </div>
                  <ChevronRight size={15} className="text-neutral-300" />
                </Link>
                <Link href="/cgu" className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText size={17} className="text-neutral-400" />
                    <span className="font-medium text-[14px] text-neutral-900">Conditions d&apos;utilisation</span>
                  </div>
                  <ChevronRight size={15} className="text-neutral-300" />
                </Link>
                <Link href="/mentions-legales" className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Scale size={17} className="text-neutral-400" />
                    <span className="font-medium text-[14px] text-neutral-900">Mentions légales</span>
                  </div>
                  <ChevronRight size={15} className="text-neutral-300" />
                </Link>
              </div>
            </section>

            {/* ══════════════════════════════════════
                SÉCURITÉ & MODÉRATION  (App Store 1.2)
                Le blocage et les règles doivent se trouver depuis les
                réglages du compte, pas seulement depuis un menu "…" posé sur
                un contenu : un examinateur cherche "comptes bloqués" ICI.
            ══════════════════════════════════════ */}
            <section className="mt-4 px-4">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Sécurité</p>
              <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50 overflow-hidden">
                <BlockedAccountsRow />
                <Link href="/app/regles-communaute" className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <ScrollText size={17} className="text-neutral-400" />
                    <div>
                      <p className="font-medium text-[14px] text-neutral-900">Règles de communauté</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">Ce qui est autorisé, comment signaler un contenu</p>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-neutral-300" />
                </Link>
              </div>
            </section>

            {/* ══════════════════════════════════════
                AIDE & SUPPORT
            ══════════════════════════════════════ */}
            <section className="mt-4 px-4">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Aide</p>
              <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50 overflow-hidden">
                <Link href="/app/aide" className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <HelpCircle size={17} className="text-neutral-400" />
                    <div>
                      <p className="font-medium text-[14px] text-neutral-900">Aide & Support</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">FAQ, contact, signaler un problème</p>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-neutral-300" />
                </Link>
                {user.role === 'client' && (
                  <Link
                    href="/pro/inscription"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Scissors size={17} className="text-neutral-400" />
                      <div>
                        <p className="font-medium text-[14px] text-neutral-900">Devenir coiffeur sur CHAIR</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">Sur l&apos;app CHAIR PRO, séparée</p>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-neutral-300" />
                  </Link>
                )}
              </div>
            </section>

            {/* ══════════════════════════════════════
                DÉCONNEXION + SUPPRIMER COMPTE
            ══════════════════════════════════════ */}
            <div className="mt-4 px-4 space-y-2">
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full px-5 py-4 rounded-2xl border border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 active:bg-neutral-50 transition-colors bg-white"
              >
                <LogOut size={17} />
                <span className="font-medium text-[14px]">Se déconnecter</span>
              </button>

              <Link
                href="/app/compte/supprimer"
                className="flex items-center gap-3 w-full px-5 py-4 rounded-2xl border border-red-100 text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors bg-white"
              >
                <Trash2 size={17} />
                <span className="font-medium text-[14px]">Supprimer mon compte</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// ── Comptes bloqués ──────────────────────────────────────────────────

/**
 * Entrée "Comptes bloqués" des réglages — App Store Review Guideline 1.2 :
 * bloquer doit être réversible sans avoir à retrouver la fiche de la personne.
 * La liste elle-même est le composant partagé BlockedAccountsList (déjà utilisé
 * sur /app/regles-communaute) : une seule implémentation du déblocage.
 *
 * Repliée par défaut — BlockedAccountsList appelle GET /my-blocks à son
 * montage, on ne le monte donc qu'à l'ouverture pour ne pas alourdir chaque
 * visite de la page Compte.
 */
function BlockedAccountsRow() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full min-h-[44px] flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ShieldOff size={17} className="text-neutral-400" />
          <div>
            <p className="font-medium text-[14px] text-neutral-900">Comptes bloqués</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Voir et débloquer les comptes que tu as bloqués</p>
          </div>
        </div>
        <ChevronDown
          size={15}
          className={`text-neutral-300 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 -mt-1">
          <BlockedAccountsList />
        </div>
      )}
    </div>
  );
}

// ── Carte réservation client ─────────────────────────────────────────

function ClientAppointmentCard({
  appt,
  onUpdated,
}: {
  appt: ApiAppointment;
  onUpdated: (updated: ApiAppointment) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
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

  const cancellable = canClientCancel(appt);
  const referenceImage = appt.reference_post ? getAfterImage(appt.reference_post) : null;
  const referenceAuthor = appt.reference_post?.hairdresser?.user?.name ?? null;

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
          {/* Prix nu = ambigu : rien n'est prélevé par CHAIR, le montant est celui
              que le coiffeur encaissera au salon. Le suffixe le dit. */}
          {appt.price && (
            <span className="text-xs text-neutral-500">
              <span className="font-semibold text-neutral-900">{parseFloat(appt.price).toFixed(0)} €</span> sur place
            </span>
          )}
        </div>
        {/* La réalisation jointe à la demande. Elle a autant sa place ici que
            l'heure : c'est ce que le client a demandé, et c'est à cette photo
            qu'il comparera le résultat en sortant du salon. */}
        {referenceImage && (
          <div className="mt-3 flex items-center gap-2.5">
            {/* Miniature distante non déclarée dans next.config. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={referenceImage}
              alt=""
              className="w-11 h-14 rounded-lg object-cover border border-neutral-200 shrink-0"
            />
            <p className="text-[11px] text-neutral-500 leading-snug">
              Vous avez montré cette réalisation
              {referenceAuthor ? ` — de ${referenceAuthor}` : ''}
            </p>
          </div>
        )}
        {(hairdresserSlug || cancellable) && (
          <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2">
            {hairdresserSlug && (
              <Link
                href={`/app/coiffeur/${hairdresserSlug}`}
                className="min-h-[44px] text-xs font-medium text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
              >
                Voir le profil du coiffeur <ChevronRight size={12} />
              </Link>
            )}
            {/* Le rendez-vous dans l'agenda du téléphone.
                Il n'existait aucun moyen de l'y mettre : on réservait, on
                recevait une confirmation, et on devait noter la date soi-même.
                Le fichier .ics est confié à l'application d'agenda du système
                — CHAIR ne demande aucune permission et ne synchronise rien.
                Le rappel de la veille est inclus dans le fichier. */}
            {appt.calendar_url && (
              <a
                href={appt.calendar_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[44px] rounded-xl border border-neutral-200 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors flex items-center justify-center gap-2"
              >
                <CalendarPlus size={14} />
                Ajouter à mon agenda
              </a>
            )}
            {cancellable && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="w-full min-h-[44px] rounded-xl border border-neutral-200 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors flex items-center justify-center gap-2"
              >
                <CalendarX size={14} />
                Annuler ce rendez-vous
              </button>
            )}
          </div>
        )}
      </div>

      {confirmOpen && (
        <CancelAppointmentSheet
          appt={appt}
          hairdresserName={hairdresserName}
          dateLabel={dateLabel}
          startTime={startTime}
          onClose={() => setConfirmOpen(false)}
          onUpdated={onUpdated}
        />
      )}
    </div>
  );
}

// ── Annulation d'une réservation par le client ───────────────────────

/**
 * Confirmation d'annulation. Réutilise la coquille BottomSheet commune
 * (verrouillage du scroll, glisser-fermer) plutôt que d'en réécrire une.
 *
 * La conséquence est énoncée AVANT la confirmation : l'annulation est
 * définitive côté CHAIR (on ne remet pas le créneau de côté), le créneau
 * repart en ligne, et le coiffeur est prévenu. Rien de plus n'est promis :
 * aucune politique de préavis ni de pénalité n'existe côté serveur.
 */
function CancelAppointmentSheet({
  appt,
  hairdresserName,
  dateLabel,
  startTime,
  onClose,
  onUpdated,
}: {
  appt: ApiAppointment;
  hairdresserName: string;
  dateLabel: string | null;
  startTime: string | undefined;
  onClose: () => void;
  onUpdated: (updated: ApiAppointment) => void;
}) {
  const [working, setWorking] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function confirm() {
    if (working || done) return; // anti double-tap
    setWorking(true);
    setError(null);
    try {
      const updated = await appointmentsApi.cancelMine(appt.id);
      void hapticWarning(); // fire-and-forget : no-op sur web et binaires sans le plugin
      onUpdated(updated);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'annulation n'a pas abouti. Réessaie dans un instant.");
    } finally {
      setWorking(false);
    }
  }

  // Portalé dans body pour passer au-dessus de la bottom nav — même raison
  // que BlockConfirmSheet. La feuille n'existe qu'après un tap, donc jamais
  // pendant le rendu serveur : ce garde suffit, pas besoin d'état de montage.
  if (typeof document === 'undefined') return null;

  const when = [dateLabel, startTime ? `à ${startTime}` : null].filter(Boolean).join(' ');

  return createPortal(
    <BottomSheet onClose={onClose} maxHeight="max-h-[80vh]" zIndexClassName="z-[120]">
      <div className="px-5 pb-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100">
          <p className="text-[16px] font-bold text-neutral-900">
            {done ? 'Rendez-vous annulé' : 'Annuler ce rendez-vous ?'}
          </p>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="pt-8 pb-2 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mx-auto mb-4">
              <CalendarX size={20} className="stroke-white" />
            </div>
            <p className="text-[14px] text-neutral-800 font-semibold">
              Ton rendez-vous avec {hairdresserName} est annulé.
            </p>
            <p className="text-[12px] text-neutral-500 mt-2">
              {hairdresserName} vient d&apos;être prévenu. Tu peux reprendre un créneau
              quand tu veux depuis sa fiche.
            </p>
            <button
              onClick={onClose}
              className="w-full mt-6 min-h-[48px] rounded-2xl bg-neutral-900 text-white text-[14px] font-semibold hover:bg-neutral-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="pt-5">
            <div className="bg-neutral-50 rounded-2xl px-4 py-3.5">
              <p className="text-[13px] font-semibold text-neutral-900">{appt.service}</p>
              <p className="text-[13px] text-neutral-600 mt-0.5">
                Avec {hairdresserName}
                {when ? <span className="capitalize"> · {when}</span> : null}
              </p>
            </div>

            <div className="mt-4 text-[13px] text-neutral-600 leading-relaxed space-y-2">
              <p>Si tu annules :</p>
              <ul className="space-y-1.5">
                <li className="flex gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-neutral-300 flex-shrink-0" />
                  <span>le créneau repart en ligne et peut être pris par quelqu&apos;un d&apos;autre&nbsp;;</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-neutral-300 flex-shrink-0" />
                  <span>{hairdresserName} est prévenu immédiatement&nbsp;;</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-neutral-300 flex-shrink-0" />
                  <span>l&apos;annulation est définitive&nbsp;: pour revenir, il faudra reprendre un créneau.</span>
                </li>
              </ul>
            </div>

            {error && (
              <p className="mt-4 text-[13px] text-red-600 bg-red-50 rounded-xl px-3 py-2.5">{error}</p>
            )}

            <button
              onClick={confirm}
              disabled={working}
              className="w-full mt-5 min-h-[48px] rounded-2xl bg-neutral-900 text-white text-[14px] font-semibold hover:bg-neutral-700 transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {working ? <Loader2 size={16} className="animate-spin" /> : null}
              {working ? 'Un instant…' : 'Annuler le rendez-vous'}
            </button>
            <button
              onClick={onClose}
              disabled={working}
              className="w-full mt-2.5 min-h-[48px] rounded-2xl bg-neutral-100 text-neutral-700 text-[14px] font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-40"
            >
              Garder mon rendez-vous
            </button>
          </div>
        )}
      </div>
    </BottomSheet>,
    document.body
  );
}
