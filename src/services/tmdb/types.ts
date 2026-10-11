export interface MediaItem {
  id: number | string;
  tmdbId?: number;
  title: string;
  name?: string;
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
  cast?: CastMember[];
  trailerUrl?: string;
  communityId?: string;
  communityMembersCount?: number;
  activeOnlineCount?: number;
  hubBadge?: string;
  hubBadgeType?: 'primary' | 'secondary' | 'neutral';
  network?: string;
  statusText?: string;
  channelsCount?: number;
  featuredImage?: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath?: string;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface CommunityReview {
  id: string;
  showId: string | number;
  showTitle: string;
  showBackdrop: string;
  showPoster: string;
  authorUsername: string;
  authorAvatar: string;
  authorRole: string;
  isVerifiedCritic: boolean;
  rating: number; // out of 5
  essayType: string;
  headline: string;
  content: string;
  helpfulCount: number;
  responsesCount: number;
  tags: string[];
  createdAt: string;
}

export interface CommunityChannel {
  id: string;
  communityId: string;
  name: string;
  topic: string;
  isSpoilerSafe: boolean;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  communityId?: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole?: string;
  userBadge?: string;
  content: string;
  isSpoiler?: boolean;
  createdAt: string;
  reactions: { emoji: string; count: number; users: string[] }[];
  replyCount?: number;
}
