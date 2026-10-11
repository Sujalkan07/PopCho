import { fetchFromBackend } from './client';
import type { ReviewsResponse } from './types';

/**
 * Fetch official TMDB reviews for a movie or TV show via backend proxy.
 */
export async function getMediaReviews(
  id: string | number,
  mediaType: 'movie' | 'tv' = 'tv',
  page: number = 1
): Promise<ReviewsResponse> {
  return await fetchFromBackend<ReviewsResponse>(`/reviews/${id}`, {
    mediaType,
    page,
  });
}
