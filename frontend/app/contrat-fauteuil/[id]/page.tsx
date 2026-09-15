'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { chairRentals } from '@/lib/api';
import { CHAIR_EQUIPMENT_LABELS, type ApiRentalContract } from '@/lib/types';
import { Printer, Loader2, AlertCircle } from 'lucide-react';

const JOURS: Record<number, string> = { 1: 'lundi', 2: 'mardi', 3: 'mercredi', 4: 'jeudi', 5: 'vendredi', 6: 'samedi', 7: 'dimanche' };

function euros(n: number | null): string | null {
  return n != null ? `${n.toLocaleString('fr-FR')} €` : null;
}

/**
 * Contrat de mise à disposition d'un fauteuil — généré depuis les données
 * réelles de l'annonce et des deux parties dès qu'une demande est acceptée
 * (décision Julien 15/09/2026). Vit HORS des coquilles PRO/BUSINESS : c'est
 * un document, pensé pour l'impression (le bouton appelle window.print,
 * l'en-tête d'action est masqué au print).
 *
 * Les clauses d'indépendance (article 5) sont le cœur du document : c'est
 * l'absence de subordination qui protège le gérant d'une requalification
 * URSSAF en contrat de travail.
 */
export default function ContratFauteuilPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ApiRentalContract | null>(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!id) return;
    chairRentals.contract(Number(id))
      .then(setData)
      .catch((e) => setErreur(e instanceof Error ? e.message : 'Contrat indisponible.'));
  }, [id]);

  if (erreur) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-6 text-center">
        <AlertCircle size={28} className="text-neutral-300 mb-3" />
        <p className="text-sm font-semibold text-neutral-700">{erreur}</p>
        <p className="text-xs text-neutral-400 mt-1">Le contrat n&apos;est disponible que pour une demande acceptée, et uniquement pour ses deux parties.</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-neutral-300" />
      </div>
    );
  }

  const f = data.fauteuil;
  const jours = (f.available_days ?? []).map((d) => JOURS[d]).filter(Boolean).join(', ');
  const tarifs = [
    euros(f.price_per_day) && `${euros(f.price_per_day)} par jour`,
    euros(f.price_per_week) && `${euros(f.price_per_week)} par semaine`,
    euros(f.price_per_month) && `${euros(f.price_per_month)} par mois`,
  ].filter(Boolean).join(' · ');
  const dateAcceptation = data.accepted_at
    ? new Date(data.accepted_at + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white">
      {/* Barre d'action — jamais imprimée. */}
      <div className="print:hidden sticky top-0 z-10 bg-white shadow-[0_4px_20px_-8px_rgba(10,10,10,0.08)] px-4 h-14 flex items-center justify-between">
        <span className="text-sm font-bold tracking-tight text-neutral-900">Contrat de location</span>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white px-3.5 py-2 rounded-xl hover:bg-neutral-700 transition-colors"
        >
          <Printer size={13} /> Imprimer / PDF
        </button>
      </div>

      <div className="max-w-[720px] mx-auto bg-white my-6 print:my-0 px-8 py-10 md:px-12 shadow-[0_10px_40px_-16px_rgba(10,10,10,0.15)] print:shadow-none rounded-[8px] print:rounded-none text-[13px] leading-relaxed text-neutral-800">

        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-400 mb-1">CHAIR</p>
        <h1 className="text-center text-[19px] font-bold text-neutral-900 leading-snug mb-8">
          Contrat de mise à disposition<br />d&apos;un fauteuil de coiffure
        </h1>

        <section className="mb-6">
          <h2 className="text-[13px] font-bold text-neutral-900 mb-2">Entre les soussignés</h2>
          <p className="mb-2">
            <span className="font-semibold">{data.salon.name}</span>
            {data.salon.siret ? <>, SIRET {data.salon.siret}</> : <>, SIRET : <span className="inline-block w-40 border-b border-neutral-300 align-baseline">&nbsp;</span></>}
            {data.salon.address && <>, dont l&apos;établissement est situé {data.salon.address}</>}
            {data.salon.owner_name && <>, représenté par {data.salon.owner_name}</>},
            ci-après « le Salon »,
          </p>
          <p>
            et <span className="font-semibold">{data.locataire.name}</span>, coiffeur(se) exerçant à titre indépendant
            {data.locataire.siret ? <>, SIRET {data.locataire.siret}</> : <>, SIRET : <span className="inline-block w-40 border-b border-neutral-300 align-baseline">&nbsp;</span></>}
            {data.locataire.city && <>, établi(e) à {data.locataire.city}</>},
            ci-après « le Locataire ».
          </p>
        </section>

        <Article n={1} titre="Objet">
          Le Salon met à la disposition du Locataire un fauteuil de coiffure et l&apos;accès aux parties
          communes nécessaires à son activité, au sein de l&apos;établissement « {f.title} »
          {f.address && <> situé {f.address}</>}. Le présent contrat est un contrat de prestation de
          services : il ne constitue ni un bail commercial, ni un contrat de travail.
        </Article>

        <Article n={2} titre="Durée">
          Le contrat prend effet le {dateAcceptation}. Il est conclu pour une durée indéterminée et peut
          être résilié par chacune des parties avec un préavis de trente (30) jours, notifié par écrit.
        </Article>

        <Article n={3} titre="Redevance et dépôt de garantie">
          La redevance de mise à disposition est fixée à : {tarifs || '________'}
          {f.deposit_amount != null && <>. Un dépôt de garantie de {euros(f.deposit_amount)} est versé à la signature et restitué au terme du contrat, déduction faite des éventuelles dégradations</>}.
          La redevance s&apos;entend hors taxes ; la TVA applicable est facturée en sus par le Salon s&apos;il y est assujetti.
        </Article>

        <Article n={4} titre="Jours d'accès et équipements">
          {jours ? <>Le fauteuil est accessible les {jours}.</> : <>Les jours d&apos;accès sont convenus entre les parties.</>}{' '}
          {(f.equipment?.length ?? 0) > 0 && (
            <>Sont inclus dans la mise à disposition : {f.equipment!.map((k) => CHAIR_EQUIPMENT_LABELS[k]).join(', ')}. </>
          )}
          {f.products_policy && <>Produits : {f.products_policy}. </>}
        </Article>

        <Article n={5} titre="Indépendance du Locataire">
          Le Locataire exerce son activité en pleine indépendance, sous sa seule responsabilité et sous
          son propre numéro SIRET. Il fixe librement ses tarifs, ses horaires dans le cadre des jours
          d&apos;accès convenus, et développe sa propre clientèle. Il encaisse directement ses clients et
          assume seul ses obligations fiscales et sociales. Aucun lien de subordination n&apos;existe entre
          le Salon et le Locataire : le Salon ne lui donne ni directives, ni instructions, ni ne contrôle
          son activité.
        </Article>

        <Article n={6} titre="Assurance">
          {f.insurance_required
            ? <>Le Locataire justifie d&apos;une assurance responsabilité civile professionnelle en cours de validité, dont il fournit l&apos;attestation à la signature{f.insurance_notes && <> ({f.insurance_notes})</>}.</>
            : <>Chaque partie demeure assurée pour sa propre responsabilité civile professionnelle.</>}
        </Article>

        <Article n={7} titre="Règlement intérieur et conditions particulières">
          {f.conditions || 'Le Locataire respecte le règlement intérieur de l’établissement et maintient son poste de travail en bon état de propreté.'}
        </Article>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-10 pt-6 border-t border-neutral-200">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400 mb-1">Le Salon</p>
            <p className="font-semibold">{data.salon.owner_name ?? data.salon.name}</p>
            <p className="text-[11px] text-neutral-400 mt-8 border-t border-neutral-200 pt-1">Date et signature, précédées de « lu et approuvé »</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400 mb-1">Le Locataire</p>
            <p className="font-semibold">{data.locataire.name}</p>
            <p className="text-[11px] text-neutral-400 mt-8 border-t border-neutral-200 pt-1">Date et signature, précédées de « lu et approuvé »</p>
          </div>
        </div>

        <p className="text-[10px] text-neutral-400 leading-relaxed mt-10 pt-4 border-t border-neutral-100">
          Modèle pré-rempli fourni par CHAIR à partir de l&apos;annonce et des profils des deux parties, à
          titre indicatif. Il ne constitue pas un conseil juridique : les parties restent libres de
          l&apos;adapter et sont invitées à le faire relire par leur conseil.
        </p>
      </div>
    </div>
  );
}

function Article({ n, titre, children }: { n: number; titre: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="text-[13px] font-bold text-neutral-900 mb-1">Article {n} — {titre}</h2>
      <p>{children}</p>
    </section>
  );
}
