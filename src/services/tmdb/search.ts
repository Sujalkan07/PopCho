import { fetchFromBackend } from './client';
import type { MediaItem, NormalizedTmdbReview } from './types';

export interface SearchResults {
  shows: MediaItem[];
  reviews: NormalizedTmdbReview[];
  communities: {
    id: string;
    name: string;
    category: string;
    poster: string;
  }[];
}

export async function searchMedia(
  query: string,
  page: number = 1
): Promise<{ results: MediaItem[]; total: number; page: number }> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { results: [], total: 0, page: 1 };
  }
  return await fetchFromBackend<{ results: MediaItem[]; total: number; page: number }>(
    '/search',
    { query: cleanQuery, page }
  );
}

export async function searchGlobal(query: string): Promise<SearchResults> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    return { shows: [], reviews: [], communities: [] };
  }

  // 1. Fetch matching shows from TMDB via backend proxy
  const searchResponse = await searchMedia(cleanQuery);
  const shows = searchResponse.results;

  // 2. Derive show communities without fabricated stats
  const communities = shows.map((s) => ({
    id: String(s.id),
    name: s.title,
    category: s.genres[0] || 'Community Hub',
    poster: s.posterPath
  }));

  return {
    shows,
    reviews: [],
    communities
  };
}
