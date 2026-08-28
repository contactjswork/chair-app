import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { BlockedAccountsList } from '@/components/ui/BlockConfirmSheet';
import { SUPPORT_EMAIL, SUPPORT_MAILTO, MODERATION_DELAY } from '@/lib/contact';

/**
 * Règles de communauté — App Store Review Guideline 1.2 (UGC).
 *
 * Apple exige que l'app publie ce qu'elle interdit, comment on le signale et
 * comment nous joindre ("Published contact information so users can easily
 * reach you"). Cette page est le texte de référence lié depuis la feuille de
 * signalement, et porte aussi la gestion des comptes bloqués (le blocage doit
 * rester réversible sans repasser par la fiche de la personne).
 *
 * Le contenu reprend strictement les engagements déjà pris dans les CGU
 * (section 4 « Règles de conduite et contenu », section 5 « Avis », section 6
 * « Propriété intellectuelle ») — aucune règle nouvelle inventée ici.
 */

export const metadata = {
  title: 'Règles de communauté — CHAIR',
  description:
    "Ce que l'on peut publier sur CHAIR, ce qui est interdit, comment signaler un contenu et bloquer un compte.",
};

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    // scroll-mt : cible d'ancre (#comptes-bloques) — sans marge de défilement,
    // le titre passe sous le header collant de l'app.
    <section id={id} className="mb-8 scroll-mt-24">
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

