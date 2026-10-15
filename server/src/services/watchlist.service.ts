import { prisma } from '../db/prisma.js';

export interface WatchlistInput {
  tmdbId: number;
  mediaType: string;
  title: string;
  posterPath?: string | null;
}

export class WatchlistService {
  /**
   * Get all watchlist items for a specific user
   */
  async getUserWatchlist(userId: string) {
    return prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if a specific show is in the user's watchlist
   */
  async isInWatchlist(userId: string, tmdbId: number, mediaType: string) {
    const count = await prisma.watchlist.count({
      where: {
        userId,
        tmdbId,
        mediaType,
      },
    });
    return count > 0;
  }

  /**
   * Get list of tmdbIds in user's watchlist for fast UI state checks
   */
  async getUserWatchlistKeys(userId: string) {
    const items = await prisma.watchlist.findMany({
      where: { userId },
      select: {
        tmdbId: true,
        mediaType: true,
      },
    });

    return items.map((i) => ({
      tmdbId: i.tmdbId,
      mediaType: i.mediaType,
      key: `${i.mediaType}-${i.tmdbId}`,
    }));
  }

  /**
   * Toggle item in user's watchlist (atomic add/remove)
   */
  async toggleItem(userId: string, item: WatchlistInput) {
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_tmdbId_mediaType: {
          userId,
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
        },
      },
    });

    if (existing) {
      await prisma.watchlist.delete({
        where: { id: existing.id },
      });
      return {
        action: 'removed' as const,
        inWatchlist: false,
        item: existing,
      };
    } else {
      const created = await prisma.watchlist.create({
        data: {
          userId,
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          title: item.title,
          posterPath: item.posterPath || null,
        },
      });
      return {
        action: 'added' as const,
        inWatchlist: true,
        item: created,
      };
    }
  }

  /**
   * Explicitly remove an item
   */
  async removeItem(userId: string, tmdbId: number, mediaType: string) {
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_tmdbId_mediaType: {
          userId,
          tmdbId,
          mediaType,
        },
      },
    });

    if (existing) {
      await prisma.watchlist.delete({
        where: { id: existing.id },
      });
    }

    return { removed: Boolean(existing) };
  }
}

export const watchlistService = new WatchlistService();
