export interface AvatarItem {
  id: string;
  name: string;
  title: string;
  origin: string;
  category: 'tv' | 'movies' | 'anime';
  archetype: 'protagonist' | 'anti-hero' | 'legend';
  badge: string;
  tag: string;
  quote: string;
  role: string;
  imageUrl: string;
}

export interface CatalogResponse {
  items: AvatarItem[];
  total: number;
  counts: {
    all: number;
    tv: number;
    movies: number;
    anime: number;
  };
}
