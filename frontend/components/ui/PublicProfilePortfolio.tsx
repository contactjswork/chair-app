import type { ApiPost } from '@/lib/types';
import PortfolioGrid from './PortfolioGrid';

interface Props {
  posts: ApiPost[];
}

export default function PublicProfilePortfolio({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <div className="px-4 md:px-0">
        <div className="bg-neutral-50 border border-neutral-100 rounded-2xl py-14 text-center">
          <p className="text-[13px] text-neutral-400">Aucune réalisation pour l&apos;instant.</p>
        </div>
      </div>
    );
  }

  return (
    <section>
      <div className="px-4 md:px-0 flex items-baseline justify-between mb-3">
        <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400">Portfolio</p>
        <span className="text-[11px] text-neutral-400">
          {posts.length} réalisation{posts.length > 1 ? 's' : ''}
        </span>
      </div>
      <PortfolioGrid posts={posts} />
    </section>
  );
}
