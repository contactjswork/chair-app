'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { salons } from '@/lib/api';
import { resolveMediaUrl, type ApiSalonFull, type ApiSalonJoinRequest } from '@/lib/types';
import DashboardNav from '@/components/layout/DashboardNav';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { Building2, Users, Check, X, MapPin, ExternalLink, Edit2 } from 'lucide-react';

export default function DashboardSalonPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);

  const [salonData, setSalonData] = useState<{ salon: ApiSalonFull; pending_requests: ApiSalonJoinRequest[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ApiSalonFull>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    salons.mySalon()
      .then((data) => setSalonData(data))
      .catch(() => setError('Vous n\'êtes pas gestionnaire d\'un salon.'))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (salonData?.salon) {
      setEditData({
        name:          salonData.salon.name,
        description:   salonData.salon.description ?? '',
        address:       salonData.salon.address ?? '',
        city:          salonData.salon.city ?? '',
        postal_code:   salonData.salon.postal_code ?? '',
        phone:         salonData.salon.phone ?? '',
        website:       salonData.salon.website ?? '',
        instagram_url: salonData.salon.instagram_url ?? '',
      });
    }
  }, [salonData]);

  async function handleAccept(requestId: number) {
    try {
      await salons.acceptRequest(requestId);
      setActionMsg('Coiffeur ajouté à l\'équipe.');
      setSalonData((prev) => prev ? {
        ...prev,
        pending_requests: prev.pending_requests.filter((r) => r.id !== requestId),
      } : prev);
      // Rafraîchir la liste des coiffeurs
      const fresh = await salons.mySalon();
      setSalonData(fresh);
    } catch {
      setActionMsg('Erreur lors de l\'acceptation.');
    }
    setTimeout(() => setActionMsg(null), 3000);
  }

  async function handleDecline(requestId: number) {
    try {
      await salons.declineRequest(requestId);
      setActionMsg('Demande refusée.');
      setSalonData((prev) => prev ? {
        ...prev,
        pending_requests: prev.pending_requests.filter((r) => r.id !== requestId),
      } : prev);
    } catch {
      setActionMsg('Erreur lors du refus.');
    }
    setTimeout(() => setActionMsg(null), 3000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await salons.updateMySalon(editData);
      const fresh = await salons.mySalon();
      setSalonData(fresh);
      setEditing(false);
      setActionMsg('Salon mis à jour.');
    } catch {
      setActionMsg('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
      setTimeout(() => setActionMsg(null), 3000);
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-sm text-neutral-400">Chargement...</div>
      </div>
    );
  }

  if (error || !salonData) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <DashboardNav />
        <div className="flex-1 md:ml-60 px-4 py-8 pb-24">
          <DashboardPageHeader title="Mon salon" />
          <div className="max-w-lg mx-auto text-center py-16">
            <Building2 size={40} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-sm text-neutral-500 mb-2">Vous n'êtes pas gestionnaire d'un salon.</p>
            <p className="text-xs text-neutral-400">Seul le propriétaire du salon peut accéder à cette page.</p>
          </div>
        </div>
      </div>
    );
  }

  const { salon, pending_requests } = salonData;
  const coverUrl = resolveMediaUrl(salon.cover_image);

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <DashboardNav />
      <main className="flex-1 md:ml-60 px-4 py-6 pb-24 md:pb-6 max-w-3xl">
        <DashboardPageHeader title="Mon salon" />

        {/* Toast */}
        {actionMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">
            {actionMsg}
          </div>
        )}

        {/* Header salon */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden mb-4">
          <div className="relative h-28 bg-neutral-200">
            {coverUrl && <Image src={coverUrl} alt={salon.name} fill className="object-cover" sizes="600px" />}
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-neutral-900">{salon.name}</h1>
                {salon.city && (
                  <div className="flex items-center gap-1 mt-0.5 text-sm text-neutral-500">
                    <MapPin size={12} />
                    {salon.city}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/salon/${salon.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 border border-neutral-200 px-3 py-1.5 rounded-xl hover:bg-neutral-50 transition-colors"
                >
                  <ExternalLink size={12} />
                  Page publique
                </a>
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white px-3 py-1.5 rounded-xl hover:bg-neutral-700 transition-colors"
                >
                  <Edit2 size={12} />
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire édition */}
        {editing && (
          <div className="bg-white rounded-2xl border border-neutral-100 p-4 mb-4 space-y-3">
            <h2 className="text-sm font-bold text-neutral-900 mb-3">Modifier les informations</h2>
            {[
              { key: 'description', label: 'Description', type: 'textarea' },
              { key: 'address',     label: 'Adresse',     type: 'text' },
              { key: 'city',        label: 'Ville',       type: 'text' },
              { key: 'phone',       label: 'Téléphone',   type: 'text' },
              { key: 'website',     label: 'Site web',    type: 'url' },
              { key: 'instagram_url', label: 'Instagram', type: 'url' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">{label}</label>
                {type === 'textarea' ? (
                  <textarea
                    value={(editData as Record<string,string>)[key] ?? ''}
                    onChange={(e) => setEditData((p) => ({ ...p, [key]: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 resize-none"
                  />
                ) : (
                  <input
                    type={type}
                    value={(editData as Record<string,string>)[key] ?? ''}
                    onChange={(e) => setEditData((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400"
                  />
                )}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-semibold bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {/* Demandes en attente */}
        {pending_requests.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-100 p-4 mb-4">
            <h2 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
              Demandes en attente
              <span className="bg-neutral-900 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {pending_requests.length}
              </span>
            </h2>
            <div className="space-y-3">
              {pending_requests.map((req) => {
                const avatarUrl = resolveMediaUrl(req.hairdresser?.user?.avatar ?? null);
                return (
                  <div key={req.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt="" width={40} height={40} className="object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-neutral-400">
                          {req.hairdresser?.user?.name?.[0] ?? '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        {req.hairdresser?.user?.name ?? 'Coiffeur'}
                      </p>
                      {req.message && (
                        <p className="text-xs text-neutral-500 truncate mt-0.5">"{req.message}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAccept(req.id)}
                        className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"
                      >
                        <Check size={14} className="text-white" />
                      </button>
                      <button
                        onClick={() => handleDecline(req.id)}
                        className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <X size={14} className="text-neutral-600" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Équipe actuelle */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-4">
          <h2 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
            <Users size={15} className="text-neutral-400" />
            L'équipe ({salon.hairdressers?.length ?? 0} coiffeur{(salon.hairdressers?.length ?? 0) > 1 ? 's' : ''})
          </h2>
          {(salon.hairdressers?.length ?? 0) === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-6">Aucun coiffeur dans l'équipe.</p>
          ) : (
            <div className="space-y-2">
              {salon.hairdressers?.map((h) => {
                const avatarUrl = resolveMediaUrl(h.user?.avatar ?? null);
                return (
                  <div key={h.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl group hover:bg-neutral-100 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt="" width={36} height={36} className="object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-neutral-400">{h.user?.name?.[0] ?? '?'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{h.user?.name}</p>
                      <p className="text-xs text-neutral-400">{h.reviews_count} avis · {h.avg_rating} étoiles</p>
                    </div>
                    <Link
                      href={`/coiffeur/${h.slug}`}
                      target="_blank"
                      className="text-xs text-neutral-400 hover:text-neutral-700 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
