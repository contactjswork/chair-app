import {
  Paintbrush, Scissors, Sparkles, Sun, User, Waves, Wind,
} from 'lucide-react';

/** Icônes partagées entre la modale de recherche, les filtres et les cartes
 *  résultat — un seul endroit à modifier si une icône de spécialité change. */
export function getSpecialtyIcon(slug: string, size = 16): React.ReactNode {
  const props = { size, strokeWidth: 1.7 };
  switch (slug) {
    case 'coupe-homme':          return <Scissors {...props} />;
    case 'barbe':                return <User {...props} />;
    case 'coupe-femme':          return <Scissors {...props} />;
    case 'couleur-balayage':     return <Paintbrush {...props} />;
    case 'texture-lissage':      return <Waves {...props} />;
    case 'boucles-curly':        return <Wind {...props} />;
    case 'afro-locks':           return <Sparkles {...props} />;
    case 'extensions':           return <Sparkles {...props} />;
    case 'evenementiel':         return <Sun {...props} />;
    case 'soins-transformation': return <Sparkles {...props} />;
    default:                     return <Scissors {...props} />;
  }
}
