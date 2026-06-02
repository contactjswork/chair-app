import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';

export default function CGUPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-700 mb-6 inline-block">
          ← Retour
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Conditions Générales d'Utilisation</h1>
        <p className="text-xs text-neutral-400 mb-8">Dernière mise à jour : juin 2026</p>

        <div className="prose prose-neutral prose-sm max-w-none space-y-6 text-neutral-700">

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">1. Objet</h2>
            <p>
              CHAIR est une plateforme permettant aux professionnels de la coiffure de créer un profil,
              publier leurs réalisations et recevoir des avis certifiés. Les présentes CGU définissent les
              conditions d'accès et d'utilisation de la plateforme accessible à l'adresse getchair.app.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">2. Inscription</h2>
            <p>
              L'utilisation de CHAIR nécessite la création d'un compte. L'utilisateur s'engage à fournir
              des informations exactes et à maintenir son compte sécurisé. CHAIR se réserve le droit de
              suspendre tout compte en cas d'utilisation frauduleuse ou contraire aux présentes conditions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">3. Contenu</h2>
            <p>
              Les utilisateurs sont responsables du contenu qu'ils publient (photos, textes, avis).
              Il est interdit de publier du contenu offensant, faux, ou portant atteinte aux droits
              de tiers. CHAIR se réserve le droit de retirer tout contenu contraire à ces règles.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">4. Propriété intellectuelle</h2>
            <p>
              Le contenu publié sur CHAIR (photos, textes) reste la propriété de son auteur.
              En le publiant, l'utilisateur accorde à CHAIR une licence d'affichage sur la plateforme.
              La marque CHAIR et l'ensemble des éléments de la plateforme sont protégés par le droit
              de la propriété intellectuelle.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">5. Responsabilité</h2>
            <p>
              CHAIR agit en qualité d'hébergeur et ne peut être tenu responsable des contenus publiés
              par les utilisateurs. La plateforme est fournie en l'état, sans garantie de disponibilité
              continue. CHAIR ne peut être tenu responsable des rendez-vous pris en dehors de la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">6. Données personnelles</h2>
            <p>
              La collecte et le traitement des données personnelles sont décrits dans notre{' '}
              <Link href="/confidentialite" className="underline hover:text-neutral-900">
                Politique de confidentialité
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">7. Modification</h2>
            <p>
              CHAIR se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs
              seront informés de toute modification substantielle. La poursuite de l'utilisation de la
              plateforme vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">8. Contact</h2>
            <p>
              Pour toute question relative aux présentes CGU : contact@getchair.app
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
