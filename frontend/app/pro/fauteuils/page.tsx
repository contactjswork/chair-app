'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { salons, chairRentals } from '@/lib/api';
import { resolveMediaUrl, type ApiSalonFull, type ApiChairRental, type ApiChairRentalRequest, type ChairRentalRequestStatus } from '@/lib/types';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import OwnerEmptyState from '@/components/owner/OwnerEmptyState';
import OwnerChairCard from '@/components/owner/OwnerChairCard';
import OwnerChairWizard from '@/components/owner/OwnerChairWizard';
import OwnerBottomSheet from '@/components/owner/OwnerBottomSheet';
import OwnerChairRequestSheet from '@/components/owner/OwnerChairRequestSheet';
import OwnerStat from '@/components/owner/OwnerStat';
import {
  Armchair, Plus, ExternalLink, Copy, EyeOff, Eye, Trash2,
  Inbox, FileEdit, Clock, Percent, TrendingUp, Share2, Check, Megaphone,
} from 'lucide-react';

/** Le lien public de l'annonce — celui qu'on colle partout (réseaux, groupes). */
function lienFauteuil(r: ApiChairRental): string {
  return `https://getchair.app/fauteuil/${r.slug}`;
}

/** Âge d'une annonce en jours — hors rendu (Date.now est impur pour React). */
function joursDepuis(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

/** Le meilleur prix à afficher sur la pub : mois > semaine > jour. */
function prixPub(r: ApiChairRental): string | null {
  if (r.price_per_month != null) return `${r.price_per_month} €/mois`;
  if (r.price_per_week != null) return `${r.price_per_week} €/semaine`;
  if (r.price_per_day != null) return `${r.price_per_day} €/jour`;
  return null;
}

/**
 * Feuille de partage d'une annonce (retour Julien 15/09/2026 : « travaille
 * bien le partage des locations, moyen de faire de la pub, même sur les
 * autres réseaux ») : partage natif + lien à copier. Pas de visuel généré —
 * second retour Julien : « les gens savent que s'ils partagent, ils peuvent
 * mettre ça en story » — le lien suffit, chacun l'habille comme il veut.
 */
function FauteuilPartageSheet({ rental, salonName, onClose }: {
  rental: ApiChairRental;
  salonName: string;
  onClose: () => void;
}) {
  const [copie, setCopie] = useState(false);
  const lien = lienFauteuil(rental);

  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch { /* clipboard indisponible : le lien reste lisible dans la feuille */ }
  }

  async function partagerLien() {
    const texte = `Fauteuil à louer chez ${salonName}${rental.city ? ` à ${rental.city}` : ''}${prixPub(rental) ? ` — ${prixPub(rental)}` : ''}. Postulez sur CHAIR :`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: texte, url: lien });
        onClose();
        return;
      } catch { /* annulé ou refusé : la feuille reste ouverte, rien de perdu */ }
    } else {
      copier();
    }
  }

  const ligneCls = 'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-neutral-50 hover:bg-neutral-100 transition-colors text-left';

  return (
    <OwnerBottomSheet open onClose={onClose} title="Faire connaître ce fauteuil" subtitle={rental.title}>
      <div className="space-y-2 pb-2">
        <button onClick={partagerLien} className={ligneCls}>
          <span className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
            <Share2 size={15} className="text-white" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13.5px] font-bold text-neutral-900">Partager le lien</span>
            <span className="block text-[11.5px] text-neutral-500">WhatsApp, SMS, réseaux — l&apos;annonce publique CHAIR.</span>
          </span>
        </button>

        <button onClick={copier} className={ligneCls}>
          <span className="w-9 h-9 rounded-xl bg-neutral-100 ring-1 ring-neutral-200 flex items-center justify-center flex-shrink-0">
            {copie ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} className="text-neutral-600" />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13.5px] font-bold text-neutral-900">{copie ? 'Lien copié !' : 'Copier le lien'}</span>
            <span className="block text-[11.5px] text-neutral-500 truncate">{lien}</span>
          </span>
        </button>

        <p className="text-[11px] text-neutral-400 leading-relaxed px-1 pt-1">
          Astuce : les groupes Facebook de coiffeurs de votre région et les
          stories locales sont les meilleurs endroits — le lien mène à
          l&apos;annonce, où un coiffeur peut postuler directement.
        </p>
      </div>
    </OwnerBottomSheet>
  );
}

type TabKey = 'listings' | 'drafts' | 'requests' | 'stats';

const REQUEST_COLUMNS: { key: ChairRentalRequestStatus; label: string }[] = [
  { key: 'pending', label: 'Nouveau' },
  { key: 'in_discussion', label: 'Discussion' },
  { key: 'accepted', label: 'Accepté' },
  { key: 'declined', label: 'Refusé' },
  { key: 'cancelled', label: 'Annulé' },
];

