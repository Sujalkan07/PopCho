import { prisma } from '../db/prisma.js';
import { tmdbService } from './tmdb.service.js';

export interface FindOrCreateCommunityOptions {
  tmdbId: number;
  mediaType: string;
  fallbackTitle?: string;
  fallbackPoster?: string;
  fallbackBackdrop?: string;
  fallbackOverview?: string;
}

export class CommunityService {
  /**
   * Helper to create a URL-friendly slug
   */
  private generateSlug(title: string, mediaType: string, tmdbId: number): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return `${base || 'community'}-${mediaType}-${tmdbId}`;
  }

  /**
   * Seed standard default channels for a community if they do not exist
   */
  async ensureDefaultChannels(communityId: string, showTitle: string) {
    const defaultChannels = [
      {
        name: 'theories',
        slug: 'theories',
        description: `Season clues, audio decodes, and lore mythology for ${showTitle}`,
        type: 'TEXT',
      },
      {
        name: 'general',
        slug: 'general',
        description: `General fan chatter, cast news, and community discussions`,
        type: 'TEXT',
      },
      {
        name: 'episodes',
        slug: 'episodes',
        description: `Live reactions, episode recaps, and scene breakdowns`,
        type: 'TEXT',
      },
      {
        name: 'fan-art',
        slug: 'fan-art',
        description: `Fan creations, artwork, edits, and soundtrack appreciation`,
        type: 'TEXT',
      },
    ];

    for (const ch of defaultChannels) {
      await prisma.channel.upsert({
        where: {
          communityId_slug: {
            communityId,
            slug: ch.slug,
          },
        },
        create: {
          communityId,
          name: ch.name,
          slug: ch.slug,
          description: ch.description,
          type: ch.type,
        },
        update: {},
      });
    }
  }

  /**
   * Find or create community by (tmdbId, mediaType)
   */
  async findOrCreateCommunity(options: FindOrCreateCommunityOptions) {
    const tmdbId = Number(options.tmdbId);
    const mediaType = options.mediaType === 'movie' ? 'movie' : 'tv';

    // 1. Try to find existing community
    let community = await prisma.community.findUnique({
      where: {
        tmdbId_mediaType: {
          tmdbId,
          mediaType,
        },
      },
      include: {
        channels: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            memberships: true,
            channels: true,
          },
        },
      },
    });

    if (community) {
      // Ensure default channels exist
      if (community.channels.length === 0) {
        await this.ensureDefaultChannels(community.id, community.title);
        community = await prisma.community.findUnique({
          where: { id: community.id },
          include: {
            channels: { orderBy: { createdAt: 'asc' } },
            _count: { select: { memberships: true, channels: true } },
          },
        });
      }
      return community!;
    }

    // 2. Fetch verified entertainment metadata from TMDB
    let title = options.fallbackTitle || 'Untitled Hub';
    let description = options.fallbackOverview || '';
    let posterPath = options.fallbackPoster || '';
    let backdropPath = options.fallbackBackdrop || '';

    try {
      const details = await tmdbService.getDetails(tmdbId, mediaType);
      if (details) {
        title = details.title || title;
        description = details.overview || description;
        posterPath = details.posterPath || posterPath;
        backdropPath = details.backdropPath || backdropPath;
      }
    } catch (err) {
      console.warn(`[CommunityService] Failed to fetch TMDB details for ${mediaType}/${tmdbId}, using fallbacks:`, err);
    }

    const slug = this.generateSlug(title, mediaType, tmdbId);

    // 3. Create community in database
    community = await prisma.community.upsert({
      where: {
        tmdbId_mediaType: {
          tmdbId,
          mediaType,
        },
      },
      create: {
        tmdbId,
        mediaType,
        title,
        slug,
        description,
        posterPath,
        backdropPath,
      },
      update: {
        title,
        description,
        posterPath,
        backdropPath,
      },
      include: {
        channels: true,
        _count: { select: { memberships: true, channels: true } },
      },
    });

    // 4. Seed default channels
    await this.ensureDefaultChannels(community.id, community.title);

    // Reload with created channels
    const refreshed = await prisma.community.findUnique({
      where: { id: community.id },
      include: {
        channels: { orderBy: { createdAt: 'asc' } },
        _count: { select: { memberships: true, channels: true } },
      },
    });

    return refreshed!;
  }

  /**
   * Retrieve community by ID or slug
   */
  async getCommunityByIdOrSlug(idOrSlug: string, userId?: string) {
    const community = await prisma.community.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        channels: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            memberships: true,
            channels: true,
          },
        },
      },
    });

    if (!community) return null;

    let isMember = false;
    let membershipRole: string | null = null;

    if (userId) {
      const membership = await prisma.membership.findUnique({
        where: {
          communityId_userId: {
            communityId: community.id,
            userId,
          },
        },
      });
      if (membership) {
        isMember = true;
        membershipRole = membership.role;
      }
    }

    return {
      ...community,
      isMember,
      membershipRole,
    };
  }

  /**
   * List communities with pagination and search
   */
  async listCommunities(params: {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.search && params.search.trim()) {
      where.title = {
        contains: params.search.trim(),
        mode: 'insensitive',
      };
    }

    const [total, communities] = await Promise.all([
      prisma.community.count({ where }),
      prisma.community.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          channels: {
            take: 4,
            orderBy: { createdAt: 'asc' },
          },
          _count: {
            select: {
              memberships: true,
              channels: true,
            },
          },
        },
      }),
    ]);

    // Check membership for user if provided
    let userMemberships = new Set<string>();
    if (params.userId && communities.length > 0) {
      const communityIds = communities.map((c) => c.id);
      const memberships = await prisma.membership.findMany({
        where: {
          userId: params.userId,
          communityId: { in: communityIds },
        },
        select: { communityId: true },
      });
      userMemberships = new Set(memberships.map((m) => m.communityId));
    }

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      results: communities.map((c) => ({
        ...c,
        memberCount: c._count.memberships,
        channelCount: c._count.channels,
        isMember: userMemberships.has(c.id),
      })),
    };
  }

  /**
   * Join a community (idempotent upsert)
   */
  async joinCommunity(communityId: string, userId: string, role = 'MEMBER') {
    // Verify community exists
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      throw new Error('Community not found');
    }

    const membership = await prisma.membership.upsert({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
      create: {
        communityId,
        userId,
        role,
      },
      update: {
        role,
      },
    });

    const memberCount = await prisma.membership.count({
      where: { communityId },
    });

    return {
      membership,
      memberCount,
    };
  }

  /**
   * Leave a community
   */
  async leaveCommunity(communityId: string, userId: string) {
    await prisma.membership.deleteMany({
      where: {
        communityId,
        userId,
      },
    });

    const memberCount = await prisma.membership.count({
      where: { communityId },
    });

    return {
      success: true,
      memberCount,
    };
  }

  /**
   * Check membership status
   */
  async getMembershipStatus(communityId: string, userId: string) {
    const membership = await prisma.membership.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    return {
      isMember: Boolean(membership),
      role: membership?.role || null,
      joinedAt: membership?.joinedAt || null,
    };
  }
}

export const communityService = new CommunityService();
