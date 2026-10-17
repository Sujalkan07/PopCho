import type { MediaItem } from '../tmdb/types';

export interface CommunityRecord {
  id: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  slug: string;
  description?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  createdAt: string;
  updatedAt: string;
  channels: ChannelRecord[];
  memberCount: number;
  channelCount: number;
  isMember?: boolean;
}

export interface ChannelRecord {
  id: string;
  communityId: string;
  name: string;
  slug: string;
  description?: string | null;
  type: string;
  isSpoilerSafe?: boolean;
  messageCount?: number;
}

export interface ReactionRecord {
  emoji: string;
  count: number;
  users: string[];
}

export interface MessageRecord {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: string;
  content: string;
  isSpoiler: boolean;
  createdAt: string;
  reactions: ReactionRecord[];
}

export interface PulseAuthor {
  id: string;
  name: string;
  avatar: string;
  role: string;
  badge: string;
}

export interface PulseShow {
  id: string;
  title: string;
  slug: string;
  tmdbId: number;
  mediaType: string;
  posterPath: string | null;
  backdropPath: string | null;
}

export interface PulseDiscussion {
  id: string;
  channelId: string;
  content: string;
  isSpoiler: boolean;
  createdAt: string;
  author: PulseAuthor;
  show: PulseShow;
  channel: {
    id: string;
    name: string;
    slug: string;
  };
  categoryTag: string;
  subtopic?: string;
  likeCount: number;
  isLiked: boolean;
  replyCount: number;
  reactions: ReactionRecord[];
}

export interface DiscussionReply {
  id: string;
  discussionId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    role: string;
  };
}

export interface LeaderboardTheorist {
  rank: number;
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string;
  role: string;
  badge: string;
  points: number;
  formattedPoints: string;
  activitySummary: string;
}

function getCommunityApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (!envUrl) return '/api/communities';
  const cleanUrl = envUrl.replace(/\/+$/, '');
  if (cleanUrl.endsWith('/api/communities')) return cleanUrl;
  if (cleanUrl.endsWith('/api')) return `${cleanUrl}/communities`;
  return `${cleanUrl}/api/communities`;
}

const BASE_URL = getCommunityApiBaseUrl();

let cachedAuthToken: string | null | undefined = undefined;

export function setCommunityAuthToken(token: string | null) {
  cachedAuthToken = token;
}

export function getStoredAccessToken(): string | null {
  if (cachedAuthToken !== undefined) {
    return cachedAuthToken;
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && parsed.access_token) {
            return parsed.access_token;
          }
        }
      }
    }
  } catch {
    // ignore localStorage parse issues
  }
  return null;
}

// Helper for identity headers (passes cryptographically verified Supabase Bearer JWT)
export function getDevUserHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getStoredAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const getAuthHeaders = getDevUserHeaders;


export async function listCommunities(params: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<{
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  results: CommunityRecord[];
}> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);

  const res = await fetch(`${BASE_URL}?${query.toString()}`, {
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to list communities (${res.status})`);
  }
  return res.json();
}

export async function lookupCommunity(show: MediaItem): Promise<{
  community: CommunityRecord;
  isMember: boolean;
  role: string | null;
}> {
  const tmdbId = show.tmdbId || Number(show.id);
  const mediaType = show.mediaType || 'tv';

  const query = new URLSearchParams({
    tmdbId: String(tmdbId),
    mediaType,
    title: show.title,
    poster: show.posterPath || '',
    backdrop: show.backdropPath || show.featuredImage || '',
    overview: show.overview || '',
  });

  const res = await fetch(`${BASE_URL}/lookup?${query.toString()}`, {
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to lookup community (${res.status})`);
  }
  return res.json();
}

export async function getCommunity(idOrSlug: string): Promise<CommunityRecord> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(idOrSlug)}`, {
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to get community (${res.status})`);
  }
  return res.json();
}

export async function joinCommunity(
  communityId: string,
  role: string = 'MEMBER'
): Promise<{ success: boolean; memberCount: number }> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(communityId)}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    throw new Error(`Failed to join community (${res.status})`);
  }
  return res.json();
}

export async function leaveCommunity(
  communityId: string
): Promise<{ success: boolean; memberCount: number }> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(communityId)}/leave`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to leave community (${res.status})`);
  }
  return res.json();
}

