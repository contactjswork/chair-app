import type { ApiReview } from '@/lib/types';
import ReviewsCompact from './ReviewsCompact';

interface Props {
  hairdresserId: number;
  hairdresserUserId: number;
  reviews: ApiReview[];
  avgRating: string;
  reviewsCount: number;
}

export default function PublicProfileReviews({ hairdresserId, hairdresserUserId, reviews, avgRating, reviewsCount }: Props) {
  return (
    <ReviewsCompact
      hairdresserId={hairdresserId}
      hairdresserUserId={hairdresserUserId}
      initialReviews={reviews}
      avgRating={avgRating}
      reviewsCount={reviewsCount}
    />
  );
}
