/**
 * La ligne de contribution d'un membre d'équipe — « 34 passages · 12 avis ★4,8
 * · 62 % du salon ». Extraite de app/pro/equipe/page.tsx pour être partagée
 * avec la home CHAIR BUSINESS (une seule formulation, jamais deux calculs).
 *
 * Règles d'honnêteté d'origine conservées : les avis n'apparaissent que s'il
 * y en a, la note que si elle existe, et la « part du salon » exige au moins
 * deux membres ET une activité réelle (un « 100 % » d'un salon vide ne dit rien).
 */

export interface MembreContribution {
  verified_visits_count?: number | null;
  reviews_count?: number | null;
  avg_rating?: number | string | null;
}

export function contributionLigne(m: MembreContribution, team: MembreContribution[]): string {
  const passages = m.verified_visits_count ?? 0;
  const avis = m.reviews_count ?? 0;
  const note = m.avg_rating != null ? parseFloat(String(m.avg_rating)) : 0;

  const morceaux: string[] = [];
  morceaux.push(`${passages} passage${passages > 1 ? 's' : ''}`);
  if (avis > 0) morceaux.push(`${avis} avis${note > 0 ? ` ★${note.toFixed(1)}` : ''}`);

  const totalSalon = team.reduce((acc, t) => acc + (t.verified_visits_count ?? 0), 0);
  if (team.length > 1 && totalSalon > 0 && passages > 0) {
    morceaux.push(`${Math.round((passages / totalSalon) * 100)} % du salon`);
  }
  return morceaux.join(' · ');
}
