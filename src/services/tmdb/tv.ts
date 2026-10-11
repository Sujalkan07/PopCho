import { fetchFromBackend } from './client';
import type { MediaItem, CastMember } from './types';

export async function getTrendingTvShows(): Promise<MediaItem[]> {
  const data = await fetchFromBackend<{ results: MediaItem[]; total: number; page: number }>(
    '/trending',
    { mediaType: 'tv', timeWindow: 'week' }
  );
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
): Promise<{ cast: CastMember[]; crew: any[] }> {
  const data = await fetchFromBackend<{ cast: CastMember[]; crew: any[] }>(
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
  episodes: any[];
}> {
  return await fetchFromBackend(`/tv/${id}/season/${seasonNumber}`);
}

export async function getSimilarTvShows(id: string | number): Promise<MediaItem[]> {
  return await fetchFromBackend<MediaItem[]>(`/similar/${id}`, { mediaType: 'tv' });
}
