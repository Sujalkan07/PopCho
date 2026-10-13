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

function getCommunityApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (!envUrl) return '/api/communities';
  const cleanUrl = envUrl.replace(/\/+$/, '');
  if (cleanUrl.endsWith('/api/communities')) return cleanUrl;
  if (cleanUrl.endsWith('/api')) return `${cleanUrl}/communities`;
  return `${cleanUrl}/api/communities`;
}

const BASE_URL = getCommunityApiBaseUrl();

// Helper for development identity headers
export function getDevUserHeaders(): Record<string, string> {
  const savedUser = localStorage.getItem('popcho_user');
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      return {
        'x-user-id': parsed.id || 'user_fan_01',
        'x-user-name': parsed.name || 'You (Fan)',
        'x-user-avatar': parsed.avatar || '',
        'x-user-role': parsed.role || 'Community Member',
      };
    } catch {
      // fallback
    }
  }
  return {
    'x-user-id': 'user_fan_01',
    'x-user-name': 'You (Fan)',
  };
}

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
