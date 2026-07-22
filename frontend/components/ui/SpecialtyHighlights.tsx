import type { ApiSpecialtyHighlight } from '@/lib/types';

// "Pourquoi ce coiffeur est reconnu" — le client doit comprendre en 3
// secondes. Une carte par signal, le plus impressionnant en premier, jamais
// plus de 4 pour ne pas diluer l'effet. Une seule ligne par spécialité :
// on choisit le signal le plus fort (légende > top 3 local > expert > progression),
// pas tous en même temps.
type Highlight = {
  key: string;
  icon: string;
  label: string;
  priority: number;
};

function bestSignalFor(h: ApiSpecialtyHighlight): Highlight | null {
  const name = h.specialty_name ?? 'cette spécialité';

  if (h.is_reference) {
    return { key: `${h.specialty_id}-ref`, icon: '🏆', label: `Référence ${name}`, priority: 100 };
  }
  // Échantillon minimum avant qu'un "Top X local" ait un sens — sinon "Top 1"
  // parmi 1 seul coiffeur de la ville paraîtrait impressionnant à tort.
  if (h.local_rank != null && h.local_rank <= 3 && (h.local_total ?? 0) >= 5) {
    return { key: `${h.specialty_id}-rank`, icon: '🥇', label: `Top ${h.local_rank} local en ${name}`, priority: 80 };
  }
  if (h.level >= 3) {
    return { key: `${h.specialty_id}-expert`, icon: '⭐', label: `Expert ${name}`, priority: 60 };
  }
  if (h.fast_progress) {
    return { key: `${h.specialty_id}-progress`, icon: '📈', label: `Progression rapide en ${name}`, priority: 40 };
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

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {signals.map((s) => (
        <span
          key={s.key}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-neutral-50 border border-neutral-100 text-neutral-800 px-3 py-1.5 rounded-full"
        >
          <span>{s.icon}</span>
          {s.label}
        </span>
      ))}
    </div>
  );
}
