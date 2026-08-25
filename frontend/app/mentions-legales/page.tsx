import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/contact';

// ───────────────────────────────────────────────────────────────────────────
// À COMPLÉTER AVANT LA SOUMISSION APP STORE — identité légale de l'éditeur.
//
// Obligations : article 6-III de la LCEN (identification de l'éditeur d'un
// service de communication au public en ligne), article L.111-1 du code de la
// consommation, article L.612-1 du code de la consommation (médiateur), et
// guideline Apple 1.2 / 5.1.1(i) (éditeur identifiable + contact publié).
//
// AUCUNE de ces valeurs ne peut être devinée : elles figurent sur l'extrait
// Kbis de la société, dans les statuts, et dans le contrat d'hébergement.
// Rien n'est inventé ici. Tant qu'un champ vaut `null`, le bloc correspondant
// n'est PAS rendu — la page est alors incomplète au regard de la loi
// française et la soumission ne doit pas partir en l'état.
//
// Où trouver quoi :
//   legalName / legalForm / capital / registration / vatNumber → extrait Kbis
//   address                                                    → siège social (Kbis)
//   publicationDirector → représentant légal (gérant / président)
//   phone               → ligne réellement joignable, sinon laisser à null
//   host.*              → contrat de l'hébergeur du site (raison sociale,
//                         adresse postale complète, téléphone)
//   mediator.*          → organisme de médiation de la consommation auquel
//                         l'entreprise a adhéré (adhésion obligatoire pour un
//                         pro vendant à des consommateurs)
// ───────────────────────────────────────────────────────────────────────────
const PUBLISHER: {
  legalName: string | null;
  legalForm: string | null;
  capital: string | null;
  address: string | null;
  registration: string | null;
  vatNumber: string | null;
  publicationDirector: string | null;
  phone: string | null;
} = {
  // Source : compte Apple Developer Program (Organisation). Ce nom est aussi
  // celui qui apparaîtra publiquement comme vendeur sur la fiche App Store —
  // les deux doivent rester identiques.
  legalName:           'Société d’exploitation du salon de coiffure Koehler',
  legalForm:           'SARL — société à responsabilité limitée',
  capital:             'Capital social : 7 623 €',
  address:             '25C rue de la Sablière, 67590 Schweighouse-sur-Moder, France',
  registration:        '323 781 880 R.C.S. Strasbourg',
  vatNumber:           'FR68323781880',
  publicationDirector: 'Philippe Koehler',
  phone:               '+33 9 63 57 01 08',
};

/**
 * Hébergeurs — la LCEN (art. 6-III) impose de publier la dénomination,
 * l'adresse et le téléphone de l'hébergeur. CHAIR en a DEUX, il faut donc
 * citer les deux : le site et les applications web sont servis par Vercel,
 * l'API et la base de données sont chez Infomaniak.
 *
 * Coordonnées relevées le 25/08/2026 sur les publications officielles de
 * chaque prestataire (mentions légales / politique de confidentialité), pas
 * de mémoire. À revérifier si l'un d'eux change de siège.
 */
const HOSTS: Array<{
  role: string;
  legalName: string;
  address: string;
  phone: string | null;
  website: string;
}> = [
  {
    role:      'Site web et applications',
    legalName: 'Vercel Inc.',
    address:   '440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis',
    phone:     null, // Vercel ne publie pas de numéro de téléphone de contact
    website:   'https://vercel.com',
  },
  {
    role:      'API et hébergement des données',
    legalName: 'Infomaniak Network SA',
    address:   'Rue Eugène-Marziano 25, 1227 Genève, Suisse',
    phone:     null, // À COMPLÉTER si besoin — non vérifié à la source
    website:   'https://www.infomaniak.com',
  },
];

const MEDIATOR: {
  name: string | null;
  address: string | null;
  website: string | null;
} = {
  name:    null, // organisme de médiation de la consommation
  address: null,
  website: null,
};

const LAST_UPDATE = '24 août 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[15px] font-bold text-neutral-900 mb-3 pb-2 border-b border-neutral-100">{title}</h2>
      <div className="space-y-3 text-[13px] text-neutral-600 leading-relaxed">{children}</div>
    </section>
  );
}

