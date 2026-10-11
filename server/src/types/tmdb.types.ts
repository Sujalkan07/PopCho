export interface RawTmdbMedia {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  media_type?: 'movie' | 'tv' | 'person';
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  popularity?: number;
  origin_country?: string[];
  original_language?: string;
}

export interface RawTmdbGenre {
  id: number;
  name: string;
}

export interface RawTmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path?: string | null;
  order?: number;
}

export interface RawTmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path?: string | null;
}

export interface RawTmdbEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date?: string;
  still_path?: string | null;
  vote_average?: number;
  runtime?: number;
}

export interface RawTmdbSeason {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episode_count?: number;
  air_date?: string;
  poster_path?: string | null;
  episodes?: RawTmdbEpisode[];
}

export interface RawTmdbNetwork {
  id: number;
  name: string;
  logo_path?: string | null;
}

export interface RawTmdbDetails {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  tagline?: string;
  status?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genres?: RawTmdbGenre[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: RawTmdbSeason[];
  networks?: RawTmdbNetwork[];
  credits?: {
    cast?: RawTmdbCastMember[];
    crew?: RawTmdbCrewMember[];
  };
  similar?: {
    results?: RawTmdbMedia[];
  };
  recommendations?: {
    results?: RawTmdbMedia[];
  };
}

export interface NormalizedMediaItem {
  id: string;
  tmdbId: number;
  title: string;
  overview: string;
  posterPath: string;
  backdropPath: string;
  mediaType: 'movie' | 'tv';
  releaseDate?: string;
  firstAirDate?: string;
  voteAverage: number;
  voteCount: number;
  genres: string[];
  runtime?: number;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  status?: string;
  tagline?: string;
  network?: string;
  communityId?: string;
  communityMembersCount?: number;
  activeOnlineCount?: number;
  hubBadge?: string;
  hubBadgeType?: 'primary' | 'secondary' | 'neutral';
  statusText?: string;
  channelsCount?: number;
  featuredImage?: string;
}
