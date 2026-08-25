import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/contact';

// ───────────────────────────────────────────────────────────────────────────
// À COMPLÉTER AVANT LA SOUMISSION APP STORE — identité du responsable de
// traitement.
//
// L'article 13 du RGPD et la guideline Apple 5.1.1(i) exigent que l'éditeur
// soit identifiable : raison sociale, forme juridique, siège, numéro
// d'immatriculation, et le cas échéant le DPO. Ces informations ne peuvent
// venir que du gérant — rien n'est inventé ici. Tant qu'une valeur vaut
// `null`, la ligne correspondante n'est simplement pas rendue : la politique
// est alors INCOMPLÈTE et la soumission ne doit pas partir en l'état.
//
// Voir la checklist dans docs/app-store/APP_PRIVACY_MAPPING.md.
// ───────────────────────────────────────────────────────────────────────────
const CONTROLLER: {
  legalName: string | null;
  legalForm: string | null;
  address: string | null;
  registration: string | null;
  dpo: string | null;
} = {
  // Source : compte Apple Developer Program (Organisation) — l'identité de
  // l'éditeur doit être cohérente entre la fiche App Store, les mentions
  // légales et cette politique.
  legalName:    'Société d’exploitation du salon de coiffure Koehler',
  legalForm:    'SARL au capital de 7 623 €',
  address:      '25C rue de la Sablière, 67590 Schweighouse-sur-Moder, France',
  registration: 'SIREN 323 781 880 — R.C.S. Strasbourg',
  dpo:          null, // Aucun DPO désigné à ce jour : le contact vie privée
                      // est l'adresse de contact ci-dessous, ce qui satisfait
                      // le RGPD tant qu'une désignation n'est pas obligatoire.
};

// Adresse unique de contact, importée de la source de vérité partagée
// (lib/contact.ts) : Apple 1.2 exige une « published contact information »
// qui répond réellement, et plusieurs adresses concurrentes dans l'app
// garantissent qu'au moins l'une d'elles ne sera pas relevée.
// C'est aussi la destination du formulaire de contact (ContactController).
const CONTACT_EMAIL = SUPPORT_EMAIL;

