import { fetchFromBackend } from './client';
import type { MediaItem, CastMember } from './types';

export async function getTrendingMovies(page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromBackend<{ results: MediaItem[]; total: number; page: number }>(
    '/trending',
    { mediaType: 'movie', timeWindow: 'week', page }
  );
  return data.results;
}

export async function getPopularMovies(page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromBackend<{ results: MediaItem[]; total: number; page: number }>(
    '/popular',
    { mediaType: 'movie', page }
  );
  return data.results;
}

export async function getMovieDetails(id: string | number): Promise<MediaItem> {
  return await fetchFromBackend<MediaItem>(`/details/${id}`, { mediaType: 'movie' });
}

export async function getMovieCredits(
  id: string | number
): Promise<{ cast: CastMember[]; crew: any[] }> {
  return await fetchFromBackend<{ cast: CastMember[]; crew: any[] }>(`/credits/${id}`, {
    mediaType: 'movie'
  });
}

export async function getSimilarMovies(id: string | number): Promise<MediaItem[]> {
  return await fetchFromBackend<MediaItem[]>(`/similar/${id}`, { mediaType: 'movie' });
}
