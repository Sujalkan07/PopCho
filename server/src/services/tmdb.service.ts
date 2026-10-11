import { config } from '../config.js';
import type {
  RawTmdbMedia,
  RawTmdbDetails,
  RawTmdbSeason,
  NormalizedMediaItem,
  RawTmdbCastMember,
  RawTmdbCrewMember
} from '../types/tmdb.types.js';

// Simple in-memory cache with TTL (10 minutes default)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class CacheStore {
  private cache = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = 10 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new CacheStore();

// Comprehensive TMDB Genre Dictionary
const GENRE_MAP: Record<number, string> = {
  // Movies
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  // TV Shows
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics'
};

const DEFAULT_POSTER =
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80';
const DEFAULT_BACKDROP =
  'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1920&q=80';

export function getTmdbImageUrl(
  path?: string | null,
  size: 'w500' | 'w780' | 'original' | 'w300' = 'w500'
): string {
  if (!path) {
    return size === 'original' || size === 'w780' ? DEFAULT_BACKDROP : DEFAULT_POSTER;
  }
  if (path.startsWith('http')) return path;
  return `${config.tmdb.imageBaseUrl}/${size}${path}`;
}

export async function fetchTmdb<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  ttlMs: number = 10 * 60 * 1000
): Promise<T> {
  const url = new URL(`${config.tmdb.baseUrl}${endpoint}`);
  
  // Clean up params
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      url.searchParams.set(key, String(val));
    }
  });

  const cacheKey = url.toString();
  const cached = cache.get<T>(cacheKey);
  if (cached) {
    return cached;
  }

  // Set authentication headers
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  if (config.tmdb.readAccessToken) {
    headers['Authorization'] = `Bearer ${config.tmdb.readAccessToken}`;
  } else if (config.tmdb.apiKey) {
    url.searchParams.set('api_key', config.tmdb.apiKey);
  } else {
    throw new Error('TMDB credentials missing in server environment (TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY required).');
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`TMDB API request failed [${response.status} ${response.statusText}]: ${errorBody}`);
  }

  const data = (await response.json()) as T;
  cache.set<T>(cacheKey, data, ttlMs);
  return data;
}

export function normalizeMediaItem(
  raw: RawTmdbMedia,
  mediaTypeFallback: 'movie' | 'tv' = 'tv'
): NormalizedMediaItem {
  const mediaType: 'movie' | 'tv' =
    raw.media_type === 'movie' || raw.media_type === 'tv'
      ? raw.media_type
      : mediaTypeFallback;

  const title = raw.name || raw.title || 'Untitled';
  const idStr = String(raw.id);
  const voteAvg = raw.vote_average ? Math.round(raw.vote_average * 10) / 10 : 7.5;
  const voteCount = raw.vote_count || 120;

  // Determine genres
  let genres: string[] = [];
  if (raw.genre_ids && raw.genre_ids.length > 0) {
    genres = raw.genre_ids.map((gid) => GENRE_MAP[gid]).filter(Boolean) as string[];
  }
  if (genres.length === 0) {
    genres = [mediaType === 'movie' ? 'Cinema' : 'Drama'];
  }

  // Consistent community figures derived from TMDB popularity & vote counts
  const popFactor = Math.floor((raw.popularity || 40) * 12);
  const communityMembersCount = Math.min(185000, Math.max(3400, voteCount * 4 + popFactor));
  const activeOnlineCount = Math.max(120, Math.floor(communityMembersCount * 0.08) + 85);
  const channelsCount = 12 + (raw.id % 28);

  // Dynamic hub badges based on rating and popularity
  let hubBadge: string | undefined;
  let hubBadgeType: 'primary' | 'secondary' | 'neutral' | undefined;

  if (voteAvg >= 8.5) {
    hubBadge = 'CRITIC CHOICE';
    hubBadgeType = 'primary';
  } else if ((raw.popularity || 0) > 100) {
    hubBadge = 'TRENDING NOW';
    hubBadgeType = 'secondary';
  } else if (raw.first_air_date && new Date(raw.first_air_date) > new Date(Date.now() - 90 * 86400000)) {
    hubBadge = 'NEW EPISODES';
    hubBadgeType = 'primary';
  } else {
    hubBadge = 'COMMUNITY HUB';
    hubBadgeType = 'neutral';
  }

  return {
    id: idStr,
    tmdbId: raw.id,
    title,
    overview:
      raw.overview ||
      `Official community and discussion hub for ${title}. Connect with fans, share live episode theories, and explore spoiler-tagged lore.`,
    posterPath: getTmdbImageUrl(raw.poster_path, 'w500'),
    backdropPath: getTmdbImageUrl(raw.backdrop_path, 'original'),
    mediaType,
    releaseDate: raw.release_date,
    firstAirDate: raw.first_air_date,
    voteAverage: voteAvg,
    voteCount,
    genres: genres.slice(0, 3),
    communityId: idStr,
    communityMembersCount,
    activeOnlineCount,
    hubBadge,
    hubBadgeType,
    channelsCount,
    statusText: mediaType === 'tv' ? 'Active Series' : 'Feature Film'
  };
}

