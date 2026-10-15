import { fetchFromBackend } from './client';
import type { MediaItem, CastMember } from './types';

let cachedTrendingMovies: { data: MediaItem[]; timestamp: number } | null = null;
let cachedPopularMovies: { data: MediaItem[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getTrendingMovies(page: number = 1, forceRefresh: boolean = false): Promise<MediaItem[]> {
  if (forceRefresh) {
    cachedTrendingMovies = null;
  } else if (page === 1 && cachedTrendingMovies && Date.now() - cachedTrendingMovies.timestamp < CACHE_TTL_MS) {
    return cachedTrendingMovies.data;
  }

  const data = await fetchFromBackend<{ results: MediaItem[]; total: number; page: number }>(
    '/trending',
    { mediaType: 'movie', timeWindow: 'week', page }
  );

  const items = Array.isArray(data?.results) ? data.results : [];
  if (page === 1 && items.length > 0) {
    cachedTrendingMovies = { data: items, timestamp: Date.now() };
  }

  return items;
}

export async function getPopularMovies(page: number = 1, forceRefresh: boolean = false): Promise<MediaItem[]> {
  if (forceRefresh) {
    cachedPopularMovies = null;
  } else if (page === 1 && cachedPopularMovies && Date.now() - cachedPopularMovies.timestamp < CACHE_TTL_MS) {
    return cachedPopularMovies.data;
  }

  const data = await fetchFromBackend<{ results: MediaItem[]; total: number; page: number }>(
    '/popular',
    { mediaType: 'movie', page }
  );

  const items = Array.isArray(data?.results) ? data.results : [];
  if (page === 1 && items.length > 0) {
    cachedPopularMovies = { data: items, timestamp: Date.now() };
  }

  return items;
}

export async function getMovieDetails(id: string | number): Promise<MediaItem> {
  return await fetchFromBackend<MediaItem>(`/details/${id}`, { mediaType: 'movie' });
}

export async function getMovieCredits(
  id: string | number
): Promise<{ cast: CastMember[]; crew: Array<{ id: number; name: string; job?: string; department?: string }> }> {
  return await fetchFromBackend<{
    cast: CastMember[];
    crew: Array<{ id: number; name: string; job?: string; department?: string }>;
  }>(`/credits/${id}`, {
    mediaType: 'movie'
  });
}

export async function getSimilarMovies(id: string | number): Promise<MediaItem[]> {
  return await fetchFromBackend<MediaItem[]>(`/similar/${id}`, { mediaType: 'movie' });
}
