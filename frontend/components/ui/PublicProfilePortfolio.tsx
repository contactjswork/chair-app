import { ImageOff } from 'lucide-react';
import type { ApiPost } from '@/lib/types';
import PortfolioGrid from './PortfolioGrid';
import EmptyState from './EmptyState';

interface Props {
  posts: ApiPost[];
}

export default function PublicProfilePortfolio({ posts }: Props) {
  // Avant : un rectangle gris de 14 unités de haut avec une phrase grise
  // centrée dedans — le "gros bloc vide" typique. EmptyState existait déjà et
  // n'était utilisé nulle part ici.
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title="Pas encore de réalisation"
        subtitle="Ce coiffeur n'a pas encore publié de photos de son travail."
      />
    );
  }

  return (
    <section>
      {/* Le titre "PORTFOLIO" doublait l'onglet déjà sélectionné juste
          au-dessus. Seul le décompte apporte une information. */}
      <p className="px-4 md:px-0 text-[11px] text-neutral-400 mb-3">
        {posts.length} réalisation{posts.length > 1 ? 's' : ''}
      </p>
      <PortfolioGrid posts={posts} />
    </section>
  );
}