export class TmdbService {
  /**
   * 1. Trending movies and TV shows
   */
  async getTrending(
    mediaType: 'all' | 'movie' | 'tv' = 'all',
    timeWindow: 'day' | 'week' = 'week'
  ): Promise<{ results: NormalizedMediaItem[]; total: number; page: number }> {
    const rawData = await fetchTmdb<{
      page: number;
      results: RawTmdbMedia[];
      total_results: number;
      total_pages: number;
    }>(`/trending/${mediaType}/${timeWindow}`);

    const filtered = (rawData.results || []).filter(
      (item) => item.media_type !== 'person'
    );

    const results = filtered.map((item) =>
      normalizeMediaItem(item, mediaType === 'movie' ? 'movie' : 'tv')
    );

    return {
      results,
      total: rawData.total_results,
      page: rawData.page
    };
  }

  /**
   * 2. Popular TV shows and movies
   */
  async getPopular(
    mediaType: 'movie' | 'tv' = 'tv',
    page: number = 1
  ): Promise<{ results: NormalizedMediaItem[]; total: number; page: number }> {
    const rawData = await fetchTmdb<{
      page: number;
      results: RawTmdbMedia[];
      total_results: number;
      total_pages: number;
    }>(`/${mediaType}/popular`, { page });

    const results = (rawData.results || []).map((item) =>
      normalizeMediaItem(item, mediaType)
    );

    return {
      results,
      total: rawData.total_results,
      page: rawData.page
    };
  }

  /**
   * 3. Search for movies and TV shows
   */
  async search(
    query: string,
    page: number = 1
  ): Promise<{ results: NormalizedMediaItem[]; total: number; page: number }> {
    const clean = query.trim();
    if (!clean) {
      return { results: [], total: 0, page: 1 };
    }

    const rawData = await fetchTmdb<{
      page: number;
      results: RawTmdbMedia[];
      total_results: number;
      total_pages: number;
    }>('/search/multi', { query: clean, page });

    const filtered = (rawData.results || []).filter(
      (item) => item.media_type === 'movie' || item.media_type === 'tv'
    );

    const results = filtered.map((item) => normalizeMediaItem(item));

    return {
      results,
      total: rawData.total_results,
      page: rawData.page
    };
  }

