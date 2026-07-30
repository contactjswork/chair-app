import { Trophy, Medal, Star, TrendingUp, type LucideIcon } from 'lucide-react';
import type { ApiSpecialtyHighlight } from '@/lib/types';

// "Pourquoi ce coiffeur est reconnu" — le client doit comprendre en 3
// secondes. Une carte par signal, le plus impressionnant en premier, jamais
// plus de 4 pour ne pas diluer l'effet. Une seule ligne par spécialité :
// on choisit le signal le plus fort (légende > top 3 local > expert > progression),
// pas tous en même temps.
type Highlight = {
  key: string;
  Icon: LucideIcon;
  label: string;
  visits: number;
  priority: number;
};

function bestSignalFor(h: ApiSpecialtyHighlight): Highlight | null {
  const name = h.specialty_name ?? 'cette spécialité';
  const visits = h.visits_count ?? 0;

  if (h.is_reference) {
    return { key: `${h.specialty_id}-ref`, Icon: Trophy, label: `Référence ${name}`, visits, priority: 100 };
  }
  // Échantillon minimum avant qu'un "Top X local" ait un sens — sinon "Top 1"
  // parmi 1 seul coiffeur de la ville paraîtrait impressionnant à tort.
  if (h.local_rank != null && h.local_rank <= 3 && (h.local_total ?? 0) >= 5) {
    return { key: `${h.specialty_id}-rank`, Icon: Medal, label: `Top ${h.local_rank} local en ${name}`, visits, priority: 80 };
  }
  if (h.level >= 3) {
    return { key: `${h.specialty_id}-expert`, Icon: Star, label: `Expert ${name}`, visits, priority: 60 };
  }
  if (h.fast_progress) {
    return { key: `${h.specialty_id}-progress`, Icon: TrendingUp, label: `Progression rapide en ${name}`, visits, priority: 40 };
  }
  return null;
}

export default function SpecialtyHighlights({ highlights }: { highlights: ApiSpecialtyHighlight[] }) {
  // Le détail complet reste dans CHAIR PRO — le profil public ne doit
  // montrer que le strict nécessaire pour comprendre "pourquoi ce coiffeur
  // est reconnu" en 3 secondes, jamais une liste exhaustive.
  const signals = highlights
    .map(bestSignalFor)
    .filter((h): h is Highlight => h !== null)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  if (signals.length === 0) return null;

  // Le signal le plus fort (référence, ou Top X local) passe en plein noir :
  // c'est le classement, il doit se lire comme une distinction et non comme
  // un attribut parmi d'autres. Trois pastilles grises identiques ne
  // hiérarchisaient rien — le client ne savait pas où regarder.
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {signals.map(({ key, Icon, label, visits }, i) => (
        <span
          key={key}
          className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full ${
            i === 0
              ? 'bg-neutral-900 text-white'
              : 'bg-white border border-neutral-200 text-neutral-700'
          }`}
        >
          <Icon size={12} className={i === 0 ? 'text-white' : 'text-neutral-400'} strokeWidth={2} />
          {label}
          {/* Preuve chiffrée à côté du signal — une distinction qualitative
              seule ("Expert") se discute, un nombre de visites vérifiées non. */}
          {visits > 0 && (
            <span className={`font-normal tabular-nums ${i === 0 ? 'text-white/60' : 'text-neutral-400'}`}>
              · {visits}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