export default function FauteuilsPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['salon_owner']);
  // Onglet Fauteuils de CHAIR BUSINESS ou sous-page du dashboard PRO :
  // même page, deux espaces — les liens vers le monde coiffeur (/pro)
  // n'existent que dans le second.
  const estBusiness = usePathname().startsWith('/business');

  const [salon, setSalon] = useState<ApiSalonFull | null>(null);
  const [rentals, setRentals] = useState<ApiChairRental[]>([]);
  const [requests, setRequests] = useState<ApiChairRentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('listings');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<ApiChairRental | null>(null);
  const [detailRequest, setDetailRequest] = useState<ApiChairRentalRequest | null>(null);
  // Partage/pub d'une annonce : la feuille lien + partage natif.
  const [partage, setPartage] = useState<ApiChairRental | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  useEffect(() => {
    if (!user) return;
    Promise.all([salons.mySalon(), chairRentals.myRentals(), chairRentals.myRequests()])
      .then(([salonData, rentalsData, requestsData]) => {
        setSalon(salonData.salon);
        setRentals(rentalsData);
        setRequests(requestsData);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const activeListings = rentals.filter((r) => r.status !== 'draft');
  const drafts = rentals.filter((r) => r.status === 'draft');
  const pendingOrDiscussion = requests.filter((r) => r.status === 'pending' || r.status === 'in_discussion').length;

  function openCreate() { setEditingRental(null); setWizardOpen(true); }
  function openEdit(r: ApiChairRental) { setEditingRental(r); setWizardOpen(true); }

  async function handleSaved(r: ApiChairRental) {
    // Ne ferme PAS le wizard ici : il affiche son propre écran de succès
    // plein écran juste après avoir appelé onSaved, et se ferme lui-même
    // (bouton "Terminer") via onClose. Fermer depuis ici le démonterait
    // avant que l'utilisateur ne voie l'animation de publication.
    const fresh = await chairRentals.myRentals();
    setRentals(fresh);
    showToast(r.status === 'available' ? 'Annonce publiée.' : 'Brouillon enregistré.');
  }

  async function duplicateRental(r: ApiChairRental) {
    const copy = await chairRentals.create({
      space_type: r.space_type ?? undefined,
      title: `${r.title} (copie)`,
      description: r.description ?? undefined,
      address: r.address ?? undefined,
      city: r.city ?? undefined,
      access_instructions: r.access_instructions ?? undefined,
      price_per_day: r.price_per_day ?? undefined,
      price_per_week: r.price_per_week ?? undefined,
      price_per_month: r.price_per_month ?? undefined,
      deposit_amount: r.deposit_amount ?? undefined,
      available_days: r.available_days ?? undefined,
      equipment: r.equipment ?? undefined,
      conditions: r.conditions ?? undefined,
      insurance_required: r.insurance_required,
      insurance_notes: r.insurance_notes ?? undefined,
      products_policy: r.products_policy ?? undefined,
      photos: r.photos ?? undefined,
      status: 'draft',
    });
    setRentals((prev) => [copy, ...prev]);
    showToast('Annonce dupliquée en brouillon.');
  }

  async function toggleDisabled(r: ApiChairRental) {
    const next = r.status === 'disabled' ? 'available' : 'disabled';
    const updated = await chairRentals.update(r.id, { status: next });
    setRentals((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
    showToast(next === 'disabled' ? 'Annonce masquée.' : 'Annonce republiée.');
  }

  async function deleteRental(r: ApiChairRental) {
    if (!confirm(`Supprimer "${r.title}" définitivement ?`)) return;
    await chairRentals.remove(r.id);
    setRentals((prev) => prev.filter((x) => x.id !== r.id));
    showToast('Annonce supprimée.');
  }

  async function openRequestDetail(req: ApiChairRentalRequest) {
    const full = await chairRentals.showRequest(req.id);
    setDetailRequest(full);
  }

  async function refreshRequests() {
    const fresh = await chairRentals.myRequests();
    setRequests(fresh);
  }

  async function handleAccept() {
    if (!detailRequest) return;
    await chairRentals.acceptRequest(detailRequest.id);
    setDetailRequest(null);
    showToast('Demande acceptée.');
    refreshRequests();
    chairRentals.myRentals().then(setRentals);
  }

  async function handleDecline() {
    if (!detailRequest) return;
    await chairRentals.declineRequest(detailRequest.id);
    setDetailRequest(null);
    showToast('Demande refusée.');
    refreshRequests();
  }

  async function handleSendMessage(text: string) {
    if (!detailRequest) return;
    await chairRentals.sendMessage(detailRequest.id, text);
    const full = await chairRentals.showRequest(detailRequest.id);
    setDetailRequest(full);
    refreshRequests();
  }

  const acceptedCount = requests.filter((r) => r.status === 'accepted').length;
  const declinedCount = requests.filter((r) => r.status === 'declined').length;
  const acceptanceRate = acceptedCount + declinedCount > 0
    ? Math.round((acceptedCount / (acceptedCount + declinedCount)) * 100)
    : null;

  if (authLoading || loading || !salon) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 pt-4 pb-6">
        <DashboardPageHeader title="Fauteuils" backHref="/pro/salon-owner" />

        <div className="hidden md:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Fauteuils</h1>
            <p className="text-sm text-neutral-400 mt-0.5">Louez vos espaces libres à des coiffeurs indépendants</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 text-sm font-semibold bg-neutral-900 text-white px-4 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors">
            <Plus size={14} />Nouvelle annonce
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-4 overflow-x-auto">
          {([
            ['listings', 'Annonces', activeListings.length],
            ['drafts', 'Brouillons', drafts.length],
            ['requests', 'Demandes', pendingOrDiscussion],
            ['stats', 'Stats', 0],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap px-2 ${
                tab === key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              }`}
            >
              {label}
              {count > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 leading-none">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── ANNONCES ── */}
        {tab === 'listings' && (
          <>
            <div className="flex items-center justify-between mb-3 md:hidden">
              <p className="text-sm text-neutral-500">{activeListings.length} annonce{activeListings.length > 1 ? 's' : ''}</p>
              <button onClick={openCreate} className="flex items-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white px-3 py-2 rounded-xl hover:bg-neutral-700 transition-colors">
                <Plus size={13} />Nouvelle annonce
              </button>
            </div>
            {activeListings.length === 0 ? (
              <OwnerEmptyState
                icon={Armchair}
                title="Aucune annonce publiée"
                subtitle="Créez votre première annonce pour louer un fauteuil libre."
                action={{ label: 'Créer une annonce', icon: Plus, onClick: openCreate }}
              />
            ) : (
              <div className="space-y-2">
                {activeListings.map((r) => {
                  // Annonce dormante : disponible depuis 14 j+ sans AUCUNE
                  // demande — on suggère d'agir au lieu de laisser mourir.
                  const demandes = requests.filter((q) => q.chair_rental_id === r.id).length;
                  const ageJours = joursDepuis(r.published_at ?? r.created_at);
                  const dormante = r.status === 'available' && demandes === 0 && ageJours >= 14;
                  return (
                  <div key={r.id} className="bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 overflow-hidden">
                    <OwnerChairCard
                      bare
                      title={r.title}
                      thumbnailUrl={r.photos?.[0] ? resolveMediaUrl(r.photos[0]) : null}
                      photoCount={r.photos?.length}
                      pricePerDay={r.price_per_day}
                      status={r.status}
                      onClick={() => openEdit(r)}
                    />
                    {dormante && (
                      <button onClick={() => setPartage(r)} className="w-full flex items-start gap-2 px-4 py-2.5 bg-amber-50 text-left hover:bg-amber-100/70 transition-colors">
                        <Megaphone size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="text-[11.5px] text-amber-700 leading-snug">
                          Aucune demande en {ageJours} jours — <span className="font-bold">partagez l&apos;annonce</span>
                          {!r.photos?.length ? ', ajoutez des photos' : ''} ou ajustez le prix.
                        </span>
                      </button>
                    )}
                    <div className="flex border-t border-neutral-100 text-xs font-semibold">
                      {r.status !== 'disabled' && (
                        <button onClick={() => setPartage(r)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-neutral-900 hover:bg-neutral-50 transition-colors">
                          <Share2 size={12} />Partager
                        </button>
                      )}
                      <button onClick={() => duplicateRental(r)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-neutral-600 hover:bg-neutral-50 transition-colors ${r.status !== 'disabled' ? 'border-l border-neutral-100' : ''}`}>
                        <Copy size={12} />Dupliquer
                      </button>
                      <button onClick={() => toggleDisabled(r)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-l border-neutral-100 text-neutral-600 hover:bg-neutral-50 transition-colors">
                        {r.status === 'disabled' ? <><Eye size={12} />Republier</> : <><EyeOff size={12} />Masquer</>}
                      </button>
                      <button onClick={() => deleteRental(r)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-l border-neutral-100 text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={12} />Supprimer
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── BROUILLONS ── */}
        {tab === 'drafts' && (
          drafts.length === 0 ? (
            <OwnerEmptyState icon={FileEdit} title="Aucun brouillon" subtitle="Les annonces non terminées apparaissent ici — reprenez-les à tout moment." />
          ) : (
            <div className="space-y-2">
              {drafts.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
                  <OwnerChairCard
                    bare
                    title={r.title}
                    thumbnailUrl={r.photos?.[0] ? resolveMediaUrl(r.photos[0]) : null}
                    photoCount={r.photos?.length}
                    pricePerDay={r.price_per_day}
                    status={r.status}
                    hint="Reprendre"
                    onClick={() => openEdit(r)}
                  />
                  <div className="flex border-t border-neutral-100 text-xs font-semibold">
                    <button onClick={() => deleteRental(r)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={12} />Supprimer le brouillon
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── DEMANDES ── */}
        {tab === 'requests' && (
          requests.length === 0 ? (
            <OwnerEmptyState icon={Inbox} title="Aucune demande reçue" subtitle="Les demandes de location apparaîtront ici." />
          ) : (
            <div className="space-y-5">
              {REQUEST_COLUMNS.map(({ key, label }) => {
                const items = requests.filter((r) => r.status === key);
                if (items.length === 0) return null;
                return (
                  <div key={key}>
                    <p className="text-xs font-semibold tracking-wide uppercase text-neutral-400 mb-2 flex items-center gap-2">
                      {label}<span className="bg-neutral-100 text-neutral-500 rounded-full px-1.5 py-0.5 text-[10px]">{items.length}</span>
                    </p>
                    <div className="space-y-2">
                      {items.map((req) => (
                        <button
                          key={req.id}
                          onClick={() => openRequestDetail(req)}
                          className="w-full flex items-center gap-3 bg-white rounded-[22px] shadow-[0_2px_12px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 p-3 text-left hover:shadow-[0_8px_24px_-8px_rgba(10,10,10,0.18)] transition-all"
                        >
                          <div className="w-9 h-9 rounded-full bg-neutral-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                            <span className="text-sm font-bold text-neutral-500">{req.hairdresser?.user?.name?.charAt(0).toUpperCase() ?? '?'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-neutral-900 truncate">{req.hairdresser?.user?.name ?? 'Coiffeur'}</p>
                            <p className="text-xs text-neutral-400 truncate">{req.chair_rental?.title ?? rentals.find((r) => r.id === req.chair_rental_id)?.title}</p>
                          </div>
                          <Clock size={13} className="text-neutral-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── STATISTIQUES ── */}
        {tab === 'stats' && (
          <div className="grid grid-cols-2 gap-3">
            <OwnerStat icon={Armchair} value={activeListings.filter((r) => r.status === 'available').length} label="Annonces disponibles" />
            <OwnerStat icon={FileEdit} value={drafts.length} label="Brouillons" />
            <OwnerStat icon={Inbox} value={requests.length} label="Demandes reçues" />
            <OwnerStat icon={Clock} value={pendingOrDiscussion} label="En attente de réponse" />
            <OwnerStat icon={Percent} value={acceptanceRate !== null ? `${acceptanceRate}%` : '—'} label="Taux d’acceptation" />
            <OwnerStat icon={TrendingUp} value={activeListings.filter((r) => r.status === 'rented').length} label="Fauteuils loués" />
          </div>
        )}

        {/* Page du monde COIFFEUR (/pro) : sous /business (onglet Fauteuils
            de CHAIR BUSINESS), ce lien ferait sortir du chrome gérant vers la
            nav coiffeur — on ne le montre que dans l'espace PRO. Navigation
            interne, pas de target="_blank" : ça éjectait vers Safari dans
            l'app native, où le token n'existe pas. */}
        {!estBusiness && (
          <div className="mt-4">
            <Link href="/pro/fauteuils-a-louer" className="flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-700 transition-colors">
              <ExternalLink size={12} />Voir la recherche côté coiffeurs
            </Link>
          </div>
        )}
      </div>

      {wizardOpen && (
        <OwnerChairWizard
          salon={salon}
          initial={editingRental}
          onClose={() => setWizardOpen(false)}
          onSaved={handleSaved}
        />
      )}

      <OwnerBottomSheet
        open={!!detailRequest}
        onClose={() => setDetailRequest(null)}
        title={detailRequest?.chair_rental?.title ?? 'Demande'}
        subtitle={detailRequest ? new Date(detailRequest.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : undefined}
      >
        {detailRequest && (
          <OwnerChairRequestSheet
            request={detailRequest}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onSendMessage={handleSendMessage}
          />
        )}
      </OwnerBottomSheet>

      {/* Partage / pub d'une annonce — lien public + partage natif. */}
      {partage && (
        <FauteuilPartageSheet
          rental={partage}
          salonName={salon.name}
          onClose={() => setPartage(null)}
        />
      )}
    </div>
  );
}
