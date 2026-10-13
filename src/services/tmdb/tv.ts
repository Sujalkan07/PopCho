import { fetchFromBackend } from './client';
import type { MediaItem, CastMember } from './types';

// In-memory cache for trending TV shows to prevent redundant network requests
let cachedTrendingTv: { data: MediaItem[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getTrendingTvShows(page: number = 1, forceRefresh: boolean = false): Promise<MediaItem[]> {
  if (forceRefresh) {
    cachedTrendingTv = null;
  } else if (page === 1 && cachedTrendingTv && Date.now() - cachedTrendingTv.timestamp < CACHE_TTL_MS) {
    return cachedTrendingTv.data;
  }

  const data = await fetchFromBackend<{ results: MediaItem[]; total: number; page: number }>(
    '/trending',
    { mediaType: 'tv', timeWindow: 'week', page }
  );

  if (page === 1 && Array.isArray(data.results)) {
    cachedTrendingTv = { data: data.results, timestamp: Date.now() };
  }

  return data.results;
}

export async function getPopularTvShows(page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromBackend<{ results: MediaItem[]; total: number; page: number }>(
    '/popular',
    { mediaType: 'tv', page }
  );
  return data.results;
}

export async function getTvShowDetails(id: string | number): Promise<MediaItem> {
  const data = await fetchFromBackend<MediaItem>(`/details/${id}`, { mediaType: 'tv' });
  return data;
}

export async function getTvShowCredits(
  id: string | number
): Promise<{ cast: CastMember[]; crew: Array<{ id: number; name: string; job?: string; department?: string }> }> {
  const data = await fetchFromBackend<{
    cast: CastMember[];
    crew: Array<{ id: number; name: string; job?: string; department?: string }>;
  }>(
    `/credits/${id}`,
    { mediaType: 'tv' }
  );
  return data;
}

export async function getTvShowSeason(
  id: string | number,
  seasonNumber: number = 1
): Promise<{
  id: number;
  name: string;
  overview: string;
  seasonNumber: number;
  episodes: Array<{
    id: number;
    name: string;
    overview: string;
    episodeNumber: number;
    airDate?: string;
    stillPath?: string;
    voteAverage?: number;
  }>;
}> {
  return await fetchFromBackend(`/tv/${id}/season/${seasonNumber}`);
}

export async function getSimilarTvShows(id: string | number): Promise<MediaItem[]> {
  return await fetchFromBackend<MediaItem[]>(`/similar/${id}`, { mediaType: 'tv' });
}