  /**
   * 4. Show/movie details
   */
  async getDetails(
    id: string | number,
    mediaType: 'movie' | 'tv' = 'tv'
  ): Promise<NormalizedMediaItem & { rawDetails: RawTmdbDetails }> {
    const raw = await fetchTmdb<RawTmdbDetails>(
      `/${mediaType}/${id}`,
      { append_to_response: 'credits,similar,recommendations' }
    );

    const title = raw.name || raw.title || 'Untitled';
    const voteAvg = raw.vote_average ? Math.round(raw.vote_average * 10) / 10 : 7.5;
    const voteCount = raw.vote_count || 100;
    const genres = raw.genres ? raw.genres.map((g) => g.name) : ['Drama'];
    const network = raw.networks && raw.networks.length > 0 ? raw.networks[0].name : undefined;

    const normalized: NormalizedMediaItem = {
      id: String(raw.id),
      tmdbId: raw.id,
      title,
      overview:
        raw.overview ||
        `Join the PopCho fan community for ${title}. Read discussions, episode recaps, and theories.`,
      posterPath: getTmdbImageUrl(raw.poster_path, 'w500'),
      backdropPath: getTmdbImageUrl(raw.backdrop_path, 'original'),
      mediaType,
      releaseDate: raw.release_date,
      firstAirDate: raw.first_air_date,
      voteAverage: voteAvg,
      voteCount,
      genres,
      runtime: raw.runtime || (raw.episode_run_time ? raw.episode_run_time[0] : undefined),
      numberOfSeasons: raw.number_of_seasons,
      numberOfEpisodes: raw.number_of_episodes,
      status: raw.status,
      tagline: raw.tagline,
      network,
      communityId: String(raw.id),
      communityMembersCount: Math.min(220000, Math.max(4500, voteCount * 5 + 4000)),
      activeOnlineCount: Math.max(200, Math.floor(voteCount * 0.4) + 300),
      hubBadge: raw.status === 'Ended' ? 'COMPLETED' : 'ACTIVE COMMUNITY',
      hubBadgeType: 'primary',
      channelsCount: 16 + (raw.id % 20),
      statusText: raw.status || 'Active Hub'
    };

    return {
      ...normalized,
      rawDetails: raw
    };
  }

  /**
   * 5. Cast and crew
   */
  async getCredits(
    id: string | number,
    mediaType: 'movie' | 'tv' = 'tv'
  ): Promise<{
    cast: { id: number; name: string; character: string; profilePath: string }[];
    crew: { id: number; name: string; job: string; department: string }[];
  }> {
    const raw = await fetchTmdb<{
      id: number;
      cast: RawTmdbCastMember[];
      crew: RawTmdbCrewMember[];
    }>(`/${mediaType}/${id}/credits`);

    const cast = (raw.cast || []).slice(0, 20).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: getTmdbImageUrl(c.profile_path, 'w300')
    }));

    const crew = (raw.crew || []).slice(0, 15).map((cr) => ({
      id: cr.id,
      name: cr.name,
      job: cr.job,
      department: cr.department
    }));

    return { cast, crew };
  }

  /**
   * 6. Seasons and episodes
   */
  async getSeason(
    tvId: string | number,
    seasonNumber: number
  ): Promise<{
    id: number;
    name: string;
    overview: string;
    seasonNumber: number;
    episodes: {
      id: number;
      name: string;
      overview: string;
      episodeNumber: number;
      airDate?: string;
      stillPath: string;
      voteAverage?: number;
      runtime?: number;
    }[];
  }> {
    const raw = await fetchTmdb<RawTmdbSeason>(`/tv/${tvId}/season/${seasonNumber}`);

    return {
      id: raw.id,
      name: raw.name,
      overview: raw.overview,
      seasonNumber: raw.season_number,
      episodes: (raw.episodes || []).map((ep) => ({
        id: ep.id,
        name: ep.name,
        overview: ep.overview,
        episodeNumber: ep.episode_number,
        airDate: ep.air_date,
        stillPath: getTmdbImageUrl(ep.still_path, 'w500'),
        voteAverage: ep.vote_average,
        runtime: ep.runtime
      }))
    };
  }

  /**
   * 7. Similar shows and recommendations
   */
  async getSimilar(
    id: string | number,
    mediaType: 'movie' | 'tv' = 'tv'
  ): Promise<NormalizedMediaItem[]> {
    const raw = await fetchTmdb<{ results: RawTmdbMedia[] }>(
      `/${mediaType}/${id}/similar`
    );

    return (raw.results || []).slice(0, 12).map((item) =>
      normalizeMediaItem(item, mediaType)
    );
  }
}

export const tmdbService = new TmdbService();