export async function getChannels(communityId: string): Promise<ChannelRecord[]> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(communityId)}/channels`, {
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to get channels (${res.status})`);
  }
  const data = await res.json();
  return data.channels;
}

export async function getMessages(
  communityId: string,
  channelId: string,
  limit: number = 50,
  before?: string
): Promise<MessageRecord[]> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (before) query.set('before', before);

  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent(communityId)}/channels/${encodeURIComponent(channelId)}/messages?${query.toString()}`,
    {
      headers: {
        Accept: 'application/json',
        ...getDevUserHeaders(),
      },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to get messages (${res.status})`);
  }
  const data = await res.json();
  return data.messages;
}

export async function sendMessage(
  communityId: string,
  channelId: string,
  content: string,
  isSpoiler: boolean = false
): Promise<MessageRecord> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent(communityId)}/channels/${encodeURIComponent(channelId)}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getDevUserHeaders(),
      },
      body: JSON.stringify({ content, isSpoiler }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to send message (${res.status})`);
  }
  const data = await res.json();
  return data.message;
}

export async function toggleReaction(
  communityId: string,
  channelId: string,
  messageId: string,
  emoji: string
): Promise<{ messageId: string; reactions: ReactionRecord[] }> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent(communityId)}/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}/reactions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getDevUserHeaders(),
      },
      body: JSON.stringify({ emoji }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to toggle reaction (${res.status})`);
  }
  return res.json();
}

export async function getUserHubs(customHeaders?: Record<string, string>): Promise<{
  hubs: CommunityRecord[];
  count: number;
}> {
  const res = await fetch(`${BASE_URL}/user/hubs`, {
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
      ...customHeaders,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to retrieve user hubs (${res.status})`);
  }
  return res.json();
}

export async function getPulseDiscussions(params: {
  page?: number;
  limit?: number;
  sortBy?: 'likes' | 'recent';
} = {}): Promise<{
  discussions: PulseDiscussion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  query.set('limit', String(params.limit ?? 4));
  query.set('sortBy', params.sortBy ?? 'likes');

  const res = await fetch(`${BASE_URL}/pulse?${query.toString()}`, {
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load pulse feed (${res.status})`);
  }
  return res.json();
}

export async function getDiscussionReplies(discussionId: string): Promise<DiscussionReply[]> {
  const res = await fetch(`${BASE_URL}/pulse/${encodeURIComponent(discussionId)}/replies`, {
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load replies (${res.status})`);
  }
  const data = await res.json();
  return data.replies || [];
}

export async function postDiscussionReply(
  discussionId: string,
  content: string
): Promise<{ reply: DiscussionReply; replyCount: number }> {
  const res = await fetch(`${BASE_URL}/pulse/${encodeURIComponent(discussionId)}/replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    let errMessage = `Failed to post reply (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) errMessage = err.error;
    } catch {
      // fallback
    }
    throw new Error(errMessage);
  }
  return res.json();
}

export async function togglePulseDiscussionLike(
  discussionId: string
): Promise<{ messageId: string; isLiked: boolean; likeCount: number }> {
  const res = await fetch(`${BASE_URL}/pulse/${encodeURIComponent(discussionId)}/like`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to toggle like (${res.status})`);
  }
  return res.json();
}

export async function deletePulseDiscussion(
  discussionId: string
): Promise<{ success: boolean; messageId: string }> {
  const res = await fetch(`${BASE_URL}/pulse/${encodeURIComponent(discussionId)}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });

  if (!res.ok) {
    let errMessage = `Failed to delete discussion (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) errMessage = err.error;
    } catch {
      // fallback
    }
    throw new Error(errMessage);
  }
  return res.json();
}

export async function getTheoristLeaderboard(
  period: 'week' | 'all' = 'week',
  limit: number = 5
): Promise<{
  period: 'week' | 'all';
  theorists: LeaderboardTheorist[];
  updatedAt: string;
}> {
  const query = new URLSearchParams({ period, limit: String(limit) });
  const res = await fetch(`${BASE_URL}/leaderboard?${query.toString()}`, {
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load leaderboard (${res.status})`);
  }
  return res.json();
}
