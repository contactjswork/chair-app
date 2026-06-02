import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';

export default function ConfidentialitePage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-700 mb-6 inline-block">
          ← Retour
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Politique de Confidentialité</h1>
        <p className="text-xs text-neutral-400 mb-8">Dernière mise à jour : juin 2026</p>

        <div className="space-y-6 text-sm text-neutral-700">

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données est CHAIR (contact@getchair.app).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">2. Données collectées</h2>
            <p className="mb-2">Lors de l'inscription et de l'utilisation de CHAIR, nous collectons :</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600">
              <li>Nom, adresse email, ville (obligatoires à l'inscription)</li>
              <li>Photo de profil et bannière (optionnelles)</li>
              <li>Contenu publié : réalisations, avis, services</li>
              <li>Données de navigation (pages visitées, durée de session)</li>
              <li>Localisation approximative (si vous l'autorisez)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">3. Finalités du traitement</h2>
            <p className="mb-2">Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600">
              <li>Créer et gérer votre compte</li>
              <li>Afficher votre profil aux clients</li>
              <li>Améliorer les résultats de recherche et les recommandations</li>
              <li>Envoyer des notifications liées à vos rendez-vous</li>
              <li>Améliorer la plateforme (données anonymisées)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">4. Base légale</h2>
            <p>
              Le traitement est fondé sur l'exécution du contrat (votre utilisation de CHAIR)
              et votre consentement pour les données optionnelles (géolocalisation, notifications push).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">5. Conservation</h2>
            <p>
              Vos données sont conservées tant que votre compte est actif. En cas de suppression
              de compte, vos données sont effacées dans un délai de 30 jours, sauf obligation légale.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">6. Vos droits</h2>
            <p className="mb-2">Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600">
              <li>Droit d'accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement ("droit à l'oubli")</li>
              <li>Droit à la portabilité des données</li>
              <li>Droit d'opposition au traitement</li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits : contact@getchair.app
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">7. Hébergement et sous-traitants</h2>
            <p>
              Les données sont hébergées sur des serveurs sécurisés. Les photos sont stockées
              via Cloudinary (US). Les transferts hors UE sont encadrés par les clauses contractuelles types.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">8. Cookies</h2>
            <p>
              CHAIR utilise uniquement des cookies strictement nécessaires au fonctionnement
              (authentification). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">9. Contact</h2>
            <p>
              Pour toute question sur vos données : contact@getchair.app
            </p>
            <p className="mt-1">
              Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).
            </p>
          </section>

        </div>
      </div>
    </AppShell>
  );
}
