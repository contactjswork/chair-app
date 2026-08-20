// ── Partage centralisé ────────────────────────────────────────────────
//
// Toutes les surfaces de partage (feed, page réalisation, profil public,
// parrainage, onboardings, badges) génèrent leur contenu ici — plus aucun
// texte de partage en dur dupliqué dans les composants.
//
// Règles :
//  - Les URLs sont fournies par la surface appelante et repassées telles
//    quelles (deep links existants EXACTS — ce module ne fabrique aucune URL).
//  - Les emoji sont autorisés dans les TEXTES de partage sortants (jamais
//    dans l'UI) mais sobres : au plus un par message.
//  - La mécanique d'envoi (Web Share API + repli clipboard / ShareSheet)
//    reste dans les composants — ici on ne génère que { title, text, url }.

export type SharePayloadType =
  | 'post'                // réalisation (feed, page réalisation)
  | 'hairdresser-profile' // profil coiffeur partagé par un CLIENT
  | 'own-profile'         // profil partagé par le COIFFEUR lui-même
  | 'salon'               // fiche salon
  | 'referral'            // lien de parrainage
  | 'badge';              // badge débloqué (modal de célébration)

export interface ShareEntity {
  /** Deep link existant, repassé tel quel (ex: getchair.app/realisation/42). */
  url?: string;
  /** Nom du coiffeur / salon / badge selon le type. */
  name?: string;
  /** Description de la réalisation (type 'post'). */
  description?: string;
  /** Tagline du coiffeur (type 'own-profile') — même personnalisation que l'onboarding pro. */
  tagline?: string;
  /** Ville (profil / salon). */
  city?: string;
}

export interface ShareContext {
  /** Parrainage : le message diffère selon que l'invitant est client ou coiffeur. */
  audience?: 'client' | 'pro';
}

export interface SharePayload {
  title: string;
  text: string;
  url: string;
}

export function getSharePayload(
  type: SharePayloadType,
  entity: ShareEntity = {},
  context: ShareContext = {},
): SharePayload {
  const { url = '', name, description, tagline, city } = entity;

  switch (type) {
    case 'post': {
      // Ton "recommandation de contenu" — on parle du travail du coiffeur.
      const base = name
        ? `Regarde cette réalisation de ${name} sur CHAIR ✂️`
        : 'Regarde cette réalisation sur CHAIR ✂️';
      return {
        title: name ? `${name} sur CHAIR` : 'Réalisation sur CHAIR',
        text: description ? `${base}\n« ${description} »` : base,
        url,
      };
    }

    case 'hairdresser-profile': {
      // Un client recommande un coiffeur → incitation à découvrir/réserver.
      const who = name ?? 'ce coiffeur';
      return {
        title: name ? `${name} sur CHAIR` : 'Coiffeur sur CHAIR',
        text: `J'ai trouvé ${who}${city ? ` à ${city}` : ''} sur CHAIR — regarde son travail et réserve en quelques secondes.`,
        url,
      };
    }

    case 'own-profile': {
      // Le coiffeur partage son propre profil → ton pro, personnalisé avec la
      // tagline (ou "Nom, coiffeur" en repli) comme le faisait l'onboarding.
      const signature = tagline?.trim() || (name ? `${name}, coiffeur` : 'coiffeur');
      return {
        title: name ? `${name} — CHAIR` : 'Mon profil CHAIR',
        text: `Retrouvez-moi sur CHAIR — ${signature}. Réservez votre prochain rendez-vous en quelques secondes.`,
        url,
      };
    }

    case 'salon': {
      const salonName = name ?? 'ce salon';
      return {
        title: name ? `${name} sur CHAIR` : 'Salon sur CHAIR',
        text: `Découvre ${salonName}${city ? ` à ${city}` : ''} sur CHAIR — ses coiffeurs, leurs réalisations et les avis certifiés.`,
        url,
      };
    }

    case 'referral':
      // Messages historiques conservés à l'identique (le code de parrainage
      // vit dans l'URL — getchair.app/parrainage/CODE).
      return context.audience === 'pro'
        ? {
            title: 'Partager mon profil',
            text: "Rejoignez-moi sur CHAIR, l'app qui met en avant les coiffeurs !",
            url,
          }
        : {
            title: 'Inviter un ami',
            text: "Découvre CHAIR, l'app pour trouver les meilleurs coiffeurs près de toi !",
            url,
          };

    case 'badge': {
      // Texte historique du BadgeUnlockModal conservé (pas d'URL aujourd'hui).
      const text = `Nouveau badge débloqué sur CHAIR : ${name ?? ''}`.trim();
      return { title: text, text, url };
    }
  }
}
