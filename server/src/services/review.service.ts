import prisma from '../db/prisma.js';
import type { UserIdentity } from '../middleware/auth.middleware.js';

export interface CreateReviewInput {
  tmdbId: number;
  mediaType?: 'tv' | 'movie';
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

export interface ListReviewsQuery {
  page?: number;
  limit?: number;
  search?: string;
  filter?: string; // 'all' | '5-star' | 'most-helpful' | 'season-finales' | 'controversial'
  showId?: string;
}

export class ReviewService {
  /**
   * Create a new PopCho community review.
   * Author identity is strictly derived from verified session/token user.
   */
  async createReview(input: CreateReviewInput, user: UserIdentity) {
    if (!input.showTitle || !input.showTitle.trim()) {
      throw new Error('Show title is required');
    }
    if (!input.headline || !input.headline.trim()) {
      throw new Error('Review headline is required');
    }
    if (!input.content || !input.content.trim()) {
      throw new Error('Review body content is required');
    }

    const rating = Number(input.rating);
    if (isNaN(rating) || rating < 0.5 || rating > 5.0) {
      throw new Error('Rating must be between 0.5 and 5.0 stars');
    }

    const tmdbId = Number(input.tmdbId) || 0;
    const mediaType = input.mediaType === 'movie' ? 'movie' : 'tv';

    const review = await prisma.review.create({
      data: {
        tmdbId,
        mediaType,
        showTitle: input.showTitle.trim(),
        showPoster: input.showPoster?.trim() || null,
        showBackdrop: input.showBackdrop?.trim() || null,
        headline: input.headline.trim(),
        content: input.content.trim(),
        rating,
        essayType: input.essayType?.trim() || 'Comprehensive Analysis',
        categoryTag: input.categoryTag?.trim() || 'Community Critique',
        hasSpoiler: Boolean(input.hasSpoiler),
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar || null,
        userRole: user.role || 'Community Critic',
        helpfulCount: 0,
      },
      include: {
        _count: {
          select: { comments: true, votes: true },
        },
      },
    });

    return {
      ...review,
      responsesCount: review._count.comments,
      isHelpfulLiked: false,
      isBookmarked: false,
    };
  }

