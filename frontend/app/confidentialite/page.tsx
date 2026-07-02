import Link from 'next/link';

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

function Table({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-100 mt-2">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-100">
            <th className="text-left px-3 py-2.5 font-semibold text-neutral-700">Donnée</th>
            <th className="text-left px-3 py-2.5 font-semibold text-neutral-700">Finalité</th>
            <th className="text-left px-3 py-2.5 font-semibold text-neutral-700">Base légale</th>
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
        <Link href="/app/compte" className="inline-flex items-center justify-center w-8 h-8 text-neutral-400 hover:text-neutral-900 transition-colors mb-6">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </Link>

        <div className="mb-8">
          <h1 className="text-[26px] font-bold text-neutral-900 mb-1">Politique de Confidentialité</h1>
          <p className="text-[12px] text-neutral-400">Dernière mise à jour : 1er juillet 2026 · Version 1.0</p>
        </div>

        <div className="bg-neutral-50 rounded-2xl px-5 py-4 mb-8 border border-neutral-100">
          <p className="text-[13px] text-neutral-600 leading-relaxed">
            CHAIR s'engage à protéger votre vie privée. Cette politique explique quelles données nous collectons,
            pourquoi, comment nous les utilisons, et vos droits. Elle est conforme au{' '}
            <strong className="text-neutral-800">Règlement Général sur la Protection des Données (RGPD)</strong> et
            aux exigences de confidentialité de l'App Store d'Apple.
          </p>
        </div>

        <Section title="1. Responsable du traitement">
          <p>
            Le responsable du traitement de vos données personnelles est :
          </p>
          <div className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-100 mt-2">
            <p className="font-semibold text-neutral-800">CHAIR</p>
            <p className="text-neutral-500 mt-1">Email : <a href="mailto:hello@getchair.app" className="underline">hello@getchair.app</a></p>
          </div>
        </Section>

        <Section title="2. Données collectées et finalités">
          <p>Nous collectons uniquement les données nécessaires au fonctionnement de CHAIR :</p>
          <Table rows={[
            ['Nom complet', 'Identification, affichage profil', 'Exécution du contrat'],
            ['Adresse email', 'Connexion, notifications, support', 'Exécution du contrat'],
            ['Mot de passe (chiffré)', 'Authentification sécurisée', 'Exécution du contrat'],
            ['Numéro de téléphone', 'Contact optionnel, 2FA futur', 'Consentement'],
            ['Ville / Code postal', 'Résultats de recherche locaux', 'Intérêt légitime'],
            ['Photo de profil', 'Affichage sur le profil public', 'Consentement'],
            ['Géolocalisation GPS', 'Afficher les coiffeurs proches', 'Consentement'],
            ['Contenu publié (photos)', 'Réalisations, portfolio coiffeur', 'Exécution du contrat'],
            ['Avis & notes', 'Évaluations certifiées', 'Exécution du contrat'],
            ['Historique de réservations', 'Gestion RDV, avis certifiés', 'Exécution du contrat'],
            ['Données de navigation', "Amélioration de l'app (anonymisées)", 'Intérêt légitime'],
            ['Identifiant appareil', 'Notifications push, sécurité', 'Intérêt légitime'],
          ]} />
        </Section>

        <Section title="3. Données que nous ne collectons PAS">
          <p>CHAIR ne collecte jamais :</p>
          <ul className="space-y-1.5 list-none">
            <Li>Données bancaires ou de carte de crédit (traitées par l'App Store uniquement)</Li>
            <Li>Données biométriques (empreintes, Face ID — utilisés uniquement par votre OS)</Li>
            <Li>Contacts de votre téléphone</Li>
            <Li>Historique de navigation externe à l'application</Li>
            <Li>Données de santé</Li>
            <Li>Données de localisation en arrière-plan en continu</Li>
          </ul>
        </Section>

        <Section title="4. Géolocalisation">
          <p>
            CHAIR utilise votre position GPS <strong className="text-neutral-800">uniquement lorsque vous l'autorisez explicitement</strong>,
            et uniquement pour afficher les coiffeurs proches de vous dans la recherche.
          </p>
          <ul className="space-y-1.5 list-none">
            <Li>La géolocalisation est demandée en premier plan (pas en arrière-plan)</Li>
            <Li>Votre position n'est jamais partagée avec d'autres utilisateurs</Li>
            <Li>Votre position n'est jamais vendue à des tiers</Li>
            <Li>Vous pouvez révoquer cette autorisation à tout moment dans les réglages de votre appareil</Li>
            <Li>Sans autorisation, CHAIR fonctionne normalement avec une recherche par ville</Li>
          </ul>
        </Section>

        <Section title="5. Partage des données">
          <p>
            CHAIR <strong className="text-neutral-800">ne vend jamais vos données</strong> à des tiers.
            Vos données peuvent être partagées uniquement avec :
          </p>
          <div className="overflow-x-auto rounded-xl border border-neutral-100 mt-2">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-left px-3 py-2.5 font-semibold text-neutral-700">Sous-traitant</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-neutral-700">Rôle</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-neutral-700">Localisation</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ['Hébergeur serveurs', 'Stockage et traitement des données', 'Union Européenne'],
                  ['Cloudinary (optionnel)', 'Stockage photos/vidéos', 'USA (CCT UE-USA)'],
                  ['Apple Inc.', 'Distribution App Store, achats in-app', 'USA (Privacy Shield)'],
                ] as [string, string, string][]).map(([d, f, b], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                    <td className="px-3 py-2.5 text-neutral-700 font-medium">{d}</td>
                    <td className="px-3 py-2.5 text-neutral-500">{f}</td>
                    <td className="px-3 py-2.5 text-neutral-400">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-neutral-400 mt-2">
            CCT = Clauses Contractuelles Types approuvées par la Commission Européenne.
          </p>
        </Section>

        <Section title="6. Durée de conservation">
          <ul className="space-y-1.5 list-none">
            <Li><strong className="text-neutral-700">Compte actif :</strong> données conservées tant que le compte existe</Li>
            <Li><strong className="text-neutral-700">Après suppression du compte :</strong> suppression définitive sous 30 jours</Li>
            <Li><strong className="text-neutral-700">Avis anonymisés :</strong> peuvent être conservés sans données personnelles pour préserver l'intégrité des évaluations</Li>
            <Li><strong className="text-neutral-700">Données de facturation :</strong> 10 ans (obligation légale française)</Li>
            <Li><strong className="text-neutral-700">Logs de sécurité :</strong> 12 mois maximum</Li>
          </ul>
        </Section>

        <Section title="7. Sécurité des données">
          <p>CHAIR met en œuvre des mesures techniques et organisationnelles pour protéger vos données :</p>
          <ul className="space-y-1.5 list-none">
            <Li>Chiffrement des mots de passe (bcrypt)</Li>
            <Li>Connexions HTTPS/TLS uniquement</Li>
            <Li>Accès aux données restreint au personnel autorisé</Li>
            <Li>Tokens d'authentification sécurisés (Sanctum / Bearer tokens)</Li>
            <Li>Aucun stockage de données sensibles côté client (hors token chiffré)</Li>
          </ul>
          <p>
            En cas de violation de données, vous serez notifié dans les 72h conformément au RGPD.
          </p>
        </Section>

        <Section title="8. Vos droits (RGPD)">
          <p>Conformément au RGPD, vous disposez des droits suivants, exerçables à tout moment :</p>
          <ul className="space-y-2 list-none">
            <Li><strong className="text-neutral-700">Droit d'accès :</strong> obtenir une copie de toutes vos données</Li>
            <Li><strong className="text-neutral-700">Droit de rectification :</strong> corriger des données inexactes</Li>
            <Li><strong className="text-neutral-700">Droit à l'effacement :</strong> supprimer votre compte et vos données</Li>
            <Li><strong className="text-neutral-700">Droit à la portabilité :</strong> recevoir vos données dans un format lisible (JSON/CSV)</Li>
            <Li><strong className="text-neutral-700">Droit d'opposition :</strong> vous opposer à certains traitements</Li>
            <Li><strong className="text-neutral-700">Droit de limitation :</strong> restreindre temporairement le traitement</Li>
            <Li><strong className="text-neutral-700">Droit de retrait du consentement :</strong> à tout moment pour les traitements basés sur votre consentement</Li>
          </ul>
          <div className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-100 mt-3">
            <p className="font-semibold text-neutral-800 text-[13px] mb-1">Pour exercer vos droits :</p>
            <p>Email : <a href="mailto:hello@getchair.app" className="underline">hello@getchair.app</a></p>
            <p className="text-neutral-400 mt-1 text-[12px]">Réponse garantie sous 30 jours. Une pièce d'identité pourra être demandée.</p>
          </div>
          <p>
            Vous avez également le droit d'introduire une réclamation auprès de la{' '}
            <strong className="text-neutral-700">CNIL</strong> :{' '}
            <a href="https://www.cnil.fr" className="underline" target="_blank" rel="noopener noreferrer">cnil.fr</a>
          </p>
        </Section>

        <Section title="9. Suppression de compte">
          <p>
            Vous pouvez supprimer votre compte à tout moment, directement depuis l'application :
            <strong className="text-neutral-800"> Compte → Paramètres → Supprimer mon compte</strong>.
          </p>
          <p>
            Vous pouvez également en faire la demande par email à{' '}
            <a href="mailto:hello@getchair.app" className="underline">hello@getchair.app</a>.
            La suppression est traitée dans un délai de 30 jours.
          </p>
        </Section>

        <Section title="10. Mineurs (COPPA / Protection des mineurs)">
          <p>
            CHAIR est destiné aux personnes de <strong className="text-neutral-800">13 ans et plus</strong>.
            Nous ne collectons pas sciemment de données personnelles d'enfants de moins de 13 ans.
          </p>
          <p>
            Si vous êtes parent ou tuteur et pensez que votre enfant a créé un compte sur CHAIR,
            contactez-nous immédiatement à <a href="mailto:hello@getchair.app" className="underline">hello@getchair.app</a>.
            Nous supprimerons le compte et toutes les données associées dans les 48h.
          </p>
        </Section>

        <Section title="11. Cookies et stockage local">
          <p>
            CHAIR utilise le <strong className="text-neutral-800">stockage local (localStorage)</strong> de votre
            appareil uniquement pour :
          </p>
          <ul className="space-y-1.5 list-none">
            <Li>Maintenir votre session de connexion (token d'authentification)</Li>
            <Li>Mémoriser vos préférences de style (genre, intérêts — onboarding)</Li>
            <Li>Mettre en cache votre position GPS avec votre consentement (durée max : 24h)</Li>
            <Li>Sauvegarder vos recherches récentes (stocké uniquement sur votre appareil)</Li>
          </ul>
          <p>
            Nous n'utilisons <strong className="text-neutral-800">aucun cookie publicitaire</strong> ni tracker tiers
            (Google Analytics, Meta Pixel, etc.).
          </p>
        </Section>

        <Section title="12. Notifications push">
          <p>
            L'application peut vous envoyer des notifications push (nouveaux abonnés, rappels de RDV, avis reçus).
            Ces notifications sont soumises à votre autorisation explicite via votre appareil.
            Vous pouvez les désactiver à tout moment dans les réglages système ou dans l'application.
          </p>
        </Section>

        <Section title="13. Modifications de cette politique">
          <p>
            Nous pouvons mettre à jour cette politique pour refléter des évolutions légales ou fonctionnelles.
            En cas de modification substantielle, vous serez informé par notification dans l'application et/ou par email,
            au moins 15 jours avant l'entrée en vigueur des nouvelles dispositions.
          </p>
          <p>
            La version en vigueur est toujours disponible sur <a href="https://getchair.app/confidentialite" className="underline">getchair.app/confidentialite</a>.
          </p>
        </Section>

        <Section title="14. Contact et DPO">
          <ul className="space-y-1.5 list-none">
            <Li>Questions confidentialité : <a href="mailto:hello@getchair.app" className="underline">hello@getchair.app</a></Li>
            <Li>Contact général : <a href="mailto:hello@getchair.app" className="underline">hello@getchair.app</a></Li>
            <Li>Signalement abus : <a href="mailto:hello@getchair.app" className="underline">hello@getchair.app</a></Li>
            <Li>Délai de réponse : 72h ouvrées maximum</Li>
          </ul>
        </Section>

        <div className="border-t border-neutral-100 pt-6 mt-2">
          <div className="flex flex-wrap gap-4 text-[12px] text-neutral-400">
            <Link href="/cgu" className="hover:text-neutral-700 transition-colors underline">
              Conditions Générales d'Utilisation
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