export default function MentionsLegalesPage() {
  const hasHost = HOSTS.length > 0;
  const hasMediator = !!(MEDIATOR.name || MEDIATOR.website);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 py-10">

        {/* Header */}
        <Link
          href="/app/compte"
          className="inline-flex items-center justify-center w-11 h-11 -ml-3 text-neutral-400 hover:text-neutral-900 transition-colors mb-4"
          aria-label="Retour"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </Link>

        <div className="mb-8">
          <h1 className="text-[26px] font-bold text-neutral-900 mb-1">Mentions légales</h1>
          <p className="text-[12px] text-neutral-400">Dernière mise à jour : {LAST_UPDATE}</p>
        </div>

        <Section title="Éditeur du service">
          <p>
            CHAIR est une plateforme de mise en relation entre coiffeurs professionnels et clients,
            accessible sur le web et via les applications mobiles CHAIR et CHAIR PRO.
          </p>
          <div className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-100 mt-2 space-y-1">
            <p className="font-semibold text-neutral-800">{PUBLISHER.legalName ?? 'CHAIR'}</p>
            {PUBLISHER.legalForm && <p className="text-neutral-500">{PUBLISHER.legalForm}</p>}
            {PUBLISHER.capital && <p className="text-neutral-500">{PUBLISHER.capital}</p>}
            {PUBLISHER.address && <p className="text-neutral-500">{PUBLISHER.address}</p>}
            {PUBLISHER.registration && <p className="text-neutral-500">{PUBLISHER.registration}</p>}
            {PUBLISHER.vatNumber && <p className="text-neutral-500">TVA intracommunautaire : {PUBLISHER.vatNumber}</p>}
            <p className="text-neutral-500">
              Email : <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>
            </p>
            {PUBLISHER.phone && <p className="text-neutral-500">Téléphone : {PUBLISHER.phone}</p>}
          </div>
        </Section>

        {PUBLISHER.publicationDirector && (
          <Section title="Directeur de la publication">
            <p>
              Le directeur de la publication est{' '}
              <strong className="text-neutral-800">{PUBLISHER.publicationDirector}</strong>, représentant
              légal de l&apos;éditeur.
            </p>
          </Section>
        )}

        {hasHost && (
          <Section title="Hébergement">
            <p>Le site et les applications CHAIR sont hébergés par :</p>
            {HOSTS.map((host) => (
              <div
                key={host.legalName}
                className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-100 mt-2 space-y-1"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-400">{host.role}</p>
                <p className="font-semibold text-neutral-800">{host.legalName}</p>
                <p className="text-neutral-500">{host.address}</p>
                {host.phone && <p className="text-neutral-500">Téléphone : {host.phone}</p>}
                <p className="text-neutral-500">
                  <a href={host.website} target="_blank" rel="noopener noreferrer" className="underline">
                    {host.website}
                  </a>
                </p>
              </div>
            ))}
          </Section>
        )}

        <Section title="Propriété intellectuelle">
          <p>
            La marque CHAIR, le logo, la charte graphique, les interfaces, les textes et le code
            de la plateforme sont protégés par le droit de la propriété intellectuelle et restent
            la propriété exclusive de l&apos;éditeur. Toute reproduction, représentation ou
            réutilisation, totale ou partielle, sans autorisation écrite préalable est interdite.
          </p>
          <p>
            Les photos, vidéos et textes publiés par les coiffeurs et les clients restent la
            propriété de leurs auteurs. En les publiant sur CHAIR, ceux-ci accordent à l&apos;éditeur
            la licence d&apos;affichage décrite dans les{' '}
            <Link href="/cgu" className="underline underline-offset-2">conditions générales d&apos;utilisation</Link>.
          </p>
          <p>
            Toute demande relative à un contenu que tu estimes utilisé sans ton autorisation peut
            être adressée à <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>,
            ou signalée directement depuis le contenu concerné (menu « … » puis Signaler).
          </p>
        </Section>

        <Section title="Contenus publiés par les utilisateurs">
          <p>
            CHAIR agit en qualité d&apos;hébergeur au sens de l&apos;article 6-I-2 de la loi pour la
            confiance dans l&apos;économie numérique : les contenus publiés le sont sous la
            responsabilité de leurs auteurs. Tout contenu manifestement illicite porté à notre
            connaissance est retiré promptement.
          </p>
          <p>
            Les modalités de signalement et de blocage sont détaillées dans les{' '}
            <Link href="/app/regles-communaute" className="underline underline-offset-2">règles de communauté</Link>.
          </p>
        </Section>

        <Section title="Données personnelles et cookies">
          <p>
            Le traitement des données personnelles, les durées de conservation et les modalités
            d&apos;exercice de tes droits sont décrits dans la{' '}
            <Link href="/confidentialite" className="underline underline-offset-2">politique de confidentialité</Link>.
          </p>
        </Section>

        <Section title="Médiation de la consommation">
          <p>
            Conformément à l&apos;article L.612-1 du code de la consommation, tout consommateur a
            le droit de recourir gratuitement à un médiateur de la consommation en vue de la
            résolution amiable d&apos;un litige qui l&apos;oppose à l&apos;éditeur, après avoir
            tenté de le résoudre directement auprès de nos services en écrivant à{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>.
          </p>
          {hasMediator && (
            <div className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-100 mt-2 space-y-1">
              {MEDIATOR.name && <p className="font-semibold text-neutral-800">{MEDIATOR.name}</p>}
              {MEDIATOR.address && <p className="text-neutral-500">{MEDIATOR.address}</p>}
              {MEDIATOR.website && (
                <p className="text-neutral-500">
                  <a href={MEDIATOR.website} target="_blank" rel="noopener noreferrer" className="underline">
                    {MEDIATOR.website}
                  </a>
                </p>
              )}
            </div>
          )}
          <p>
            La plateforme européenne de règlement en ligne des litiges est également accessible à
            l&apos;adresse{' '}
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="underline">
              ec.europa.eu/consumers/odr
            </a>.
          </p>
        </Section>

        <Section title="Nous contacter">
          <p>
            Pour toute question relative à ces mentions légales, au fonctionnement du service ou à
            un contenu publié :
          </p>
          <ul className="space-y-1.5 list-none">
            <li className="flex gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neutral-300 flex-shrink-0" />
              <span>Email : <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a></span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neutral-300 flex-shrink-0" />
              <span>Formulaire : <Link href="/contact" className="underline underline-offset-2">page Contact</Link></span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neutral-300 flex-shrink-0" />
              <span>
                Documents liés :{' '}
                <Link href="/cgu" className="underline underline-offset-2">CGU</Link> ·{' '}
                <Link href="/confidentialite" className="underline underline-offset-2">Confidentialité</Link> ·{' '}
                <Link href="/app/regles-communaute" className="underline underline-offset-2">Règles de communauté</Link>
              </span>
            </li>
          </ul>
        </Section>

      </div>
    </div>
  );
}