export default function ReglesCommunautePage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-5 py-8 pb-28">

        <Link
          href="/app/compte"
          aria-label="Retour"
          className="inline-flex items-center justify-center w-11 h-11 -ml-3 text-neutral-400 hover:text-neutral-900 transition-colors mb-4"
        >
          <ChevronLeft size={20} />
        </Link>

        <div className="mb-8">
          <h1 className="text-[26px] font-bold text-neutral-900 mb-1">Règles de communauté</h1>
          <p className="text-[12px] text-neutral-400">
            Applicables à tous les contenus publiés sur CHAIR · Complètent les{' '}
            <Link href="/cgu" className="underline underline-offset-2">CGU</Link>
          </p>
        </div>

        <div className="bg-neutral-50 rounded-2xl px-5 py-4 mb-8 border border-neutral-100">
          <p className="text-[13px] text-neutral-600 leading-relaxed">
            CHAIR repose sur du contenu publié par ses membres : réalisations, biographies,
            avis après rendez-vous. Ces règles disent ce que tu peux publier, ce qui n&apos;a pas
            sa place ici, et ce qui se passe quand quelqu&apos;un ne les respecte pas.
          </p>
        </div>

        <Section title="1. Ce que tu peux publier">
          <ul className="space-y-1.5 list-none">
            <Li>Tes propres réalisations — photos et vidéos de coupes, colorations, coiffages que tu as réalisés</Li>
            <Li>Une biographie et une accroche qui décrivent honnêtement ton travail et ton parcours</Li>
            <Li>Des avis sincères, basés sur un rendez-vous que tu as réellement eu</Li>
            <Li>Des prestations et des tarifs exacts, réellement proposés</Li>
          </ul>
        </Section>

        <Section title="2. Ce qui est interdit">
          <p>Aucun contenu publié sur CHAIR ne doit être :</p>
          <ul className="space-y-1.5 list-none">
            <Li>Illégal, offensant, menaçant, harcelant ou diffamatoire</Li>
            <Li>Pornographique, sexuellement explicite, violent ou contraire aux bonnes mœurs</Li>
            <Li>Haineux ou discriminatoire — origine, sexe, orientation, religion, handicap</Li>
            <Li>Faux ou trompeur : faux avis, avis achetés, résultat truqué, usurpation d&apos;identité</Li>
            <Li>Publicitaire non sollicité, répétitif ou hors sujet (spam)</Li>
            <Li>Porteur d&apos;un virus, d&apos;un maliciel ou de tout code malveillant</Li>
            <Li>
              Publié sans en détenir les droits — photo prise par quelqu&apos;un d&apos;autre, image
              trouvée en ligne, travail d&apos;un confrère présenté comme le tien
            </Li>
          </ul>
        </Section>

        <Section title="3. Droit à l'image des personnes photographiées">
          <p>
            Une réalisation montre presque toujours une personne réelle. Avant de publier la
            photo ou la vidéo d&apos;un client sur CHAIR, tu dois avoir obtenu son accord —
            explicitement, et pour une diffusion publique.
          </p>
          <ul className="space-y-1.5 list-none">
            <Li>Pas de publication d&apos;un mineur sans l&apos;accord de son représentant légal</Li>
            <Li>Pas de nom, de numéro ou d&apos;information privée d&apos;un client dans une légende</Li>
            <Li>
              Toute personne reconnaissable peut demander le retrait d&apos;une photo la
              représentant en nous écrivant à{' '}
              <a href={SUPPORT_MAILTO} className="underline underline-offset-2">{SUPPORT_EMAIL}</a>
            </Li>
          </ul>
        </Section>

        <Section title="4. Propriété intellectuelle">
          <p>
            Les contenus que tu publies restent ta propriété. En les publiant, tu accordes à
            CHAIR la licence décrite à l&apos;article 6 des{' '}
            <Link href="/cgu" className="underline underline-offset-2">CGU</Link> pour les
            afficher sur la plateforme.
          </p>
          <p>
            Publier le travail de quelqu&apos;un d&apos;autre comme le tien est une atteinte à ses
            droits. Si tu estimes qu&apos;un contenu reprend le tien sans autorisation, signale-le
            avec le motif « Propriété intellectuelle » : nous traitons ces demandes en priorité.
          </p>
        </Section>

        <Section title="5. Avis">
          <p>
            Un avis se laisse après un rendez-vous pris sur CHAIR. Quand la visite a été
            confirmée sur place par le QR code du coiffeur, l’avis porte en plus la mention
            « visite vérifiée ». Un avis doit porter sur ta propre expérience, dans
            un langage correct, sans attaque personnelle ni information privée.
          </p>
          <p>
            Un coiffeur qui reçoit un avis abusif peut le signaler ; il sera examiné par notre
            équipe au même titre que tout autre contenu.
          </p>
        </Section>

        <Section title="6. Signaler un contenu">
          <p>
            Chaque réalisation, chaque avis, chaque fiche coiffeur et chaque salon porte un
            bouton « … » qui ouvre l&apos;option <strong className="text-neutral-800">Signaler</strong>.
            Choisis un motif, ajoute des détails si tu le souhaites, et envoie.
          </p>
          <ul className="space-y-1.5 list-none">
            <Li>Ton signalement est confidentiel : la personne concernée n&apos;en est pas informée</Li>
            <Li>Tout contenu signalé est examiné par notre équipe {MODERATION_DELAY}</Li>
            <Li>
              Tu peux aussi nous écrire directement à{' '}
              <a href={SUPPORT_MAILTO} className="underline underline-offset-2">{SUPPORT_EMAIL}</a>{' '}
              ou via la page{' '}
              <Link href="/contact" className="underline underline-offset-2">Contact</Link>
            </Li>
          </ul>
        </Section>

        <Section title="7. Bloquer un compte">
          <p>
            Depuis une fiche coiffeur ou une réalisation, l&apos;option{' '}
            <strong className="text-neutral-800">Bloquer</strong> retire immédiatement ce compte
            de ton fil, de tes suggestions, de la recherche et de l&apos;autocomplétion. La
            personne bloquée n&apos;en est pas informée, et tu peux revenir sur ta décision à
            tout moment ci-dessous ou depuis Compte&nbsp;→&nbsp;Sécurité.
          </p>
          <p>
            Sa fiche reste atteignable si tu ouvres son lien directement : CHAIR est un annuaire
            professionnel, un lien partagé ne doit pas se briser.
          </p>
          <p className="text-neutral-400">
            Le blocage est une préférence personnelle : il ne retire pas le contenu pour les
            autres. Si un contenu enfreint ces règles, signale-le également.
          </p>
        </Section>

        <Section title="8. Ce que nous faisons en cas de manquement">
          <ul className="space-y-1.5 list-none">
            <Li>Retrait du contenu concerné</Li>
            <Li>Avertissement adressé au compte</Li>
            <Li>Suspension du compte en cas de manquement grave ou répété</Li>
            <Li>Signalement aux autorités compétentes lorsque la loi l&apos;impose</Li>
          </ul>
          <p>
            CHAIR agit en qualité d&apos;hébergeur au sens de la LCEN : nous retirons promptement
            tout contenu manifestement illicite porté à notre connaissance.
          </p>
        </Section>

        <Section id="comptes-bloques" title="9. Comptes que tu as bloqués">
          <BlockedAccountsList />
        </Section>

        <Section title="10. Nous joindre">
          <ul className="space-y-1.5 list-none">
            <Li>
              Email :{' '}
              <a href={SUPPORT_MAILTO} className="underline underline-offset-2">{SUPPORT_EMAIL}</a>
            </Li>
            <Li>
              Formulaire : <Link href="/contact" className="underline underline-offset-2">getchair.app/contact</Link>
            </Li>
            <Li>
              Documents liés : <Link href="/cgu" className="underline underline-offset-2">CGU</Link> ·{' '}
              <Link href="/confidentialite" className="underline underline-offset-2">Confidentialité</Link> ·{' '}
              <Link href="/mentions-legales" className="underline underline-offset-2">Mentions légales</Link>
            </Li>
          </ul>
        </Section>

      </div>
    </AppShell>
  );
}
