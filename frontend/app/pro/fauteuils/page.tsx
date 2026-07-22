'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import {
  Armchair, Plus, Edit2, Trash2, Check, X, Camera, Euro,
  Calendar, MapPin, ChevronRight, Package, AlertCircle,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:8000';

const DAY_LABELS: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim',
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
  requests?: ChairRentalRequest[];
}
interface ChairRentalRequest {
  id: number;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  hairdresser?: { user?: { name?: string } };
}

type FormData = Omit<ChairRental, 'id' | 'requests' | 'photos'>;
const EMPTY: FormData = {
  title: '', description: '', price_per_day: undefined, price_per_week: undefined,
  price_per_month: undefined, available_days: [], equipment: '', conditions: '', status: 'available',
};
const inputCls = 'w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-800 transition-colors';

export default function FauteuilsPage() {
  const { user, isLoading } = useRequireAuth(['salon_owner']);
  const [rentals,   setRentals]   = useState<ChairRental[]>([]);
  const [requests,  setRequests]  = useState<ChairRentalRequest[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [view,      setView]      = useState<'list' | 'form' | 'detail'>('list');
  const [editItem,  setEditItem]  = useState<ChairRental | null>(null);
  const [detailId,  setDetailId]  = useState<number | null>(null);
  const [form,      setForm]      = useState<FormData>(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      api.get<ChairRental[]>('/my-salon/rentals'),
      api.get<ChairRentalRequest[]>('/my-salon/rental-requests'),
    ]).then(([r, rr]) => {
      if (r.status === 'fulfilled'  && Array.isArray(r.value))  setRentals(r.value);
      if (rr.status === 'fulfilled' && Array.isArray(rr.value)) setRequests(rr.value);
    }).finally(() => setLoading(false));
  }, [user]);

  function openCreate() { setEditItem(null); setForm(EMPTY); setView('form'); }
  function openEdit(r: ChairRental) {
    setEditItem(r);
    setForm({ title: r.title, description: r.description ?? '', price_per_day: r.price_per_day, price_per_week: r.price_per_week, price_per_month: r.price_per_month, available_days: r.available_days ?? [], equipment: r.equipment ?? '', conditions: r.conditions ?? '', status: r.status });
    setView('form');
  }
  function openDetail(id: number) { setDetailId(id); setView('detail'); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editItem) {
        const updated = await api.put<ChairRental>(`/my-salon/rentals/${editItem.id}`, form);
        setRentals((prev) => prev.map((r) => r.id === updated.id ? { ...updated, photos: r.photos } : r));
        showToast('Annonce mise à jour.');
      } else {
        const created = await api.post<ChairRental>('/my-salon/rentals', form);
        setRentals((prev) => [{ ...created, photos: [] }, ...prev]);
        showToast('Annonce publiée !');
        setDetailId(created.id);
        setView('detail');
        return;
      }
      setView('list');
    } catch { showToast('Erreur lors de la sauvegarde.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cette annonce ?')) return;
    try {
      await api.delete(`/my-salon/rentals/${id}`);
      setRentals((prev) => prev.filter((r) => r.id !== id));
      setView('list');
      showToast('Annonce supprimée.');
    } catch { showToast('Erreur.'); }
  }

  async function handleToggleStatus(r: ChairRental) {
    const newStatus = r.status === 'available' ? 'disabled' : 'available';
    const updated = await api.put<ChairRental>(`/my-salon/rentals/${r.id}`, { status: newStatus });
    setRentals((prev) => prev.map((x) => x.id === updated.id ? { ...x, status: updated.status } : x));
  }

  async function handleUploadPhoto(rentalId: number, file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('chair_token') : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/my-salon/rentals/${rentalId}/photos`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { photos: string[] };
      setRentals((prev) => prev.map((r) => r.id === rentalId ? { ...r, photos: data.photos } : r));
      showToast('Photo ajoutée.');
    } catch { showToast('Erreur lors du téléversement.'); }
    finally { setUploading(false); }
  }

  async function handleDeletePhoto(rentalId: number, url: string) {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('chair_token') : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/my-salon/rentals/${rentalId}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { photos: string[] };
      setRentals((prev) => prev.map((r) => r.id === rentalId ? { ...r, photos: data.photos } : r));
    } catch { showToast('Erreur.'); }
  }

  async function handleRequest(reqId: number, action: 'accept' | 'decline') {
    await api.post(`/my-salon/rental-requests/${reqId}/${action}`, {});
    setRequests((prev) => prev.filter((r) => r.id !== reqId));
    showToast(action === 'accept' ? 'Demande acceptée.' : 'Demande refusée.');
  }

  function toggleDay(day: number) {
    const days = form.available_days ?? [];
    setForm((p) => ({ ...p, available_days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort() }));
  }

  if (isLoading || loading) {
    return <div className="min-h-screen bg-neutral-50 flex items-center justify-center"><div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" /></div>;
  }

  const detailRental = rentals.find((r) => r.id === detailId);

  // ── VUE DÉTAIL / GESTION ANNONCE ─────────────────────────────────────────
  if (view === 'detail' && detailRental) {
    const photos = detailRental.photos ?? [];
    return (
      <div className="min-h-screen bg-neutral-50 flex">
        {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">{toast}</div>}
        <div className="flex-1">
        <div className="max-w-xl mx-auto px-4 pt-4 pb-6">
          <DashboardPageHeader title={detailRental.title} backHref="#" right={
            <button onClick={() => setView('list')} className="text-xs text-neutral-500 font-medium">← Retour</button>
          } />

          {/* Photos */}
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden mb-4">
            {photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-0.5 bg-neutral-100">
                {photos.map((url) => (
                  <div key={url} className="relative aspect-square group">
                    <Image src={`${API_BASE}${url}`} alt="" fill className="object-cover" sizes="150px" />
                    <button
                      onClick={() => handleDeletePhoto(detailRental.id, url)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full items-center justify-center hidden group-hover:flex hover:bg-red-600 transition-colors">
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
                {photos.length < 6 && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square flex flex-col items-center justify-center gap-1 bg-neutral-50 hover:bg-neutral-100 transition-colors">
                    <Camera size={18} className="text-neutral-400" />
                    <span className="text-[10px] text-neutral-400 font-medium">{uploading ? '...' : 'Ajouter'}</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full h-40 flex flex-col items-center justify-center gap-2 hover:bg-neutral-50 transition-colors">
                <Camera size={28} className="text-neutral-300" />
                <p className="text-sm text-neutral-400">Ajouter des photos</p>
                <p className="text-xs text-neutral-300">6 photos max · JPEG, PNG</p>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadPhoto(detailRental.id, f); e.target.value = ''; }} />
          </div>

          {/* Détails */}
          <div className="bg-white rounded-2xl border border-neutral-100 p-4 mb-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-neutral-900">{detailRental.title}</h2>
                <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${detailRental.status === 'available' ? 'bg-green-100 text-green-700' : detailRental.status === 'rented' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-500'}`}>
                  {detailRental.status === 'available' ? 'Disponible' : detailRental.status === 'rented' ? 'Loué' : 'Désactivée'}
                </span>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => openEdit(detailRental)} className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors"><Edit2 size={13} /></button>
                <button onClick={() => handleDelete(detailRental.id)} className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>

            {/* Prix */}
            {(detailRental.price_per_day || detailRental.price_per_week || detailRental.price_per_month) && (
              <div className="flex gap-4 pt-1">
                {detailRental.price_per_day   && <div className="text-center"><p className="text-lg font-bold text-neutral-900">{detailRental.price_per_day}€</p><p className="text-[10px] text-neutral-400">/ jour</p></div>}
                {detailRental.price_per_week  && <div className="text-center"><p className="text-lg font-bold text-neutral-900">{detailRental.price_per_week}€</p><p className="text-[10px] text-neutral-400">/ semaine</p></div>}
                {detailRental.price_per_month && <div className="text-center"><p className="text-lg font-bold text-neutral-900">{detailRental.price_per_month}€</p><p className="text-[10px] text-neutral-400">/ mois</p></div>}
              </div>
            )}

            {detailRental.description && <p className="text-sm text-neutral-600 leading-relaxed">{detailRental.description}</p>}

            {(detailRental.available_days?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <Calendar size={13} className="text-neutral-400 flex-shrink-0" />
                <div className="flex gap-1 flex-wrap">
                  {detailRental.available_days!.map((d) => (
                    <span key={d} className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-medium">{DAY_LABELS[d]}</span>
                  ))}
                </div>
              </div>
            )}

            {detailRental.equipment && (
              <div className="flex items-start gap-2 pt-1">
                <Package size={13} className="text-neutral-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-500">{detailRental.equipment}</p>
              </div>
            )}

            {detailRental.conditions && (
              <div className="flex items-start gap-2 pt-1">
                <AlertCircle size={13} className="text-neutral-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-500">{detailRental.conditions}</p>
              </div>
            )}

            <button onClick={() => handleToggleStatus(detailRental)}
              className="w-full mt-1 py-2 text-xs font-semibold text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors">
              {detailRental.status === 'available' ? 'Mettre en pause' : 'Remettre en ligne'}
            </button>
          </div>

          {/* Demandes reçues pour cette annonce */}
          {requests.filter((r) => (r as ChairRentalRequest & { chair_rental_id?: number }).chair_rental_id === detailRental.id || true).length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-100 p-4">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-widest mb-3">Demandes reçues</h3>
              {requests.length === 0
                ? <p className="text-xs text-neutral-400">Aucune demande pour le moment.</p>
                : requests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-neutral-500">
                      {req.hairdresser?.user?.name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">{req.hairdresser?.user?.name ?? 'Coiffeur'}</p>
                      {req.message && <p className="text-xs text-neutral-400 truncate">&quot;{req.message}&quot;</p>}
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleRequest(req.id, 'accept')} className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"><Check size={13} className="text-white" /></button>
                      <button onClick={() => handleRequest(req.id, 'decline')} className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors"><X size={13} /></button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  // ── VUE FORMULAIRE ────────────────────────────────────────────────────────
  if (view === 'form') {
    return (
      <div className="min-h-screen bg-neutral-50 flex">
        <div className="flex-1">
        <div className="max-w-xl mx-auto px-4 pt-4 pb-6">
          <DashboardPageHeader title={editItem ? 'Modifier l\'annonce' : 'Nouvelle annonce'} right={
            <button onClick={() => setView(editItem ? 'detail' : 'list')} className="text-xs text-neutral-500 font-medium">← Retour</button>
          } />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-2xl border border-neutral-100 p-4 space-y-3">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Informations</h3>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Titre de l&apos;annonce *</label>
                <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Fauteuil disponible du lundi au vendredi" required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={4} placeholder="Décrivez l'espace, l'ambiance du salon, les services possibles, la clientèle..." className={`${inputCls} resize-none`} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-100 p-4 space-y-3">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Tarifs</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'price_per_day',   label: 'Par jour (€)' },
                  { key: 'price_per_week',  label: 'Par sem. (€)' },
                  { key: 'price_per_month', label: 'Par mois (€)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-1">{label}</label>
                    <input type="number" min="0" step="0.5"
                      value={(form as Record<string, unknown>)[key] as number ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      className={inputCls} />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-100 p-4 space-y-3">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Disponibilités</h3>
              <div className="flex gap-1.5 flex-wrap">
                {[1,2,3,4,5,6,7].map((d) => {
                  const active = (form.available_days ?? []).includes(d);
                  return (
                    <button key={d} type="button" onClick={() => toggleDay(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${active ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
                      {DAY_LABELS[d]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-100 p-4 space-y-3">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Équipements & Conditions</h3>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Équipements inclus</label>
                <input type="text" value={form.equipment} onChange={(e) => setForm((p) => ({ ...p, equipment: e.target.value }))}
                  placeholder="Bac à shampoing, miroir, tablette, Wi-Fi, climatisation..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Conditions</label>
                <textarea value={form.conditions} onChange={(e) => setForm((p) => ({ ...p, conditions: e.target.value }))}
                  rows={2} placeholder="Caution requise, préavis de 15j, règlement intérieur..." className={`${inputCls} resize-none`} />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setView(editItem ? 'detail' : 'list')}
                className="flex-1 py-3 text-sm font-semibold text-neutral-600 border border-neutral-200 rounded-2xl hover:bg-neutral-50 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3 text-sm font-semibold bg-neutral-900 text-white rounded-2xl hover:bg-neutral-700 transition-colors disabled:opacity-50">
                {saving ? 'Publication...' : editItem ? 'Mettre à jour' : 'Publier l\'annonce'}
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    );
  }

  // ── VUE LISTE ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">{toast}</div>}
      <div className="flex-1">
      <div className="max-w-xl mx-auto px-4 pt-4 pb-6">
        <DashboardPageHeader title="Fauteuils" />

        {/* Demandes globales */}
        {requests.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4 flex items-center gap-3">
            <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800 font-medium flex-1">
              {requests.length} demande(s) en attente — ouvrez une annonce pour y répondre
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-neutral-400">{rentals.filter((r) => r.status === 'available').length} en ligne</p>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white px-3 py-2 rounded-xl hover:bg-neutral-700 transition-colors">
            <Plus size={13} />Nouvelle annonce
          </button>
        </div>

        {rentals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center">
            <Armchair size={36} className="text-neutral-200 mx-auto mb-4" />
            <p className="text-sm font-semibold text-neutral-700 mb-1">Aucune annonce publiée</p>
            <p className="text-xs text-neutral-400 mb-4">Créez votre première annonce pour louer un fauteuil à des coiffeurs indépendants.</p>
            <button onClick={openCreate} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white px-4 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors">
              <Plus size={13} />Créer une annonce
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rentals.map((r) => {
              const firstPhoto = r.photos?.[0];
              const reqCount = requests.filter((_rq) => true).length; // approx
              return (
                <button key={r.id} onClick={() => openDetail(r.id)}
                  className={`w-full text-left bg-white rounded-2xl border overflow-hidden hover:border-neutral-300 transition-colors flex ${r.status === 'disabled' ? 'opacity-60' : 'border-neutral-100'}`}>
                  {/* Miniature photo */}
                  <div className="w-24 h-24 bg-neutral-100 flex-shrink-0 relative">
                    {firstPhoto
                      ? <Image src={`${API_BASE}${firstPhoto}`} alt="" fill className="object-cover" sizes="96px" />
                      : <div className="absolute inset-0 flex items-center justify-center"><Camera size={20} className="text-neutral-300" /></div>
                    }
                    {(r.photos?.length ?? 0) > 1 && (
                      <span className="absolute bottom-1 right-1 text-[9px] bg-black/50 text-white px-1 rounded font-medium">+{(r.photos?.length ?? 0) - 1}</span>
                    )}
                  </div>
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-sm font-bold text-neutral-900 line-clamp-1">{r.title}</p>
                      <ChevronRight size={14} className="text-neutral-300 flex-shrink-0 mt-0.5" />
                    </div>
                    <div className="flex gap-2 text-xs text-neutral-500 mb-1.5">
                      {r.price_per_day   && <span className="flex items-center gap-0.5"><Euro size={9} />{r.price_per_day}€/j</span>}
                      {r.price_per_week  && <span>{r.price_per_week}€/sem.</span>}
                      {r.price_per_month && <span>{r.price_per_month}€/mois</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${r.status === 'available' ? 'bg-green-100 text-green-700' : r.status === 'rented' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-500'}`}>
                        {r.status === 'available' ? 'En ligne' : r.status === 'rented' ? 'Loué' : 'Pausée'}
                      </span>
                      {!firstPhoto && <span className="text-[9px] text-amber-600 font-medium flex items-center gap-0.5"><Camera size={9} />Ajouter des photos</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