  /**
   * List reviews with multi-mode filtering, search, and user state mapping.
   */
  async listReviews(query: ListReviewsQuery, currentUserId?: string) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Search query matches headline, content, show title, or author name
    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { headline: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { showTitle: { contains: q, mode: 'insensitive' } },
        { userName: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Specific show filter if passed
    if (query.showId && query.showId.trim()) {
      const parsedId = Number(query.showId);
      if (!isNaN(parsedId)) {
        where.tmdbId = parsedId;
      }
    }

    // Sort order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any = { createdAt: 'desc' };

    // Active Filter handling
    if (query.filter === '5-star' || query.filter === '★ 5-Star Masterpieces') {
      where.rating = { gte: 5.0 };
    } else if (query.filter === 'most-helpful' || query.filter === 'Most Helpful') {
      orderBy = [{ helpfulCount: 'desc' }, { createdAt: 'desc' }];
    } else if (query.filter === 'season-finales' || query.filter === 'Season Finales') {
      where.OR = [
        ...(where.OR || []),
        { categoryTag: { contains: 'finale', mode: 'insensitive' } },
        { headline: { contains: 'finale', mode: 'insensitive' } },
        { showTitle: { contains: 'finale', mode: 'insensitive' } },
      ];
    } else if (query.filter === 'controversial' || query.filter === 'Controversial Takes') {
      // Data-supported rule for controversial reviews:
      // Reviews with lower score (<= 3.5), or critical score with spoiler warnings
      where.OR = [
        { rating: { lte: 3.5 } },
        { AND: [{ rating: { lte: 4.0 } }, { hasSpoiler: true }] },
      ];
    }

    const [total, rawReviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: {
            select: { comments: true, votes: true },
          },
          votes: currentUserId
            ? {
                where: { userId: currentUserId },
                select: { userId: true },
              }
            : false,
          bookmarks: currentUserId
            ? {
                where: { userId: currentUserId },
                select: { userId: true },
              }
            : false,
        },
      }),
    ]);

    const results = rawReviews.map((rev) => {
      const isHelpfulLiked = currentUserId ? rev.votes?.length > 0 : false;
      const isBookmarked = currentUserId ? rev.bookmarks?.length > 0 : false;

      return {
        id: rev.id,
        tmdbId: rev.tmdbId,
        mediaType: rev.mediaType,
        showTitle: rev.showTitle,
        showPoster: rev.showPoster,
        showBackdrop: rev.showBackdrop,
        headline: rev.headline,
        content: rev.content,
        rating: rev.rating,
        essayType: rev.essayType,
        categoryTag: rev.categoryTag,
        hasSpoiler: rev.hasSpoiler,
        userId: rev.userId,
        userName: rev.userName,
        userAvatar: rev.userAvatar,
        userRole: rev.userRole,
        helpfulCount: rev.helpfulCount,
        responsesCount: rev._count.comments,
        createdAt: rev.createdAt.toISOString(),
        updatedAt: rev.updatedAt.toISOString(),
        isHelpfulLiked,
        isBookmarked,
      };
    });

    return {
      results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Toggle helpful vote atomically.
   */
  async toggleHelpful(reviewId: string, userId: string) {
    const existing = await prisma.reviewVote.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    });

    if (existing) {
      // Remove vote
      await prisma.$transaction([
        prisma.reviewVote.delete({
          where: { id: existing.id },
        }),
        prisma.review.update({
          where: { id: reviewId },
          data: {
            helpfulCount: {
              decrement: 1,
            },
          },
        }),
      ]);

      const updated = await prisma.review.findUnique({
        where: { id: reviewId },
        select: { helpfulCount: true },
      });

      return {
        isHelpfulLiked: false,
        helpfulCount: Math.max(0, updated?.helpfulCount ?? 0),
      };
    } else {
      // Add vote
      await prisma.$transaction([
        prisma.reviewVote.create({
          data: {
            reviewId,
            userId,
          },
        }),
        prisma.review.update({
          where: { id: reviewId },
          data: {
            helpfulCount: {
              increment: 1,
            },
          },
        }),
      ]);

      const updated = await prisma.review.findUnique({
        where: { id: reviewId },
        select: { helpfulCount: true },
      });

      return {
        isHelpfulLiked: true,
        helpfulCount: updated?.helpfulCount ?? 1,
      };
    }
  }

  /**
   * Toggle bookmark atomically.
   */
  async toggleBookmark(reviewId: string, userId: string) {
    const existing = await prisma.reviewBookmark.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    });

    if (existing) {
      await prisma.reviewBookmark.delete({
        where: { id: existing.id },
      });
      return { isBookmarked: false };
    } else {
      await prisma.reviewBookmark.create({
        data: {
          reviewId,
          userId,
        },
      });
      return { isBookmarked: true };
    }
  }

  /**
   * Add a comment to a review.
   */
  async addComment(reviewId: string, content: string, user: UserIdentity) {
    if (!content || !content.trim()) {
      throw new Error('Comment cannot be empty');
    }

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new Error('Review not found');
    }

    return await prisma.reviewComment.create({
      data: {
        reviewId,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar || null,
        content: content.trim(),
      },
    });
  }

  /**
   * List comments for a review.
   */
  async listComments(reviewId: string) {
    return await prisma.reviewComment.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Aggregate real critic rankings from database.
   * Returns empty array if no critics exist yet (no fabricated ranks).
   */
  async getTopCritics() {
    const rawReviews = await prisma.review.findMany({
      select: {
        userId: true,
        userName: true,
        userAvatar: true,
        userRole: true,
        helpfulCount: true,
      },
    });

    if (rawReviews.length === 0) {
      return [];
    }

    const criticMap = new Map<
      string,
      {
        userId: string;
        userName: string;
        userAvatar: string | null;
        userRole: string;
        reviewsCount: number;
        totalHelpful: number;
      }
    >();

    for (const r of rawReviews) {
      const existing = criticMap.get(r.userId);
      if (existing) {
        existing.reviewsCount += 1;
        existing.totalHelpful += r.helpfulCount;
      } else {
        criticMap.set(r.userId, {
          userId: r.userId,
          userName: r.userName,
          userAvatar: r.userAvatar,
          userRole: r.userRole || 'Community Critic',
          reviewsCount: 1,
          totalHelpful: r.helpfulCount,
        });
      }
    }

    const ranked = Array.from(criticMap.values())
      .sort((a, b) => b.reviewsCount - a.reviewsCount || b.totalHelpful - a.totalHelpful)
      .slice(0, 5);

    return ranked;
  }

  /**
   * Delete a review with strict user ownership enforcement.
   */
  async deleteReview(reviewId: string, userId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) {
      const err = new Error('Review not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }
    if (review.userId !== userId) {
      const err = new Error('Unauthorized to delete this review');
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    }
    await prisma.review.delete({
      where: { id: reviewId },
    });
    return { success: true, message: 'Review deleted successfully' };
  }
}

export const reviewService = new ReviewService();
