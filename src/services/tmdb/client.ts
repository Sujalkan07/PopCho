const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const DEFAULT_POSTER =
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80';
export const DEFAULT_BACKDROP =
  'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1920&q=80';

export const getImageUrl = (
  path?: string | null,
  size: 'w500' | 'original' | 'w200' | 'w300' = 'w500'
): string => {
  if (!path) {
    return size === 'original' ? DEFAULT_BACKDROP : DEFAULT_POSTER;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE}/${size}${cleanPath}`;
};

/**
 * Normalizes the API base URL for TMDB proxy requests:
 * - When VITE_API_URL is unset/empty: returns '/api/tmdb' for local Vite dev proxy.
 * - When VITE_API_URL is configured (e.g. deployed backend): joins cleanly without duplicate '/api'.
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (!envUrl) {
    return '/api/tmdb';
  }

  const cleanUrl = envUrl.replace(/\/+$/, '');
  if (cleanUrl.endsWith('/api/tmdb')) {
    return cleanUrl;
  }
  if (cleanUrl.endsWith('/api')) {
    return `${cleanUrl}/tmdb`;
  }
  return `${cleanUrl}/api/tmdb`;
}

export async function fetchFromBackend<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.set(key, String(val));
    }
  });

  const queryString = query.toString();
  const url = `${base}${cleanEndpoint}${queryString ? `?${queryString}` : ''}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (networkErr: unknown) {
    const msg = networkErr instanceof Error ? networkErr.message : 'Network error';
    throw new Error(`Unable to reach the PopCho media service (${msg}). Please verify that the backend server is running.`, {
      cause: networkErr,
    });
  }

  if (!res.ok) {
    let errorMsg = `Server request failed with status ${res.status}`;
    try {
      const errorJson = await res.json();
      if (errorJson && typeof errorJson === 'object') {
        if (typeof errorJson.error === 'string') {
          errorMsg = errorJson.error;
        } else if (typeof errorJson.message === 'string') {
          errorMsg = errorJson.message;
        }
      }
    } catch {
      // Non-JSON error body fallback
    }
    throw new Error(errorMsg);
  }

  try {
    return (await res.json()) as T;
  } catch (parseErr: unknown) {
    throw new Error('Received malformed data from the media service.', { cause: parseErr });
  }
}
