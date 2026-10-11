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
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

const BASE_API = '/api/tmdb';

export async function fetchFromBackend<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.set(key, String(val));
    }
  });

  const queryString = query.toString();
  const url = `${BASE_API}${endpoint}${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    let errorMsg = `Server request failed with status ${res.status}`;
    try {
      const errorJson = await res.json();
      if (errorJson && errorJson.error) {
        errorMsg = errorJson.error;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return (await res.json()) as T;
}
