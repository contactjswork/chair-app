'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { appointments } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/types';
import type { ApiHairdresserProfile } from '@/lib/types';
import { ChevronLeft, CheckCircle2, Calendar, Clock } from 'lucide-react';

const API = 'http://localhost:8000/api';

const SLOTS = ['Matin', 'Après-midi', 'Soir'] as const;
type Slot = typeof SLOTS[number];

// Date minimum = demain
function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export default function ReserverPage() {
  const params = useParams<{ slug: string }>();
  const slug   = params.slug;
  const router = useRouter();
  const { user } = useAuth();

  const [hairdresser, setHairdresser] = useState<ApiHairdresserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [clientName,  setClientName]  = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [service,     setService]     = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [desiredSlot, setDesiredSlot] = useState<Slot>('Matin');
  const [message,     setMessage]     = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState('');

  // Pré-remplir avec les infos de l'utilisateur connecté
  useEffect(() => {
    if (user) {
      setClientName(user.name || '');
      setClientEmail(user.email || '');
    }
  }, [user]);

  // Charger le profil du coiffeur
  useEffect(() => {
    fetch(`${API}/hairdressers/${slug}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setHairdresser)
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hairdresser) return;
    setError('');
    setIsLoading(true);
    try {
      await appointments.create({
        hairdresser_id: hairdresser.id,
        client_name:    clientName,
        client_email:   clientEmail,
        client_phone:   clientPhone || undefined,
        service,
        desired_date:   desiredDate,
        desired_slot:   desiredSlot,
        message:        message || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  }

  const avatarUrl = resolveMediaUrl(hairdresser?.user.avatar ?? null);

  if (success) {
    return (
      <AppShell>
        <div className="max-w-sm mx-auto px-4 py-16 text-center">
          <CheckCircle2 size={48} className="text-neutral-900 mx-auto mb-5" strokeWidth={1.5} />
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Demande envoyée</h1>
          <p className="text-sm text-neutral-500 leading-relaxed mb-8">
            {hairdresser?.user.name} a reçu votre demande de rendez-vous. Vous serez
            contacté(e) dès qu'elle sera confirmée.
          </p>
          <Link
            href={`/coiffeur/${slug}`}
            className="inline-flex items-center gap-2 bg-neutral-900 text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-neutral-700 transition-colors"
          >
            Retour au profil
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto pb-16">

        {/* Header */}
        <div className="px-4 py-4 flex items-center gap-3 border-b border-neutral-100">
          <Link href={`/coiffeur/${slug}`} className="text-neutral-500 hover:text-neutral-900 transition-colors">
            <ChevronLeft size={22} />
          </Link>
          {loadingProfile ? (
            <div className="h-5 w-40 bg-neutral-100 rounded animate-pulse" />
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={hairdresser?.user.name ?? ''} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs font-bold text-neutral-500">
                      {hairdresser?.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 leading-tight">{hairdresser?.user.name}</p>
                {hairdresser?.city && <p className="text-xs text-neutral-400">{hairdresser.city}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pt-6">
          <h1 className="text-xl font-bold text-neutral-900 mb-1">Demander un rendez-vous</h1>
          <p className="text-sm text-neutral-500 mb-6">
            Le coiffeur vous confirmera la disponibilité sous 24–48h.
          </p>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Coordonnées */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Vos coordonnées</p>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Nom complet</label>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} required
                  placeholder="Sophie Martin"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Email</label>
                <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required
                  placeholder="votre@email.fr"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Téléphone <span className="font-normal text-neutral-400">(optionnel)</span>
                </label>
                <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="06 00 00 00 00"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all" />
              </div>
            </div>

            {/* Prestation */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">La prestation</p>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Service souhaité</label>
                <input type="text" value={service} onChange={(e) => setService(e.target.value)} required
                  placeholder="Balayage, coupe femme, coloration..."
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all" />
              </div>
              {/* Spécialités du coiffeur comme suggestions */}
              {hairdresser && hairdresser.specialties.length > 0 && !service && (
                <div className="flex flex-wrap gap-1.5">
                  {hairdresser.specialties.map((s) => (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => setService(s.name)}
                      className="text-xs text-neutral-600 bg-neutral-50 border border-neutral-200 px-2.5 py-1 rounded-full hover:border-neutral-400 hover:text-neutral-900 transition-all"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date & créneau */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
                Date souhaitée
              </p>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5 flex items-center gap-1">
                  <Calendar size={13} />
                  Date
                </label>
                <input type="date" value={desiredDate} onChange={(e) => setDesiredDate(e.target.value)}
                  min={tomorrow()} required
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5 flex items-center gap-1">
                  <Clock size={13} />
                  Créneau préféré
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setDesiredSlot(slot)}
                      className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        desiredSlot === slot
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Message optionnel */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Message <span className="font-normal text-neutral-400">(optionnel)</span>
              </label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                placeholder="Précisez vos attentes, photos de référence, etc."
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all resize-none" />
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full bg-neutral-900 text-white font-semibold py-3.5 rounded-xl text-sm hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Envoi en cours...' : 'Envoyer la demande'}
            </button>

            <p className="text-[11px] text-neutral-400 text-center">
              Cette demande n'est pas une confirmation. Le coiffeur vous répondra sous 24–48h.
            </p>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
