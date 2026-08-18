'use client';

import ClassementsContent from '@/components/leaderboard/ClassementsContent';

// Équivalent CHAIR PRO de /app/classements — même contenu, shell pro (voir
// app/pro/layout.tsx : ProTopBar/ProSidebar/ProNav déjà posés autour de
// {children}, pas besoin de les reposer ici). Retour de Julien : cliquer
// "Classement" depuis CHAIR PRO ouvrait l'interface CHAIR (AppShell) sans
// changer d'appli — corrigé en donnant au classement sa propre route pro.
export default function ProClassementsPage() {
  return <ClassementsContent linkTarget="_blank" bottomPadding="pb-8" />;
}
