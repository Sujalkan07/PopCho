import { fetchFromBackend } from './client';
import { MOCK_REVIEWS } from './mockData';
import type { MediaItem, CommunityReview } from './types';

export interface SearchResults {
  shows: MediaItem[];
  reviews: CommunityReview[];
  communities: {
    id: string;
    name: string;
    category: string;
    membersCount: number;
    onlineCount: number;
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

  // 2. Filter community reviews matching query
  const matchedReviews = MOCK_REVIEWS.filter(
    (r) =>
      r.showTitle.toLowerCase().includes(cleanQuery) ||
      r.headline.toLowerCase().includes(cleanQuery) ||
      r.content.toLowerCase().includes(cleanQuery) ||
      r.tags.some((t) => t.toLowerCase().includes(cleanQuery))
  );

  // 3. Derive fan communities
  const communities = shows.map((s) => ({
    id: String(s.id),
    name: s.title,
    category: s.genres[0] || 'Fandom',
    membersCount: s.communityMembersCount || 10000,
    onlineCount: s.activeOnlineCount || 1000,
    poster: s.posterPath
  }));

  return {
    shows,
    reviews: matchedReviews,
    communities
  };
}
