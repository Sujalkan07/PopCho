import { config } from '../config.js';
import type {
  RawTmdbMedia,
  RawTmdbDetails,
  RawTmdbSeason,
  NormalizedMediaItem,
  RawTmdbCastMember,
  RawTmdbCrewMember,
  RawTmdbReviewResponse,
  NormalizedTmdbReview,
  ReviewsResponse
} from '../types/tmdb.types.js';

/**
 * Structured error class preserving HTTP status codes and error categories
 * without exposing internal credentials or raw stack traces.
 */
export class TmdbApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly endpoint: string;

  constructor(message: string, status: number = 500, code: string = 'TMDB_ERROR', endpoint: string = '') {
    super(message);
    this.name = 'TmdbApiError';
    this.status = status;
    this.code = code;
    this.endpoint = endpoint;
  }
}

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
  60: 'Horror',
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

export const DEFAULT_POSTER =
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80';
export const DEFAULT_BACKDROP =
  'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1920&q=80';

export function getTmdbImageUrl(
  path?: string | null,
  size: 'w500' | 'w780' | 'original' | 'w300' = 'w500'
): string {
  if (!path) {
    return size === 'original' || size === 'w780' ? DEFAULT_BACKDROP : DEFAULT_POSTER;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${config.tmdb.imageBaseUrl}/${size}${cleanPath}`;
}

// In-flight request deduplication map to prevent stampedes on concurrent upstream queries
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Fetch data from upstream TMDB API with unified auth, timeout, clean caching,
 * in-flight request deduplication, and robust error status mapping.
 */
export async function fetchTmdb<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  ttlMs: number = 10 * 60 * 1000
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // 1. Check credential configuration
  const authMode = config.tmdb.authMode;
  if (authMode === 'none') {
    throw new TmdbApiError(
      'TMDB credentials are not configured on the server. Please configure TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY.',
      503,
      'TMDB_NOT_CONFIGURED',
      cleanEndpoint
    );
  }

  // 2. Build parameter search list and construct clean, credential-free cache key
  const searchParams = new URLSearchParams();
  const sortedKeys = Object.keys(params).sort();
  for (const key of sortedKeys) {
    const val = params[key];
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, String(val));
    }
  }

  const queryString = searchParams.toString();
  const cacheKey = `tmdb:${cleanEndpoint}${queryString ? `?${queryString}` : ''}`;
  const cached = cache.get<T>(cacheKey);
  if (cached) {
    return cached;
  }

  // 3. In-flight request deduplication: reuse active promise if same request is already executing
  const existingInFlight = inFlightRequests.get(cacheKey);
  if (existingInFlight) {
    return existingInFlight as Promise<T>;
  }

  const fetchPromise = (async (): Promise<T> => {
    // Construct URL with endpoint and parameters
    const requestUrl = new URL(`${config.tmdb.baseUrl}${cleanEndpoint}`);
    searchParams.forEach((value, key) => {
      requestUrl.searchParams.set(key, value);
    });

    // Apply single authentication mechanism with strict token > key precedence
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'PopCho-Server/1.0',
    };

    if (authMode === 'token') {
      headers['Authorization'] = `Bearer ${config.tmdb.readAccessToken}`;
    } else if (authMode === 'key') {
      requestUrl.searchParams.set('api_key', config.tmdb.apiKey);
    }

    // Execute HTTP request with bounded timeout (15s) and automatic retry on transient socket resets
    let response: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(requestUrl.toString(), {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(15000),
        });
        break;
      } catch (err: unknown) {
        const isAbort =
          err instanceof Error &&
          (err.name === 'TimeoutError' || err.name === 'AbortError' || err.message.includes('timeout'));

        if (isAbort && attempt === 2) {
          throw new TmdbApiError(
            'TMDB upstream request timed out after 15 seconds.',
            504,
            'TMDB_TIMEOUT',
            cleanEndpoint
          );
        }

        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
          continue;
        }

        const errorMsg = err instanceof Error ? err.message : 'Network error';
        console.error(`[TMDB] Network error connecting to ${cleanEndpoint}: ${errorMsg}`);
        throw new TmdbApiError(
          'Unable to connect to TMDB upstream service. Please check network connectivity.',
          502,
          'TMDB_NETWORK_ERROR',
          cleanEndpoint
        );
      }
    }

    if (!response) {
      throw new TmdbApiError(
        'Unable to connect to TMDB upstream service.',
        502,
        'TMDB_NETWORK_ERROR',
        cleanEndpoint
      );
    }

  // 6. Handle non-2xx status codes
  if (!response.ok) {
    let upstreamMessage = '';
    try {
      const errorJson = (await response.json()) as { status_message?: string };
      if (errorJson && typeof errorJson.status_message === 'string') {
        upstreamMessage = errorJson.status_message;
      }
    } catch {
      // Non-JSON error body
    }

    const status = response.status;

    if (status === 401 || status === 403) {
      console.error(`[TMDB] Auth failure (${status}) on ${cleanEndpoint}: ${upstreamMessage}`);
      throw new TmdbApiError(
        'TMDB upstream authentication rejected the configured server credential.',
        401,
        'TMDB_AUTH_FAILED',
        cleanEndpoint
      );
    }

    if (status === 404) {
      throw new TmdbApiError(
        upstreamMessage || `Resource not found on TMDB: ${cleanEndpoint}`,
        404,
        'TMDB_NOT_FOUND',
        cleanEndpoint
      );
    }

    if (status === 429) {
      console.warn(`[TMDB] Rate limit exceeded on ${cleanEndpoint}`);
      throw new TmdbApiError(
        'TMDB rate limit exceeded. Please try again shortly.',
        429,
        'TMDB_RATE_LIMITED',
        cleanEndpoint
      );
    }

    if (status >= 500) {
      console.error(`[TMDB] Upstream server error (${status}) on ${cleanEndpoint}: ${upstreamMessage}`);
      throw new TmdbApiError(
        'TMDB upstream service is currently unavailable.',
        502,
        'TMDB_UPSTREAM_ERROR',
        cleanEndpoint
      );
    }

    throw new TmdbApiError(
      upstreamMessage || `TMDB request failed with status ${status}`,
      status,
      'TMDB_REQUEST_FAILED',
      cleanEndpoint
    );
  }

  // 7. Parse JSON response
  let data: T;
  try {
    data = (await response.json()) as T;
  } catch {
    throw new TmdbApiError(
      'Received invalid JSON response from TMDB.',
      502,
      'TMDB_INVALID_JSON',
      cleanEndpoint
    );
  }

    // 8. Cache only verified successful responses
    cache.set<T>(cacheKey, data, ttlMs);
    return data;
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

export function normalizeMediaItem(
  raw: RawTmdbMedia,
  mediaTypeFallback: 'movie' | 'tv' = 'tv'
): NormalizedMediaItem {
  const mediaType: 'movie' | 'tv' =
    raw.media_type === 'movie' || raw.media_type === 'tv'
      ? raw.media_type
      : mediaTypeFallback;

  const title = mediaType === 'movie'
    ? (raw.title || raw.name || 'Untitled')
    : (raw.name || raw.title || 'Untitled');
  const idStr = String(raw.id);
  const voteAvg = typeof raw.vote_average === 'number' && raw.vote_average > 0 ? Math.round(raw.vote_average * 10) / 10 : 0;
  const voteCount = raw.vote_count || 0;

  // Determine genres
  let genres: string[] = [];
  if (raw.genre_ids && raw.genre_ids.length > 0) {
    genres = raw.genre_ids.map((gid) => GENRE_MAP[gid]).filter(Boolean) as string[];
  }
  if (genres.length === 0) {
    genres = [mediaType === 'movie' ? 'Cinema' : 'Drama'];
  }

  // Dynamic hub badges based on genuine rating and popularity
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
    hubBadge,
    hubBadgeType,
    statusText: mediaType === 'tv' ? 'Active Series' : 'Feature Film'
  };
}

export class TmdbService {
  /**
   * 1. Trending movies and TV shows
   */
  async getTrending(
    mediaType: 'all' | 'movie' | 'tv' = 'all',
    timeWindow: 'day' | 'week' = 'week',
    page: number = 1
  ): Promise<{ results: NormalizedMediaItem[]; total: number; page: number }> {
    const rawData = await fetchTmdb<{
      page: number;
      results: RawTmdbMedia[];
      total_results: number;
      total_pages: number;
    }>(`/trending/${mediaType}/${timeWindow}`, { page });

    const filtered = (rawData.results || []).filter(
      (item) => item.media_type !== 'person'
    );

    const results = filtered.map((item) =>
      normalizeMediaItem(item, mediaType === 'movie' ? 'movie' : 'tv')
    );

    return {
      results,
      total: rawData.total_results || 0,
      page: rawData.page || page
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
      total: rawData.total_results || 0,
      page: rawData.page || page
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
      total: rawData.total_results || 0,
      page: rawData.page || page
    };
  }

  /**
   * 4. Show/movie details
   */
  async getDetails(
    id: string | number,
    mediaType: 'movie' | 'tv' = 'tv'
  ): Promise<NormalizedMediaItem & { rawDetails: RawTmdbDetails }> {
    const cleanId = String(id).replace(/^(tv-|movie-)/, '').trim();
    const raw = await fetchTmdb<RawTmdbDetails>(
      `/${mediaType}/${cleanId}`,
      { append_to_response: 'credits,similar,recommendations' }
    );

    const title = mediaType === 'movie'
      ? (raw.title || raw.name || 'Untitled')
      : (raw.name || raw.title || 'Untitled');
    const voteAvg = typeof raw.vote_average === 'number' && raw.vote_average > 0 ? Math.round(raw.vote_average * 10) / 10 : 0;
    const voteCount = raw.vote_count || 0;
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
      hubBadge: raw.status === 'Ended' ? 'COMPLETED' : 'ACTIVE COMMUNITY',
      hubBadgeType: 'primary',
      statusText: raw.status || (mediaType === 'tv' ? 'Active Series' : 'Feature Film')
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
    const cleanId = String(id).replace(/^(tv-|movie-)/, '').trim();
    const raw = await fetchTmdb<{
      id: number;
      cast: RawTmdbCastMember[];
      crew: RawTmdbCrewMember[];
    }>(`/${mediaType}/${cleanId}/credits`);

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
    const cleanId = String(tvId).replace(/^(tv-|movie-)/, '').trim();
    const raw = await fetchTmdb<RawTmdbSeason>(`/tv/${cleanId}/season/${seasonNumber}`);

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
    const cleanId = String(id).replace(/^(tv-|movie-)/, '').trim();
    const raw = await fetchTmdb<{ results: RawTmdbMedia[] }>(
      `/${mediaType}/${cleanId}/similar`
    );

    return (raw.results || []).slice(0, 12).map((item) =>
      normalizeMediaItem(item, mediaType)
    );
  }

  /**
   * 8. Official TMDB Reviews for movie or TV show
   */
  async getReviews(
    id: string | number,
    mediaType: 'movie' | 'tv' = 'tv',
    page: number = 1
  ): Promise<ReviewsResponse> {
    const cleanId = String(id).replace(/^(tv-|movie-)/, '').trim();
    const rawData = await fetchTmdb<RawTmdbReviewResponse>(
      `/${mediaType}/${cleanId}/reviews`,
      { page }
    );

    const results: NormalizedTmdbReview[] = (rawData.results || []).map((rev) => {
      let avatarUrl: string | undefined = undefined;
      const rawAvatar = rev.author_details?.avatar_path;
      if (rawAvatar) {
        if (rawAvatar.startsWith('http://') || rawAvatar.startsWith('https://')) {
          avatarUrl = rawAvatar;
        } else if (rawAvatar.startsWith('/http://') || rawAvatar.startsWith('/https://')) {
          avatarUrl = rawAvatar.slice(1);
        } else {
          avatarUrl = getTmdbImageUrl(rawAvatar, 'w300');
        }
      }

      return {
        id: rev.id,
        author: rev.author || rev.author_details?.username || 'Anonymous Reviewer',
        username: rev.author_details?.username,
        avatarUrl,
        rating: typeof rev.author_details?.rating === 'number' ? rev.author_details.rating : null,
        content: rev.content || '',
        createdAt: rev.created_at,
        url: rev.url
      };
    });

    return {
      id,
      page: rawData.page || 1,
      results,
      totalPages: rawData.total_pages || 1,
      totalResults: rawData.total_results || results.length
    };
  }
}

export const tmdbService = new TmdbService();