const LAST_UPDATE = '24 août 2026';
const VERSION = '1.1';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[15px] font-bold text-neutral-900 mb-3 pb-2 border-b border-neutral-100">{title}</h2>
      <div className="space-y-3 text-[13px] text-neutral-600 leading-relaxed">{children}</div>
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neutral-300 flex-shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function Table({ headers, rows }: { headers: [string, string, string]; rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-100 mt-2">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-100">
            {headers.map((h) => (
              <th key={h} className="text-left px-3 py-2.5 font-semibold text-neutral-700">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([d, f, b], i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
              <td className="px-3 py-2.5 text-neutral-700 font-medium align-top">{d}</td>
              <td className="px-3 py-2.5 text-neutral-500 align-top">{f}</td>
              <td className="px-3 py-2.5 text-neutral-400 align-top">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 py-10">

        {/* Header */}
        <Link href="/app/compte" className="inline-flex items-center justify-center w-11 h-11 -ml-3 text-neutral-400 hover:text-neutral-900 transition-colors mb-4" aria-label="Retour">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </Link>

        <div className="mb-8">
          <h1 className="text-[26px] font-bold text-neutral-900 mb-1">Politique de confidentialité</h1>
          <p className="text-[12px] text-neutral-400">Dernière mise à jour : {LAST_UPDATE} · Version {VERSION}</p>
        </div>

        <div className="bg-neutral-50 rounded-2xl px-5 py-4 mb-8 border border-neutral-100">
          <p className="text-[13px] text-neutral-600 leading-relaxed">
            Cette politique décrit les données que l&apos;application CHAIR collecte réellement, pourquoi,
            avec qui elles sont partagées, combien de temps elles sont conservées et comment exercer tes droits.
            Elle est établie au regard du{' '}
            <strong className="text-neutral-800">Règlement Général sur la Protection des Données (RGPD)</strong> et
            des exigences de confidentialité de l&apos;App Store.
          </p>
        </div>

        <Section title="1. Responsable du traitement">
          <p>Le responsable du traitement des données décrites ci-dessous est l&apos;éditeur de CHAIR :</p>
          <div className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-100 mt-2 space-y-1">
            <p className="font-semibold text-neutral-800">{CONTROLLER.legalName ?? 'CHAIR'}</p>
            {CONTROLLER.legalForm && <p className="text-neutral-500">{CONTROLLER.legalForm}</p>}
            {CONTROLLER.address && <p className="text-neutral-500">{CONTROLLER.address}</p>}
            {CONTROLLER.registration && <p className="text-neutral-500">{CONTROLLER.registration}</p>}
            <p className="text-neutral-500">
              Email : <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
            </p>
            {CONTROLLER.dpo && <p className="text-neutral-500">Contact vie privée : {CONTROLLER.dpo}</p>}
          </div>
        </Section>

        <Section title="2. Données collectées et finalités">
          <p>
            CHAIR ne collecte que les données nécessaires à son fonctionnement. Le tableau ci-dessous
            correspond à ce que l&apos;application enregistre effectivement.
          </p>

          <p className="font-semibold text-neutral-800 pt-2">À la création du compte</p>
          <Table
            headers={['Donnée', 'Finalité', 'Base légale']}
            rows={[
              ['Nom (ou pseudo)', 'Identification, affichage sur tes avis', 'Exécution du contrat'],
              ['Adresse email', 'Connexion, emails de service, support', 'Exécution du contrat'],
              ['Mot de passe (haché, bcrypt)', 'Authentification', 'Exécution du contrat'],
              ['Ville', 'Afficher les coiffeurs de ta zone', 'Exécution du contrat'],
              ['Coordonnées de la ville (lat/lng)', 'Tri par proximité — issues de la ville, pas du GPS', 'Exécution du contrat'],
              ['Téléphone (facultatif)', 'Te joindre au sujet d’une réservation', 'Consentement'],
              ['Code de parrainage (facultatif)', 'Rattacher l’inscription au parrain', 'Intérêt légitime'],
            ]}
          />

          <p className="font-semibold text-neutral-800 pt-4">À l&apos;usage de l&apos;application</p>
          <Table
            headers={['Donnée', 'Finalité', 'Base légale']}
            rows={[
              ['Position GPS (si autorisée)', 'Classer les coiffeurs du plus proche au plus loin', 'Consentement'],
              ['Photo de profil (facultative)', 'Affichage de ton compte et de tes avis', 'Consentement'],
              ['Réservations (nom, email, téléphone, prestation, date, message)', 'Transmettre la demande au coiffeur, la suivre', 'Exécution du contrat'],
              ['Avis : note, commentaire, spécialité', 'Publication de l’avis sur le profil du coiffeur', 'Exécution du contrat'],
              ['Visites vérifiées par QR code', 'Certifier qu’un avis suit une vraie visite', 'Exécution du contrat'],
              ['Favoris et abonnements', 'Retrouver les coiffeurs enregistrés, fil personnalisé', 'Exécution du contrat'],
              ['Likes et enregistrements de réalisations', 'Retrouver les réalisations enregistrées', 'Exécution du contrat'],
              ['Profils consultés (profil, date, ton identifiant si connecté)', 'Recommandations, et statistiques d’audience AGRÉGÉES pour le coiffeur', 'Intérêt légitime'],
              ['Stories vues', 'Ne pas te remontrer une story déjà vue, compteur de vues', 'Intérêt légitime'],
              ['Partages effectués depuis l’app', 'Programme de parrainage, badges', 'Intérêt légitime'],
              ['Préférences de style (onboarding)', 'Adapter les suggestions', 'Consentement'],
              ['Préférences de notifications', 'Ne t’envoyer que ce que tu as accepté', 'Exécution du contrat'],
              ['Messages au support', 'Traiter ta demande', 'Exécution du contrat'],
              ['Signalements de contenus', 'Modération, sécurité du service', 'Intérêt légitime / obligation légale'],
              ['Journaux techniques serveur (dont adresse IP)', 'Sécurité, prévention des abus, diagnostic', 'Intérêt légitime'],
            ]}
          />

          <p className="text-[12px] text-neutral-400 mt-2">
            Les statistiques d&apos;audience visibles par un coiffeur professionnel sont des <strong className="text-neutral-600">compteurs
            agrégés</strong> (nombre de vues par jour). Un coiffeur ne voit jamais l&apos;identité des personnes qui ont
            consulté son profil.
          </p>
        </Section>

        <Section title="3. Ce que CHAIR ne collecte pas">
          <ul className="space-y-1.5 list-none">
            <Li>Aucune donnée bancaire ou de carte : l&apos;application ne traite aucun paiement. Les prestations
              de coiffure se règlent directement au salon.</Li>
            <Li>Aucun identifiant publicitaire (IDFA), aucun SDK publicitaire, aucune mesure d&apos;audience tierce
              (pas de Google Analytics, pas de Meta Pixel, pas de Firebase Analytics).</Li>
            <Li>Aucun suivi de ton activité sur d&apos;autres applications ou sites — CHAIR ne fait pas de
              &laquo; tracking &raquo; au sens de l&apos;App Store, et ne demande donc pas l&apos;autorisation de suivi (ATT).</Li>
            <Li>Aucune donnée biométrique (Face ID / Touch ID restent gérés par ton appareil).</Li>
            <Li>Aucun accès à tes contacts, à ton calendrier, à tes messages ou à ton micro.</Li>
            <Li>Aucune donnée de santé.</Li>
            <Li>Aucune localisation en arrière-plan : la position n&apos;est lue que pendant que tu utilises l&apos;app.</Li>
            <Li>Aucune revente de données, à personne, dans aucun cas.</Li>
          </ul>
        </Section>

        <Section title="4. Localisation">
          <p>
            La position GPS n&apos;est demandée que sur l&apos;écran de recherche, au moment où la distance sert
            réellement à classer les résultats — jamais au lancement de l&apos;application.
          </p>
          <ul className="space-y-1.5 list-none">
            <Li>La demande système n&apos;apparaît qu&apos;après une action explicite de ta part (bouton
              &laquo; Autoriser la localisation &raquo; ou &laquo; Utiliser ma position &raquo;).</Li>
            <Li>Usage en premier plan uniquement (&laquo; When In Use &raquo;), jamais en arrière-plan.</Li>
            <Li>La position est mise en cache sur ton appareil pendant 24 h maximum, puis effacée automatiquement.</Li>
            <Li>Si tu es connecté, tes dernières coordonnées sont enregistrées sur ton compte pour pré-remplir
              &laquo; près de chez moi &raquo;. Tu peux les remplacer par une simple ville à tout moment.</Li>
            <Li>Pour afficher un nom de commune à partir de coordonnées, celles-ci sont envoyées à l&apos;API Adresse
              de l&apos;État français (voir section 5).</Li>
            <Li>Ta position n&apos;est jamais montrée à un autre utilisateur, ni à un coiffeur.</Li>
            <Li>En cas de refus, l&apos;application reste entièrement utilisable : la recherche fonctionne par ville,
              avec toutes les fonctionnalités (carte, filtres, réservation, avis).</Li>
            <Li>Tu peux retirer l&apos;autorisation à tout moment dans les réglages de ton appareil.</Li>
          </ul>
        </Section>

        <Section title="5. Destinataires et sous-traitants">
          <p>
            CHAIR <strong className="text-neutral-800">ne vend jamais tes données</strong>. Elles sont accessibles à
            l&apos;équipe CHAIR et aux prestataires techniques strictement nécessaires au service :
          </p>
          <Table
            headers={['Destinataire', 'Rôle', 'Localisation']}
            rows={[
              ['Hébergeur de l’application et de la base', 'Stockage et traitement des données', 'À préciser — voir mentions légales'],
              ['Cloudinary', 'Stockage et diffusion des photos et vidéos publiées', 'États-Unis (clauses contractuelles types / DPF)'],
              ['API Adresse (data.gouv.fr, État français)', 'Recherche de commune et conversion coordonnées → ville', 'France'],
              ['Apple — MapKit JS', 'Affichage du fond de carte (reçoit l’adresse IP et la zone affichée)', 'États-Unis / réseau mondial'],
              ['CARTO / OpenStreetMap', 'Fond de carte de secours si MapKit est indisponible', 'Union européenne / États-Unis'],
              ['Prestataire d’envoi d’emails', 'Emails transactionnels (confirmation, rappel, sécurité)', 'À préciser — voir mentions légales'],
              ['Apple', 'Distribution de l’application via l’App Store', 'États-Unis (EU-US Data Privacy Framework)'],
              ['Coiffeur ou salon concerné', 'Reçoit les informations de TA demande de réservation et ton avis public', 'France'],
            ]}
          />
          <p className="text-[12px] text-neutral-400 mt-2">
            Les fonds de carte ne sont chargés que lorsque tu ouvres une carte. Les transferts hors Union
            européenne sont encadrés par les clauses contractuelles types de la Commission européenne ou par
            le cadre EU-US Data Privacy Framework.
          </p>
          <p className="text-[12px] text-neutral-400">
            Le service de notifications push (OneSignal) et le prestataire de paiement d&apos;abonnements
            professionnels (Stripe) concernent l&apos;espace professionnel CHAIR PRO. Ils ne sont pas activés
            dans l&apos;application CHAIR destinée aux clients.
          </p>
        </Section>

        <Section title="6. Durées de conservation">
          <ul className="space-y-1.5 list-none">
            <Li><strong className="text-neutral-700">Compte actif :</strong> tes données sont conservées tant que le compte existe.</Li>
            <Li><strong className="text-neutral-700">Suppression du compte :</strong> les avis, réservations, notifications,
              favoris et abonnements sont supprimés immédiatement ; le compte est anonymisé et les accès révoqués (voir section 9).</Li>
            <Li><strong className="text-neutral-700">Position en cache sur l&apos;appareil :</strong> 24 h maximum.</Li>
            <Li><strong className="text-neutral-700">Statistiques d&apos;audience agrégées :</strong> conservées sans lien avec ton
              identité une fois ton compte supprimé.</Li>
            <Li><strong className="text-neutral-700">Journaux techniques et de sécurité :</strong> 12 mois maximum.</Li>
            <Li><strong className="text-neutral-700">Documents comptables</strong> (facturation des abonnements professionnels) :
              10 ans, obligation légale française.</Li>
          </ul>
        </Section>

        <Section title="7. Sécurité">
          <ul className="space-y-1.5 list-none">
            <Li>Mots de passe hachés (bcrypt) — jamais stockés en clair, jamais lisibles par l&apos;équipe.</Li>
            <Li>Communications chiffrées en HTTPS/TLS exclusivement.</Li>
            <Li>Jetons d&apos;authentification personnels, révoqués à la déconnexion et à la suppression du compte.</Li>
            <Li>Accès aux données de production restreint aux personnes qui en ont besoin, avec journalisation
              des actions d&apos;administration.</Li>
            <Li>Aucune donnée sensible stockée sur l&apos;appareil en dehors du jeton de session.</Li>
          </ul>
          <p>En cas de violation de données présentant un risque, tu seras informé conformément au RGPD (art. 34).</p>
        </Section>

        <Section title="8. Tes droits">
          <p>Tu disposes à tout moment des droits suivants :</p>
          <ul className="space-y-2 list-none">
            <Li><strong className="text-neutral-700">Accès :</strong> obtenir une copie des données te concernant.</Li>
            <Li><strong className="text-neutral-700">Rectification :</strong> corriger une donnée inexacte — la plupart des
              champs sont modifiables directement dans Compte → Modifier mon profil.</Li>
            <Li><strong className="text-neutral-700">Effacement :</strong> supprimer ton compte depuis l&apos;application (section 9).</Li>
            <Li><strong className="text-neutral-700">Portabilité :</strong> recevoir tes données dans un format structuré, sur
              demande par email.</Li>
            <Li><strong className="text-neutral-700">Opposition :</strong> t&apos;opposer aux traitements fondés sur l&apos;intérêt légitime.</Li>
            <Li><strong className="text-neutral-700">Limitation :</strong> demander le gel temporaire d&apos;un traitement.</Li>
            <Li><strong className="text-neutral-700">Retrait du consentement :</strong> à tout moment, notamment pour la
              localisation (réglages de l&apos;appareil) et les notifications (Compte → Notifications).</Li>
          </ul>
          <div className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-100 mt-3">
            <p className="font-semibold text-neutral-800 text-[13px] mb-1">Pour exercer tes droits</p>
            <p>Email : <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a></p>
            <p className="text-neutral-400 mt-1 text-[12px]">Réponse sous un mois. Un justificatif d&apos;identité peut être demandé.</p>
          </div>
          <p>
            Tu peux également introduire une réclamation auprès de la{' '}
            <strong className="text-neutral-700">CNIL</strong> :{' '}
            <a href="https://www.cnil.fr" className="underline" target="_blank" rel="noopener noreferrer">cnil.fr</a>
          </p>
        </Section>

        <Section title="9. Suppression du compte">
          <p>
            Tu peux supprimer ton compte à tout moment depuis l&apos;application :{' '}
            <strong className="text-neutral-800">Compte → Supprimer mon compte</strong>. Aucune démarche par email
            n&apos;est nécessaire.
          </p>
          <p>La suppression entraîne immédiatement :</p>
          <ul className="space-y-1.5 list-none">
            <Li>la suppression de tes avis, de tes demandes de réservation, de tes notifications, de tes favoris
              et de tes abonnements ;</Li>
            <Li>l&apos;effacement de ton nom, de ton email, de ton téléphone, de ta photo, de ta ville et de tes
              coordonnées de localisation ;</Li>
            <Li>la révocation de tous tes accès (déconnexion de tous les appareils).</Li>
          </ul>
          <p>
            Les compteurs statistiques déjà agrégés côté professionnel (nombre de vues d&apos;un profil, par exemple)
            ne contiennent plus aucune donnée permettant de t&apos;identifier.
          </p>
          <p className="text-[12px] text-neutral-400">
            Si tu utilises aussi CHAIR PRO en tant que coiffeur ou gérant, la suppression ne supprime pas le salon
            ni les données de ton équipe, qui appartiennent à d&apos;autres utilisateurs : écris-nous à{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a> pour organiser le transfert.
          </p>
        </Section>

        <Section title="10. Mineurs">
          <p>
            CHAIR est ouvert aux personnes majeures, et aux mineurs disposant de l&apos;autorisation du titulaire de
            l&apos;autorité parentale, conformément aux{' '}
            <Link href="/cgu" className="underline">Conditions Générales d&apos;Utilisation</Link>.
            L&apos;application n&apos;est pas destinée aux enfants et ne leur propose aucun contenu spécifique.
          </p>
          <p>
            Si tu es parent ou tuteur et que tu penses qu&apos;un compte a été créé sans ton accord, écris-nous à{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a> : le compte et les données
            associées seront supprimés.
          </p>
        </Section>

        <Section title="11. Stockage local et cookies">
          <p>
            CHAIR n&apos;utilise <strong className="text-neutral-800">aucun cookie publicitaire ni traceur tiers</strong>.
            L&apos;application enregistre uniquement, sur ton appareil, des informations techniques nécessaires à son
            fonctionnement :
          </p>
          <ul className="space-y-1.5 list-none">
            <Li>ton jeton de session et ton profil en cache, pour rester connecté ;</Li>
            <Li>ta position, si tu l&apos;as autorisée, pendant 24 h maximum ;</Li>
            <Li>tes préférences de style et de notifications ;</Li>
            <Li>tes recherches récentes (elles ne quittent jamais ton appareil) ;</Li>
            <Li>les écrans d&apos;introduction déjà vus, pour ne pas te les remontrer.</Li>
          </ul>
          <p>
            Ces informations restent sur ton appareil et sont effacées si tu te déconnectes ou si tu désinstalles
            l&apos;application. Comme elles sont strictement nécessaires au service, elles ne sont pas soumises à
            consentement préalable.
          </p>
        </Section>

        <Section title="12. Notifications">
          <p>
            CHAIR t&apos;informe dans l&apos;application (centre de notifications) et par email : confirmation ou
            annulation d&apos;une demande de réservation, rappel de rendez-vous, invitation à laisser un avis,
            messages de sécurité liés à ton compte.
          </p>
          <p>
            Tu choisis ce que tu reçois dans <strong className="text-neutral-800">Compte → Notifications</strong>.
            Les messages de sécurité restent envoyés car ils protègent ton compte. Cette version de l&apos;application
            n&apos;envoie pas de notifications push système : si cela évolue, l&apos;autorisation te sera demandée par
            ton appareil et cette politique sera mise à jour.
          </p>
        </Section>

        <Section title="13. Contenus publiés et modération">
          <p>
            Les avis que tu publies sont publics : ta note, ton commentaire et ton prénom apparaissent sur le profil
            du coiffeur concerné, qui peut y répondre publiquement.
          </p>
          <p>
            Tout contenu ou utilisateur peut être signalé depuis l&apos;application. Un signalement enregistre le
            contenu visé, le motif et ton identifiant, le temps du traitement — nécessaire pour instruire la demande
            et sanctionner les abus.
          </p>
        </Section>

        <Section title="14. Modifications">
          <p>
            Cette politique peut évoluer. En cas de modification substantielle, tu seras informé dans l&apos;application
            et/ou par email au moins 15 jours avant son entrée en vigueur. La version en vigueur est toujours
            disponible à l&apos;adresse{' '}
            <a href="https://www.getchair.app/confidentialite" className="underline">getchair.app/confidentialite</a>.
          </p>
        </Section>

        <Section title="15. Contact">
          <ul className="space-y-1.5 list-none">
            <Li>Questions confidentialité et exercice des droits : <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a></Li>
            <Li>Signalement d&apos;un contenu ou d&apos;un comportement abusif : depuis l&apos;application, ou <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a></Li>
          </ul>
        </Section>

        <div className="border-t border-neutral-100 pt-6 mt-2">
          <div className="flex flex-wrap gap-4 text-[12px] text-neutral-400">
            <Link href="/cgu" className="hover:text-neutral-700 transition-colors underline">
              Conditions Générales d&apos;Utilisation
            </Link>
            <Link href="/app/compte" className="hover:text-neutral-700 transition-colors">
              ← Profil
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
