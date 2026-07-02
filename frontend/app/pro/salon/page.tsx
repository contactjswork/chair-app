'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import { salons } from '@/lib/api';
import { resolveMediaUrl, type ApiSalonFull, type ApiSalonJoinRequest } from '@/lib/types';
import DashboardNav from '@/components/layout/DashboardNav';
import SalonOwnerNav from '@/components/layout/SalonOwnerNav';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import {
  Building2, Users, Check, X, MapPin, ExternalLink, Edit2,
  CheckCircle, AlertCircle, UserMinus, LogOut,
} from 'lucide-react';

// ── Formulaire de création de salon ──────────────────────────────────────────

function CreateSalonForm({ onCreated }: { onCreated: (salon: ApiSalonFull) => void }) {
  const [salonName, setSalonName] = useState('');
  const [city, setCity]           = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const inputCls = 'w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!salonName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const salon = await salons.createMySalon({ name: salonName.trim(), city: city.trim() || undefined });
      onCreated(salon);
    } catch {
      setError('Impossible de créer le salon. Réessayez.');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
          <Building2 size={28} className="text-neutral-400" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900">Créez la page de votre salon</h2>
        <p className="text-sm text-neutral-500 mt-1">Visible publiquement sur CHAIR</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-3">
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
        )}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Nom du salon</label>
          <input type="text" value={salonName} onChange={(e) => setSalonName(e.target.value)}
            placeholder="Koehler Coiffeur" required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
            Ville <span className="font-normal text-neutral-400">(optionnelle)</span>
          </label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
            placeholder="Strasbourg" className={inputCls} />
        </div>
        <button type="submit" disabled={saving || !salonName.trim()}
          className="w-full bg-neutral-900 text-white font-semibold py-3 rounded-xl hover:bg-neutral-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Création...' : 'Créer mon salon'}
        </button>
      </form>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function DashboardSalonPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser', 'salon_owner']);
  const { logout } = useAuth();

  const [salonData, setSalonData] = useState<{ salon: ApiSalonFull; pending_requests: ApiSalonJoinRequest[] } | null>(null);
  const [loading, setLoading]     = useState(true);
  const [noSalon, setNoSalon]     = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [editing, setEditing]   = useState(false);
  const [editData, setEditData] = useState<Partial<ApiSalonFull>>({});
  const [saving, setSaving]     = useState(false);

  const isSalonOwner = user?.role === 'salon_owner';

  useEffect(() => {
    if (!user) return;
    salons.mySalon()
      .then((data) => {
        setSalonData(data);
        setNoSalon(false);
      })
      .catch(() => setNoSalon(true))
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

  function toast(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  }

  async function handleAccept(requestId: number) {
    try {
      await salons.acceptRequest(requestId);
      toast('Coiffeur ajouté à l\'équipe.');
      const fresh = await salons.mySalon();
      setSalonData(fresh);
    } catch {
      toast('Erreur lors de l\'acceptation.');
    }
  }

  async function handleDecline(requestId: number) {
    try {
      await salons.declineRequest(requestId);
      toast('Demande refusée.');
      setSalonData((prev) => prev ? {
        ...prev,
        pending_requests: prev.pending_requests.filter((r) => r.id !== requestId),
      } : prev);
    } catch {
      toast('Erreur lors du refus.');
    }
  }

  async function handleRemoveHairdresser(profileId: number, name: string) {
    if (!confirm(`Retirer ${name} de l'équipe ?`)) return;
    try {
      await salons.removeHairdresser(profileId);
      toast(`${name} a été retiré de l'équipe.`);
      const fresh = await salons.mySalon();
      setSalonData(fresh);
    } catch {
      toast('Erreur lors du retrait.');
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await salons.updateMySalon(editData);
      const fresh = await salons.mySalon();
      setSalonData(fresh);
      setEditing(false);
      toast('Salon mis à jour.');
    } catch {
      toast('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  }

  const mainCls = isSalonOwner
    ? 'flex-1 px-4 py-6 pb-28 max-w-3xl'
    : 'flex-1 md:ml-60 px-4 py-6 pb-24 md:pb-6 max-w-3xl';

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Gérant sans salon → formulaire de création
  if (noSalon && isSalonOwner) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        {isSalonOwner ? <SalonOwnerNav /> : <DashboardNav />}
        <div className={mainCls}>
          <DashboardPageHeader title="Mon salon" />
          <CreateSalonForm onCreated={(salon) => {
            setSalonData({ salon, pending_requests: [] });
            setNoSalon(false);
          }} />
        </div>
      </div>
    );
  }

  // Coiffeur non-owner sans salon
  if (noSalon || !salonData) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        {isSalonOwner ? <SalonOwnerNav /> : <DashboardNav />}
        <div className={mainCls}>
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

  const verificationBadge = () => {
    if (salon.is_verified) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-lg">
          <CheckCircle size={10} />Vérifié
        </span>
      );
    }
    const vs = salon.verification_status;
    if (vs === 'pending_review') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
          <AlertCircle size={10} />Vérification en cours
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-1 rounded-lg">
        <AlertCircle size={10} />Non vérifié
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {isSalonOwner ? <SalonOwnerNav /> : <DashboardNav />}
      <main className={mainCls}>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-neutral-900">{salon.name}</h1>
                  {verificationBadge()}
                </div>
                {salon.city && (
                  <div className="flex items-center gap-1 mt-0.5 text-sm text-neutral-500">
                    <MapPin size={12} />
                    {salon.city}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`/salon/${salon.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 border border-neutral-200 px-3 py-1.5 rounded-xl hover:bg-neutral-50 transition-colors"
                >
                  <ExternalLink size={12} />
                  Voir
                </a>
                {isSalonOwner && (
                  <button
                    onClick={() => setEditing((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white px-3 py-1.5 rounded-xl hover:bg-neutral-700 transition-colors"
                  >
                    <Edit2 size={12} />
                    Modifier
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire édition */}
        {editing && isSalonOwner && (
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
              <button onClick={() => setEditing(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 text-sm font-semibold bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {/* Demandes en attente */}
        {isSalonOwner && pending_requests.length > 0 && (
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
        <div className="bg-white rounded-2xl border border-neutral-100 p-4 mb-4">
          <h2 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
            <Users size={15} className="text-neutral-400" />
            L'équipe ({salon.hairdressers?.length ?? 0} coiffeur{(salon.hairdressers?.length ?? 0) > 1 ? 's' : ''})
          </h2>
          {(salon.hairdressers?.length ?? 0) === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-6">
              Aucun coiffeur dans l'équipe. Les coiffeurs peuvent demander à rejoindre votre salon.
            </p>
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
                      <p className="text-xs text-neutral-400">{h.reviews_count} avis · {parseFloat(h.avg_rating ?? '0').toFixed(1)}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <Link href={`/app/coiffeur/${h.slug}`} target="_blank"
                        className="text-neutral-400 hover:text-neutral-700">
                        <ExternalLink size={13} />
                      </Link>
                      {isSalonOwner && (
                        <button
                          onClick={() => handleRemoveHairdresser(h.id, h.user?.name ?? 'ce coiffeur')}
                          className="text-neutral-400 hover:text-red-500 transition-colors"
                          title="Retirer de l'équipe"
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Déconnexion (salon_owner) */}
        {isSalonOwner && (
          <div className="bg-white rounded-2xl border border-neutral-100 p-4">
            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <LogOut size={15} />
              Se déconnecter
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
