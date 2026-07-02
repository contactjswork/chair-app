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

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 py-10">

        {/* Header */}
        <Link href="/app/compte" className="inline-flex items-center justify-center w-8 h-8 text-neutral-400 hover:text-neutral-900 transition-colors mb-6">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </Link>

        <div className="mb-8">
          <h1 className="text-[26px] font-bold text-neutral-900 mb-1">Conditions Générales d'Utilisation</h1>
          <p className="text-[12px] text-neutral-400">Dernière mise à jour : 1er juillet 2026 · Version 1.0</p>
        </div>

        <div className="bg-neutral-50 rounded-2xl px-5 py-4 mb-8 border border-neutral-100">
          <p className="text-[13px] text-neutral-600 leading-relaxed">
            En utilisant CHAIR (application mobile et site web), vous acceptez les présentes Conditions Générales d'Utilisation.
            Lisez-les attentivement avant de créer un compte. Si vous n'acceptez pas ces conditions, n'utilisez pas CHAIR.
          </p>
        </div>

        <Section title="1. Qui sommes-nous ?">
          <p>
            CHAIR est une plateforme de mise en relation entre clients et professionnels de la coiffure,
            basée en France.
          </p>
          <ul className="space-y-1.5 list-none mt-2">
            <Li>Site web : <a href="https://getchair.app" className="underline">getchair.app</a></Li>
            <Li>Application mobile : CHAIR (disponible sur l'App Store)</Li>
            <Li>Contact : <a href="mailto:hello@getchair.app" className="underline">hello@getchair.app</a></Li>
          </ul>
        </Section>

        <Section title="2. Accès et inscription">
          <p>
            L'accès à CHAIR est ouvert à toute personne physique majeure (18 ans ou plus) ou mineure avec autorisation parentale.
            L'inscription est gratuite pour les clients. Un abonnement professionnel est requis pour les coiffeurs souhaitant
            accéder à toutes les fonctionnalités.
          </p>
          <p>
            En créant un compte, vous vous engagez à :
          </p>
          <ul className="space-y-1.5 list-none">
            <Li>Fournir des informations exactes, complètes et à jour</Li>
            <Li>Maintenir la confidentialité de votre mot de passe</Li>
            <Li>Ne pas créer plusieurs comptes ou usurper l'identité d'un tiers</Li>
            <Li>Nous notifier immédiatement en cas d'accès non autorisé à votre compte</Li>
          </ul>
          <p>
            CHAIR se réserve le droit de suspendre ou supprimer tout compte sans préavis en cas de violation des présentes CGU.
          </p>
        </Section>

        <Section title="3. Fonctionnalités de la plateforme">
          <p><strong className="text-neutral-800">Pour les clients :</strong></p>
          <ul className="space-y-1.5 list-none mb-3">
            <Li>Découvrir des coiffeurs près de vous grâce à la géolocalisation</Li>
            <Li>Consulter les réalisations, avis et profils des coiffeurs</Li>
            <Li>Sauvegarder vos coiffeurs favoris et vous y abonner</Li>
            <Li>Réserver des rendez-vous (fonctionnalité en cours de déploiement)</Li>
            <Li>Laisser des avis certifiés après un rendez-vous</Li>
          </ul>
          <p><strong className="text-neutral-800">Pour les coiffeurs / salons :</strong></p>
          <ul className="space-y-1.5 list-none">
            <Li>Créer et gérer un profil professionnel</Li>
            <Li>Publier des réalisations (photos/vidéos)</Li>
            <Li>Recevoir et gérer des réservations</Li>
            <Li>Obtenir des avis clients certifiés via QR code</Li>
            <Li>Accéder à des statistiques de performance</Li>
          </ul>
        </Section>

        <Section title="4. Règles de conduite et contenu">
          <p>
            Tous les utilisateurs s'engagent à ne pas publier, envoyer ou transmettre de contenu :
          </p>
          <ul className="space-y-1.5 list-none">
            <Li>Illégal, offensant, menaçant, harcelant ou diffamatoire</Li>
            <Li>Pornographique, violent ou contraire aux bonnes mœurs</Li>
            <Li>Portant atteinte aux droits de propriété intellectuelle de tiers</Li>
            <Li>Comportant des informations fausses ou trompeuses (faux avis notamment)</Li>
            <Li>Contenant des virus, malwares ou tout code malveillant</Li>
            <Li>À caractère publicitaire non autorisé (spam)</Li>
          </ul>
          <p>
            CHAIR applique une politique de modération active. Tout contenu signalé sera examiné sous 72h.
            En cas de violation grave ou répétée, le compte sera définitivement suspendu.
          </p>
        </Section>

        <Section title="5. Avis et évaluations">
          <p>
            Le système d'avis de CHAIR est basé sur des <strong className="text-neutral-800">avis certifiés</strong> :
            seuls les clients ayant effectué un rendez-vous vérifié (via QR code unique) peuvent laisser un avis.
          </p>
          <ul className="space-y-1.5 list-none">
            <Li>Les avis doivent être sincères, honnêtes et basés sur votre expérience réelle</Li>
            <Li>La manipulation des avis (faux avis, avis achetés) est strictement interdite et entraîne la suspension du compte</Li>
            <Li>Un coiffeur peut signaler un avis abusif, qui sera alors examiné par notre équipe</Li>
            <Li>Les avis sont publics et peuvent être consultés par tous les utilisateurs</Li>
          </ul>
        </Section>

        <Section title="6. Propriété intellectuelle">
          <p>
            <strong className="text-neutral-800">Vos contenus :</strong> Les photos, vidéos et textes que vous publiez sur CHAIR
            restent votre propriété. En les publiant, vous accordez à CHAIR une licence mondiale, non exclusive, gratuite
            et transférable pour afficher, reproduire et distribuer votre contenu sur la plateforme et à des fins promotionnelles
            liées à CHAIR (réseaux sociaux, marketing).
          </p>
          <p>
            <strong className="text-neutral-800">Notre plateforme :</strong> La marque CHAIR, le logo, le design, le code source
            et tous les éléments de la plateforme sont la propriété exclusive de CHAIR et protégés par les lois sur la
            propriété intellectuelle. Toute reproduction sans autorisation est interdite.
          </p>
        </Section>

        <Section title="7. Réservations et paiements">
          <p>
            La fonctionnalité de réservation en ligne est en cours de déploiement. Lorsqu'elle sera disponible :
          </p>
          <ul className="space-y-1.5 list-none">
            <Li>Les rendez-vous sont conclus directement entre le client et le coiffeur</Li>
            <Li>CHAIR agit comme intermédiaire technique et n'est pas partie au contrat de prestation</Li>
            <Li>Les annulations et remboursements sont soumis à la politique de chaque prestataire</Li>
            <Li>En cas de litige, CHAIR peut intervenir en médiation sans y être tenu</Li>
          </ul>
          <p>
            <strong className="text-neutral-800">Achats in-app :</strong> Si l'application propose des fonctionnalités payantes
            (abonnements professionnels), les achats sont traités via l'App Store d'Apple conformément aux conditions d'Apple.
            Les remboursements in-app sont soumis à la politique de remboursement d'Apple.
          </p>
        </Section>

        <Section title="8. Suppression de compte">
          <p>
            Vous pouvez supprimer votre compte à tout moment depuis les paramètres de l'application
            (<em>Compte → Paramètres → Supprimer mon compte</em>) ou en envoyant un email à{' '}
            <a href="mailto:hello@getchair.app" className="underline">hello@getchair.app</a>.
          </p>
          <p>
            La suppression est effective dans un délai de 30 jours. Vos données personnelles seront effacées
            conformément à notre Politique de confidentialité. Les avis publiés peuvent être conservés de façon
            anonymisée pour préserver l'intégrité de la plateforme.
          </p>
        </Section>

        <Section title="9. Limitation de responsabilité">
          <p>
            CHAIR est une plateforme de mise en relation et agit en qualité d'hébergeur au sens de la loi pour
            la confiance dans l'économie numérique (LCEN). À ce titre, CHAIR n'est pas responsable des contenus
            publiés par les utilisateurs.
          </p>
          <ul className="space-y-1.5 list-none">
            <Li>CHAIR ne garantit pas la disponibilité continue de la plateforme (maintenance, pannes)</Li>
            <Li>CHAIR n'est pas responsable des interactions entre clients et coiffeurs en dehors de la plateforme</Li>
            <Li>CHAIR ne vérifie pas les diplômes ou qualifications des coiffeurs inscrits</Li>
            <Li>La responsabilité de CHAIR est limitée au montant éventuellement payé pour l'abonnement</Li>
          </ul>
        </Section>

        <Section title="10. Disponibilité et modifications">
          <p>
            CHAIR peut modifier, suspendre ou interrompre tout ou partie de ses services à tout moment,
            notamment pour des opérations de maintenance. Nous nous efforçons d'en informer les utilisateurs
            avec un préavis raisonnable.
          </p>
          <p>
            Les présentes CGU peuvent être modifiées. En cas de modification substantielle, vous serez informé
            par notification dans l'application et/ou par email. La poursuite de l'utilisation vaut acceptation.
          </p>
        </Section>

        <Section title="11. Droit applicable et litiges">
          <p>
            Les présentes CGU sont régies par le droit français. En cas de litige, une solution amiable sera
            recherchée en priorité. À défaut, les tribunaux français seront seuls compétents.
          </p>
          <p>
            Conformément à la réglementation européenne, vous pouvez accéder à la plateforme de règlement
            en ligne des litiges :{' '}
            <a href="https://ec.europa.eu/consumers/odr" className="underline" target="_blank" rel="noopener noreferrer">
              ec.europa.eu/consumers/odr
            </a>
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Pour toute question relative aux présentes CGU ou pour exercer vos droits :
          </p>
          <ul className="space-y-1.5 list-none">
            <Li>Email : <a href="mailto:hello@getchair.app" className="underline">hello@getchair.app</a></Li>
            <Li>Réponse garantie sous 72 heures ouvrées</Li>
          </ul>
        </Section>

        <div className="border-t border-neutral-100 pt-6 mt-2">
          <div className="flex flex-wrap gap-4 text-[12px] text-neutral-400">
            <Link href="/confidentialite" className="hover:text-neutral-700 transition-colors underline">
              Politique de confidentialité
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
