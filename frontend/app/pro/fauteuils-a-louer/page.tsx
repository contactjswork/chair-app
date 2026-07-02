'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import DashboardNav from '@/components/layout/DashboardNav';
import {
  Armchair, MapPin, Calendar, Euro, Package, AlertCircle,
  ChevronLeft, Send, Check, Search, X, Camera, Star,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:8000';

const DAY_LABELS: Record<number, string> = {
  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi', 7: 'Dimanche',
};

interface ChairRental {
  id: number;
  title: string;
  description?: string;
  price_per_day?: number;
  price_per_week?: number;
  price_per_month?: number;
  available_days?: number[];
  equipment?: string;
  conditions?: string;
  photos?: string[];
  status: 'available' | 'rented' | 'disabled';
  salon?: {
    id: number;
    name: string;
    city?: string;
    slug?: string;
    logo?: string;
    rating?: number;
  };
}

interface MyRequest {
  chair_rental_id: number;
  status: 'pending' | 'accepted' | 'declined';
}

export default function FauteuilsALouerPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const [rentals,    setRentals]    = useState<ChairRental[]>([]);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [detail,     setDetail]     = useState<ChairRental | null>(null);
  const [photoIdx,   setPhotoIdx]   = useState(0);
  const [message,    setMessage]    = useState('');
  const [sending,    setSending]    = useState(false);
  const [toast,      setToast]      = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      api.get<ChairRental[]>('/chair-rentals'),
      api.get<MyRequest[]>('/my-chair-requests'),
    ]).then(([r, rr]) => {
      if (r.status  === 'fulfilled' && Array.isArray(r.value))  setRentals(r.value);
      if (rr.status === 'fulfilled' && Array.isArray(rr.value)) setMyRequests(rr.value);
    }).finally(() => setLoading(false));
  }, [user]);

  const filtered = rentals.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.salon?.name ?? '').toLowerCase().includes(q) ||
      (r.salon?.city ?? '').toLowerCase().includes(q)
    );
  });

  const getMyRequest = (id: number) => myRequests.find((r) => r.chair_rental_id === id);

  async function handleSendRequest() {
    if (!detail) return;
    setSending(true);
    try {
      const req = await api.post<MyRequest>(`/chair-rentals/${detail.id}/request`, { message: message.trim() || null });
      setMyRequests((prev) => [...prev.filter((r) => r.chair_rental_id !== detail.id), req]);
      showToast('Demande envoyée au salon !');
      setMessage('');
    } catch {
      showToast('Erreur lors de l\'envoi.');
    } finally {
      setSending(false);
    }
  }

  function openDetail(r: ChairRental) {
    setDetail(r);
    setPhotoIdx(0);
    setMessage('');
  }

  if (isLoading || loading) {
    return <div className="min-h-screen bg-neutral-50 flex items-center justify-center"><div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" /></div>;
  }

  // ── VUE DÉTAIL ───────────────────────────────────────────────────────────
  if (detail) {
    const photos    = detail.photos ?? [];
    const myReq     = getMyRequest(detail.id);
    const hasPhotos = photos.length > 0;

    return (
      <div className="min-h-screen bg-neutral-50 pb-24">
        <DashboardNav />
        {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">{toast}</div>}

        <div className="md:ml-60">
          {/* Galerie photos */}
          {hasPhotos ? (
            <div className="relative bg-neutral-900 aspect-[4/3] max-h-80 overflow-hidden">
              <Image
                src={`${API_BASE}${photos[photoIdx]}`}
                alt={detail.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
              />
              <button onClick={() => setDetail(null)}
                className="absolute top-4 left-4 w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                <ChevronLeft size={18} />
              </button>
              {photos.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                  {photos.map((_, i) => (
                    <button key={i} onClick={() => setPhotoIdx(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i === photoIdx ? 'bg-white' : 'bg-white/40'}`} />
                  ))}
                </div>
              )}
              {photoIdx > 0 && (
                <button onClick={() => setPhotoIdx((p) => p - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 rounded-full flex items-center justify-center text-white">
                  <ChevronLeft size={16} />
                </button>
              )}
              {photoIdx < photos.length - 1 && (
                <button onClick={() => setPhotoIdx((p) => p + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 rounded-full flex items-center justify-center text-white rotate-180">
                  <ChevronLeft size={16} />
                </button>
              )}
            </div>
          ) : (
            <div className="relative bg-neutral-200 h-52 flex items-center justify-center">
              <Camera size={36} className="text-neutral-400" />
              <button onClick={() => setDetail(null)}
                className="absolute top-4 left-4 w-9 h-9 bg-black/20 rounded-full flex items-center justify-center hover:bg-black/30 transition-colors">
                <ChevronLeft size={18} />
              </button>
            </div>
          )}

          {/* Vignettes */}
          {photos.length > 1 && (
            <div className="flex gap-1.5 px-4 py-2 overflow-x-auto">
              {photos.map((url, i) => (
                <button key={url} onClick={() => setPhotoIdx(i)}
                  className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors ${i === photoIdx ? 'border-neutral-900' : 'border-transparent'}`}>
                  <Image src={`${API_BASE}${url}`} alt="" width={56} height={56} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}

          <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
            {/* Header */}
            <div>
              <h1 className="text-xl font-bold text-neutral-900 mb-1">{detail.title}</h1>
              {detail.salon && (
                <div className="flex items-center gap-2 flex-wrap">
                  {detail.salon.logo && (
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-neutral-100 relative">
                      <Image src={`${API_BASE}${detail.salon.logo}`} alt="" fill className="object-cover" sizes="24px" />
                    </div>
                  )}
                  <p className="text-sm font-semibold text-neutral-700">{detail.salon.name}</p>
                  {detail.salon.city && (
                    <span className="flex items-center gap-0.5 text-xs text-neutral-400">
                      <MapPin size={10} />{detail.salon.city}
                    </span>
                  )}
                  {detail.salon.rating && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                      <Star size={10} fill="currentColor" />{detail.salon.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Tarifs */}
            {(detail.price_per_day || detail.price_per_week || detail.price_per_month) && (
              <div className="bg-white rounded-2xl border border-neutral-100 p-4">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Euro size={10} />Tarifs</h3>
                <div className="flex gap-6">
                  {detail.price_per_day   && <div><p className="text-2xl font-bold text-neutral-900">{detail.price_per_day}€</p><p className="text-xs text-neutral-400">par jour</p></div>}
                  {detail.price_per_week  && <div><p className="text-2xl font-bold text-neutral-900">{detail.price_per_week}€</p><p className="text-xs text-neutral-400">par semaine</p></div>}
                  {detail.price_per_month && <div><p className="text-2xl font-bold text-neutral-900">{detail.price_per_month}€</p><p className="text-xs text-neutral-400">par mois</p></div>}
                </div>
              </div>
            )}

            {/* Description */}
            {detail.description && (
              <div className="bg-white rounded-2xl border border-neutral-100 p-4">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Description</h3>
                <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{detail.description}</p>
              </div>
            )}

            {/* Disponibilités */}
            {(detail.available_days?.length ?? 0) > 0 && (
              <div className="bg-white rounded-2xl border border-neutral-100 p-4">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Calendar size={10} />Disponibilités
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {detail.available_days!.map((d) => (
                    <span key={d} className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full font-medium">{DAY_LABELS[d]}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Équipements */}
            {detail.equipment && (
              <div className="bg-white rounded-2xl border border-neutral-100 p-4">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Package size={10} />Équipements inclus
                </h3>
                <p className="text-sm text-neutral-700">{detail.equipment}</p>
              </div>
            )}

            {/* Conditions */}
            {detail.conditions && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <AlertCircle size={10} />Conditions
                </h3>
                <p className="text-sm text-amber-800">{detail.conditions}</p>
              </div>
            )}

            {/* Bloc demande */}
            <div className="bg-white rounded-2xl border border-neutral-100 p-4">
              {myReq ? (
                <div className={`flex items-center gap-3 p-3 rounded-xl ${
                  myReq.status === 'accepted' ? 'bg-green-50' :
                  myReq.status === 'declined' ? 'bg-red-50' : 'bg-neutral-50'
                }`}>
                  <Check size={15} className={myReq.status === 'accepted' ? 'text-green-600' : myReq.status === 'declined' ? 'text-red-500' : 'text-neutral-500'} />
                  <p className={`text-sm font-semibold ${myReq.status === 'accepted' ? 'text-green-700' : myReq.status === 'declined' ? 'text-red-600' : 'text-neutral-600'}`}>
                    {myReq.status === 'accepted'  ? 'Demande acceptée — le salon va vous contacter.' :
                     myReq.status === 'declined'  ? 'Demande refusée par le salon.' :
                     'Demande envoyée — en attente de réponse.'}
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-widest mb-3">Envoyer une demande</h3>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Présentez-vous brièvement : votre expérience, vos spécialités, votre disponibilité..."
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm resize-none focus:outline-none focus:border-neutral-800 transition-colors mb-3"
                  />
                  <button
                    onClick={handleSendRequest}
                    disabled={sending}
                    className="w-full py-3 bg-neutral-900 text-white text-sm font-semibold rounded-2xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    <Send size={14} />
                    {sending ? 'Envoi...' : 'Envoyer ma demande'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── VUE LISTE ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      <DashboardNav />
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">{toast}</div>}

      <div className="md:ml-60 max-w-3xl mx-auto px-4 pt-4 pb-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-neutral-900">Fauteuils à louer</h1>
          <p className="text-xs text-neutral-400 mt-0.5">{filtered.length} annonce{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par ville, salon..."
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:border-neutral-800 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={13} />
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center">
            <Armchair size={36} className="text-neutral-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-700">Aucune annonce disponible</p>
            <p className="text-xs text-neutral-400 mt-1">Revenez plus tard ou modifiez votre recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((r) => {
              const firstPhoto = r.photos?.[0];
              const myReq      = getMyRequest(r.id);
              return (
                <button key={r.id} onClick={() => openDetail(r)}
                  className="text-left bg-white rounded-2xl border border-neutral-100 overflow-hidden hover:border-neutral-300 hover:shadow-sm transition-all">
                  <div className="relative aspect-video bg-neutral-100">
                    {firstPhoto
                      ? <Image src={`${API_BASE}${firstPhoto}`} alt={r.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 320px" />
                      : <div className="absolute inset-0 flex items-center justify-center"><Camera size={24} className="text-neutral-300" /></div>
                    }
                    {(r.photos?.length ?? 0) > 1 && (
                      <span className="absolute top-2 right-2 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded-full font-semibold">
                        {r.photos!.length} photos
                      </span>
                    )}
                    {myReq && (
                      <span className={`absolute top-2 left-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                        myReq.status === 'accepted' ? 'bg-green-500 text-white' :
                        myReq.status === 'declined' ? 'bg-red-400 text-white' :
                        'bg-amber-400 text-white'
                      }`}>
                        {myReq.status === 'accepted' ? 'Acceptée' : myReq.status === 'declined' ? 'Refusée' : 'Envoyée'}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-neutral-900 line-clamp-1 mb-1">{r.title}</p>
                    <div className="flex items-center gap-1 text-xs text-neutral-500 mb-2">
                      <MapPin size={9} />
                      <span className="truncate">{r.salon?.name ?? 'Salon'}{r.salon?.city ? ` · ${r.salon.city}` : ''}</span>
                    </div>
                    <div className="flex items-end gap-2">
                      {r.price_per_day   && <div><span className="text-base font-bold text-neutral-900">{r.price_per_day}€</span><span className="text-[10px] text-neutral-400"> /j</span></div>}
                      {r.price_per_week  && <div><span className="text-sm font-semibold text-neutral-700">{r.price_per_week}€</span><span className="text-[10px] text-neutral-400"> /sem.</span></div>}
                      {r.price_per_month && <div><span className="text-sm font-semibold text-neutral-700">{r.price_per_month}€</span><span className="text-[10px] text-neutral-400"> /mois</span></div>}
                    </div>
                    {(r.available_days?.length ?? 0) > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {r.available_days!.slice(0, 4).map((d) => (
                          <span key={d} className="text-[9px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded-full font-medium">{DAY_LABELS[d]?.slice(0, 3)}</span>
                        ))}
                        {r.available_days!.length > 4 && <span className="text-[9px] text-neutral-400">+{r.available_days!.length - 4}</span>}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
