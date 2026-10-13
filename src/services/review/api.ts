import { getDevUserHeaders } from '../community/api';

export interface PopchoReview {
  id: string;
  tmdbId: number;
  mediaType: 'tv' | 'movie';
  showTitle: string;
  showPoster: string | null;
  showBackdrop: string | null;
  headline: string;
  content: string;
  rating: number; // 0.5 - 5.0
  essayType: string;
  categoryTag: string;
  hasSpoiler: boolean;
  userId: string;
  userName: string;
  userAvatar: string | null;
  userRole: string;
  helpfulCount: number;
  responsesCount: number;
  createdAt: string;
  updatedAt: string;
  isHelpfulLiked: boolean;
  isBookmarked: boolean;
}

export interface CriticRanking {
  userId: string;
  userName: string;
  userAvatar: string | null;
  userRole: string;
  reviewsCount: number;
  totalHelpful: number;
}

export interface ReviewCommentItem {
  id: string;
  reviewId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  createdAt: string;
}

export interface CreateReviewPayload {
  tmdbId: number;
  mediaType: 'tv' | 'movie';
  showTitle: string;
  showPoster?: string;
  showBackdrop?: string;
  headline: string;
  content: string;
  rating: number;
  essayType?: string;
  categoryTag?: string;
  hasSpoiler?: boolean;
}

function getReviewsBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (!envUrl) return '/api/reviews';
  const cleanUrl = envUrl.replace(/\/+$/, '');
  if (cleanUrl.endsWith('/api/reviews')) return cleanUrl;
  if (cleanUrl.endsWith('/api')) return `${cleanUrl}/reviews`;
  return `${cleanUrl}/api/reviews`;
}

const BASE_URL = getReviewsBaseUrl();

/**
 * Fetch list of PopCho community reviews from backend with search and filters.
 */
export async function listPopchoReviews(params: {
  page?: number;
  limit?: number;
  search?: string;
  filter?: string;
  showId?: string;
} = {}): Promise<{
  results: PopchoReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.filter) query.set('filter', params.filter);
  if (params.showId) query.set('showId', params.showId);

  const res = await fetch(`${BASE_URL}?${query.toString()}`, {
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });

  if (!res.ok) {
    let errorMsg = `Failed to fetch reviews (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) errorMsg = err.error;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

/**
 * Publish a new authentic community review.
 */
export async function createPopchoReview(payload: CreateReviewPayload): Promise<PopchoReview> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorMsg = `Failed to submit review (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) errorMsg = err.error;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

/**
 * Toggle helpful vote for a review.
 */
export async function toggleReviewHelpful(
  reviewId: string
): Promise<{ isHelpfulLiked: boolean; helpfulCount: number }> {
  const res = await fetch(`${BASE_URL}/${reviewId}/vote`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to update vote (${res.status})`);
  }

  return res.json();
}

/**
 * Toggle bookmark for a review.
 */
export async function toggleReviewBookmark(
  reviewId: string
): Promise<{ isBookmarked: boolean }> {
  const res = await fetch(`${BASE_URL}/${reviewId}/bookmark`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to update bookmark (${res.status})`);
  }

  return res.json();
}

/**
 * Fetch top critics ranked from actual database reviews.
 */
export async function getTopCritics(): Promise<CriticRanking[]> {
  const res = await fetch(`${BASE_URL}/critics/top`, {
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load top critics (${res.status})`);
  }

  return res.json();
}

/**
 * Fetch fan comments for a review.
 */
export async function listReviewComments(reviewId: string): Promise<ReviewCommentItem[]> {
  const res = await fetch(`${BASE_URL}/${reviewId}/comments`, {
    headers: {
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load comments (${res.status})`);
  }

  return res.json();
}

/**
 * Post a fan comment on a review.
 */
export async function postReviewComment(
  reviewId: string,
  content: string
): Promise<ReviewCommentItem> {
  const res = await fetch(`${BASE_URL}/${reviewId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getDevUserHeaders(),
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    let errorMsg = `Failed to post comment (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) errorMsg = err.error;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}
