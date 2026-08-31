// ── Services suggérés par spécialité ─────────────────────────────────
//
// Le formulaire vide était le vrai problème de « Mes services » : face à
// « Nom du service », le coiffeur ne sait pas quoi écrire, ni à quelle
// granularité. Ces suggestions (nom métier + durée usuelle) transforment
// la création en un geste : toucher, mettre son prix, c'est en ligne.
//
// Clé = slug de la spécialité (stable, la vitrine des noms peut changer
// en admin sans casser ici). Une spécialité absente de la table affiche
// simplement le champ libre — jamais bloquant.

export interface ServiceSuggestion {
  name: string;
  duration: number;
}

export const SERVICE_SUGGESTIONS: Record<string, ServiceSuggestion[]> = {
  'coupe-homme': [
    { name: 'Coupe homme', duration: 30 },
    { name: 'Coupe + barbe', duration: 45 },
    { name: 'Coupe enfant (-12 ans)', duration: 30 },
    { name: 'Coupe étudiant', duration: 30 },
  ],
  'barber': [
    { name: 'Dégradé américain', duration: 30 },
    { name: 'Skin fade', duration: 45 },
    { name: 'Dégradé + barbe', duration: 60 },
    { name: 'Contours + finitions', duration: 15 },
  ],
  'taper': [
    { name: 'Taper classique', duration: 30 },
    { name: 'Taper + contours', duration: 45 },
  ],
  'fade': [
    { name: 'Mid fade', duration: 30 },
    { name: 'High fade', duration: 30 },
    { name: 'Fade + barbe', duration: 60 },
  ],
  'degrade': [
    { name: 'Dégradé classique', duration: 30 },
    { name: 'Dégradé + barbe', duration: 45 },
  ],
  'buzz-cut': [
    { name: 'Buzz cut', duration: 20 },
  ],
  'barbe': [
    { name: 'Taille de barbe', duration: 20 },
    { name: 'Barbe + contours au rasoir', duration: 30 },
    { name: 'Rasage traditionnel', duration: 30 },
  ],
  'couleur-homme': [
    { name: 'Coloration homme', duration: 45 },
    { name: 'Décoloration', duration: 90 },
    { name: 'Motif créatif', duration: 60 },
  ],
  'afro-locks': [
    { name: 'Départ de locks', duration: 120 },
    { name: 'Entretien locks', duration: 90 },
    { name: 'Twists', duration: 90 },
    { name: 'Nattes collées', duration: 120 },
  ],
  'coupe-longue': [
    { name: 'Coupe cheveux longs', duration: 45 },
    { name: 'Coupe + soin', duration: 60 },
  ],
  'coupe-femme': [
    { name: 'Coupe femme', duration: 45 },
    { name: 'Coupe + brushing', duration: 60 },
    { name: 'Frange', duration: 15 },
    { name: 'Coupe transformation', duration: 90 },
  ],
  'coupe-courte': [
    { name: 'Coupe courte', duration: 45 },
    { name: 'Pixie cut', duration: 45 },
  ],
  'couleur-balayage': [
    { name: 'Balayage complet', duration: 150 },
    { name: 'Balayage + patine', duration: 180 },
    { name: 'Retouche balayage', duration: 120 },
  ],
  'blond': [
    { name: 'Blond polaire', duration: 180 },
    { name: 'Décoloration + patine', duration: 150 },
    { name: 'Retouche racines', duration: 90 },
  ],
  'coloration': [
    { name: 'Coloration complète', duration: 90 },
    { name: 'Couleur fantaisie', duration: 120 },
    { name: 'Patine', duration: 45 },
  ],
  'ombre-hair': [
    { name: 'Ombré hair', duration: 150 },
    { name: 'Retouche ombré', duration: 90 },
  ],
  'tie-dye': [
    { name: 'Tie & dye', duration: 120 },
  ],
  'roux': [
    { name: 'Coloration cuivrée', duration: 90 },
  ],
  'boucles-curly': [
    { name: 'Coupe sur cheveux bouclés', duration: 60 },
    { name: 'Définition de boucles', duration: 45 },
    { name: 'Soin boucles', duration: 30 },
  ],
  'extensions': [
    { name: "Pose d'extensions", duration: 120 },
    { name: 'Entretien extensions', duration: 90 },
    { name: 'Dépose', duration: 60 },
  ],
  'texture-lissage': [
    { name: 'Lissage brésilien', duration: 120 },
    { name: 'Lissage français', duration: 90 },
  ],
  'keratine': [
    { name: 'Soin kératine', duration: 90 },
  ],
  'ondulations': [
    { name: 'Ondulations wavy', duration: 45 },
  ],
  'frange': [
    { name: 'Frange sur mesure', duration: 20 },
    { name: 'Frange rideau', duration: 20 },
  ],
  'evenementiel': [
    { name: 'Coiffure de mariée', duration: 90 },
    { name: 'Chignon de soirée', duration: 60 },
    { name: 'Essai coiffure', duration: 60 },
  ],
  'chignon': [
    { name: 'Chignon de soirée', duration: 60 },
    { name: 'Chignon mariage', duration: 90 },
  ],
  'coiffure-soiree': [
    { name: 'Coiffure de soirée', duration: 60 },
  ],
  'hair-contouring': [
    { name: 'Hair contouring', duration: 120 },
  ],
  'soins-transformation': [
    { name: 'Soin profond', duration: 45 },
    { name: 'Transformation complète', duration: 120 },
  ],
};

export function suggestionsFor(slug: string | undefined | null): ServiceSuggestion[] {
  if (!slug) return [];
  return SERVICE_SUGGESTIONS[slug] ?? [];
}
