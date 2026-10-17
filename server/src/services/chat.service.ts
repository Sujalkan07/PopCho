import { prisma } from '../db/prisma.js';

export interface FormattedReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface FormattedMessage {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: string;
  content: string;
  isSpoiler: boolean;
  createdAt: string;
  reactions: FormattedReaction[];
}

export class ChatService {
  /**
   * Helper to format a Prisma Message and its reactions into frontend FormattedMessage
   */
  private formatMessage(
    msg: {
      id: string;
      channelId: string;
      userId: string;
      content: string;
      isSpoiler: boolean;
      createdAt: Date;
      reactions: Array<{ id: string; emoji: string; userId: string }>;
    },
    authorDetails?: { name?: string; avatar?: string; role?: string }
  ): FormattedMessage {
    // Group reactions by emoji
    const reactionMap = new Map<string, string[]>();
    for (const r of msg.reactions || []) {
      const users = reactionMap.get(r.emoji) || [];
      users.push(r.userId);
      reactionMap.set(r.emoji, users);
    }

    const reactions: FormattedReaction[] = Array.from(reactionMap.entries()).map(([emoji, users]) => ({
      emoji,
      count: users.length,
      users,
    }));

    return {
      id: msg.id,
      channelId: msg.channelId,
      userId: msg.userId,
      userName: authorDetails?.name || `User_${msg.userId.slice(0, 6)}`,
      userAvatar:
        authorDetails?.avatar ||
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBmNfypXexpUqGV6ruN3XC8n2OqYyfzM-rHCYQH9eIHwRrMERZmMPSMVhkWDh7lAeFDaMoIKQEcn8pdfMMGDKqiI4PsbTQxIEly40c9OC_7jeis6uUX0Xmau1lUS3kAo7bw8bA67k1U1vhNTC8RwMbUTFVgQAOvm-N4cKCenSDe7FIT_9PVezInr_GDwS61-H7-0B_F9PO1zaeOr3XWdla-rkuVL8j2MXny0EU59iaaB5L157FxLwbvqw',
      userRole: authorDetails?.role || 'Community Member',
      content: msg.content,
      isSpoiler: msg.isSpoiler,
      createdAt: msg.createdAt.toISOString(),
      reactions,
    };
  }

  /**
   * Get channels for a community
   */
  async getChannels(communityId: string) {
    const channels = await prisma.channel.findMany({
      where: { communityId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return channels.map((c) => ({
      id: c.id,
      communityId: c.communityId,
      name: c.name,
      slug: c.slug,
      description: c.description,
      type: c.type,
      isSpoilerSafe: c.slug.includes('theory') || c.slug.includes('episode') || c.slug.includes('spoiler'),
      messageCount: c._count.messages,
    }));
  }

  /**
   * Get single channel by ID
   */
  async getChannelById(channelId: string) {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { community: true },
    });
    if (channel) return channel;

    // Fallback: If channelId is a preview or fallback string, match by slug
    if (channelId.includes('gen') || channelId.includes('theor') || channelId.includes('spoil') || channelId.startsWith('ch-')) {
      const slug = channelId.includes('theor') ? 'theories' : channelId.includes('spoil') ? 'spoilers' : 'general';
      const fallbackChannel = await prisma.channel.findFirst({
        where: { slug },
        include: { community: true },
      });
      if (fallbackChannel) return fallbackChannel;
    }

    return null;
  }

  /**
   * Verify that a channel belongs to a specific community
   */
  async verifyChannelInCommunity(communityId: string, channelId: string): Promise<boolean> {
    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        communityId,
      },
      select: { id: true },
    });
    return Boolean(channel);
  }

  /**
   * Get messages for a channel with pagination (newest messages first, returned in chronological order)
   */
  async getChannelMessages(channelId: string, options: { limit?: number; before?: string }) {
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));

    const where: Record<string, unknown> = { channelId };
    if (options.before) {
      const cursorMsg = await prisma.message.findUnique({
        where: { id: options.before },
        select: { createdAt: true },
      });
      if (cursorMsg) {
        where.createdAt = { lt: cursorMsg.createdAt };
      }
    }

    // Query newest messages first
    const messages = await prisma.message.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        reactions: true,
      },
    });

    const userIds = Array.from(new Set(messages.map((m) => m.userId)));
    let profileMap = new Map<
      string,
      { displayName?: string | null; username?: string | null; avatarUrl?: string | null; role?: string | null }
    >();
    if (userIds.length > 0) {
      try {
        const profiles = await prisma.profile.findMany({
          where: { id: { in: userIds } },
          select: { id: true, displayName: true, username: true, avatarUrl: true, role: true },
        });
        profileMap = new Map(profiles.map((p) => [p.id, p]));
      } catch {
        // Fallback gracefully if profiles table lookup fails
      }
    }

    // Reverse into chronological order (oldest to newest) for client display with authentic author details
    return messages.reverse().map((m) => {
      const prof = profileMap.get(m.userId);
      return this.formatMessage(m, prof ? {
        name: prof.displayName || prof.username || undefined,
        avatar: prof.avatarUrl || undefined,
        role: prof.role || undefined,
      } : undefined);
    });
  }

  /**
   * Create a message in a channel
   */
  async createMessage(params: {
    channelId: string;
    userId: string;
    content: string;
    isSpoiler?: boolean;
    userName?: string;
    userAvatar?: string;
    userRole?: string;
  }) {
    const cleanContent = params.content?.trim();
    if (!cleanContent) {
      throw new Error('Message content cannot be empty');
    }
    if (cleanContent.length > 2000) {
      throw new Error('Message content exceeds 2000 character limit');
    }

    // Verify channel exists
    let channel = await prisma.channel.findUnique({
      where: { id: params.channelId },
    });
    if (!channel) {
      if (params.channelId.includes('theor') || params.channelId.includes('spoil') || params.channelId.includes('gen') || params.channelId.startsWith('ch-')) {
        const slug = params.channelId.includes('theor') ? 'theories' : params.channelId.includes('spoil') ? 'spoilers' : 'general';
        channel = await prisma.channel.findFirst({
          where: { slug },
        });
      }
    }
    if (!channel) {
      throw new Error('Channel not found');
    }

    const message = await prisma.message.create({
      data: {
        channelId: channel.id,
        userId: params.userId,
        content: cleanContent,
        isSpoiler: Boolean(params.isSpoiler),
      },
      include: {
        reactions: true,
      },
    });

    let authorName = params.userName;
    let authorAvatar = params.userAvatar;
    let authorRole = params.userRole;
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: params.userId },
        select: { displayName: true, username: true, avatarUrl: true, role: true },
      });
      if (profile) {
        authorName = profile.displayName || profile.username || authorName;
        authorAvatar = profile.avatarUrl || authorAvatar;
        authorRole = profile.role || authorRole;
      }
    } catch {
      // Fallback
    }

    return this.formatMessage(message, {
      name: authorName,
      avatar: authorAvatar,
      role: authorRole,
    });
  }

  /**
   * Toggle emoji reaction on a message
   */
  async toggleReaction(params: {
    messageId: string;
    userId: string;
    emoji: string;
  }) {
    const { messageId, userId, emoji } = params;
    if (!emoji || !emoji.trim()) {
      throw new Error('Emoji is required');
    }

    const existing = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (existing) {
      // Remove reaction
      await prisma.reaction.delete({
        where: { id: existing.id },
      });
    } else {
      // Add reaction
      await prisma.reaction.create({
        data: {
          messageId,
          userId,
          emoji,
        },
      });
    }

    // Fetch updated reactions for this message
    const allReactions = await prisma.reaction.findMany({
      where: { messageId },
    });

    const reactionMap = new Map<string, string[]>();
    for (const r of allReactions) {
      const users = reactionMap.get(r.emoji) || [];
      users.push(r.userId);
      reactionMap.set(r.emoji, users);
    }

    const formattedReactions: FormattedReaction[] = Array.from(reactionMap.entries()).map(
      ([e, users]) => ({
        emoji: e,
        count: users.length,
        users,
      })
    );

    return {
      messageId,
      reactions: formattedReactions,
    };
  }

  /**
   * Derive badge label from author role
   */
  private deriveBadge(role?: string | null): string {
    if (!role) return 'Community Voice';
    const lower = role.toLowerCase();
    if (lower.includes('theorist')) return 'Top Theorist';
    if (lower.includes('scholar') || lower.includes('lore')) return 'Lore Scholar';
    if (lower.includes('critic') || lower.includes('verified')) return 'Verified Critic';
    if (lower.includes('staff') || lower.includes('writer')) return 'Staff Writer';
    if (lower.includes('mod') || lower.includes('admin')) return 'Community Mod';
    return 'Active Member';
  }

  /**
   * Derive category pill label from channel name and slug
   */
  private deriveCategory(channelSlug: string, channelName: string): string {
    const lower = (channelSlug + ' ' + channelName).toLowerCase();
    if (lower.includes('theor')) return 'Theory Breakdown';
    if (lower.includes('debate') || lower.includes('active')) return 'Active Debate';
    if (lower.includes('char') || lower.includes('study')) return 'Character Study';
    if (lower.includes('final') || lower.includes('end')) return 'Finale Breakdown';
    if (lower.includes('episo')) return 'Episode Analysis';
    return 'Community Discussion';
  }

  /**
   * Ensure initial high-signal community discussions exist in PostgreSQL
   */
  async ensureSeedDiscussions() {
    try {
      const existingSubstantial = await prisma.message.count({
        where: {
          parentId: null,
          content: {
            contains: ' ',
          },
        },
      });

      if (existingSubstantial >= 3) {
        return;
      }

      // Find or create initial author profiles
      const seedProfiles = [
        {
          id: 'user_theorist_duffer',
          displayName: 'DufferFanatic',
          username: 'DufferFanatic',
          role: 'Top Theorist',
          avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDH-t7vGqWvEjdY7gIYk78Mz067Z3OT5RRYwIy4oy4EdHpZv4DFkukoFFkmO9DVte04gYDKhOFYOazkMFBTW57BZR07sVpyr6oKY584FZD8r7qtNOtMB43ciT9EuZQWpIrm63RE4JnSgz_boJQl2-GTbW1Z0FpEeilRjjOk6HMNTNBkE0JTYE7XdawKRN6aYUfanqu-hs2QAl17sLdAzZgRPCQ39JZHP0Xg3GIp687fUOvXTMz23FTDYw',
        },
        {
          id: 'user_theorist_piltover',
          displayName: 'PiltoverEnforcer',
          username: 'PiltoverEnforcer',
          role: 'Lore Scholar',
          avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-OEhqrztoiuY3OF8Xz2OvuFiCAqSNQaMm5_ePv2942nZblHmEi7oCN-rfgjJrMmVQ2X8AjDzG8nqHt10ogaiUO7RKbzdloEhrP2geWoYQgcA2n-HOUCIfRPgWyu42hfeCr5TLcAQ4bGYD-gs1u9M7cY5LnzkA_DYbZ8NKIdbdWjp7HgsKMbi5SBk5Hb2fGRXrPkai-KXdC7_h47eaVWrq6Z6ChDk8SFg7T2mWKFmqZdwDNF3sMssLew',
        },
        {
          id: 'user_theorist_amy',
          displayName: 'AmyLau99',
          username: 'AmyLau99',
          role: 'Staff Writer',
          avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9YujzyFxBd8bwKWKIljFYwAyykS4XfL3B6GQOBWV9M7PInZW_8JKBd9PySannT0X7SyR9QegzE3gvZ78W4P5QSYCUeQ9SNn886VffJHp2TIIA1omGPO6mgh8H6qpvXFQ2fpsxn_7TE70YAXG43DyM1UhvHgsy_asPi5UmIJebxxl-SFWpviEKOBCjp2Tne4YhUtmBO69ktSKRgqadXQwpeY2mL49KfTLoc-XtAtHf0HBGLHgTTwLTkA',
        },
      ];

      for (const p of seedProfiles) {
        await prisma.profile.upsert({
          where: { id: p.id },
          create: p,
          update: { displayName: p.displayName, avatarUrl: p.avatarUrl, role: p.role },
        });
      }

      // Check for Stranger Things, Dark, or Breaking Bad communities
      const strangerThings = await prisma.community.findFirst({
        where: { title: { contains: 'Stranger Things', mode: 'insensitive' } },
        include: { channels: true },
      });

      const dark = await prisma.community.findFirst({
        where: { title: { contains: 'Dark', mode: 'insensitive' } },
        include: { channels: true },
      });

      const breakingBad = await prisma.community.findFirst({
        where: { title: { contains: 'Breaking Bad', mode: 'insensitive' } },
        include: { channels: true },
      });

      // Target channels
      const stChannel = strangerThings?.channels.find((c) => c.slug.includes('theor')) || strangerThings?.channels[0];
      const darkChannel = dark?.channels.find((c) => c.slug.includes('theor')) || dark?.channels[0];
      const bbChannel = breakingBad?.channels.find((c) => c.slug.includes('theor')) || breakingBad?.channels[0];

      if (stChannel) {
        const msg1 = await prisma.message.create({
          data: {
            channelId: stChannel.id,
            userId: 'user_theorist_duffer',
            content: "Look at the grandfather clock chiming at exactly 14:02 in the S5 teaser. It matches Will's season 2 crayon drawing coordinates to the millimeter. There's no way that's a coincidence...",
            isSpoiler: false,
          },
        });
        // Seed reactions
        await prisma.reaction.createMany({
          data: [
            { messageId: msg1.id, userId: 'user_theorist_piltover', emoji: '❤️' },
            { messageId: msg1.id, userId: 'user_theorist_amy', emoji: '❤️' },
          ],
          skipDuplicates: true,
        });
        // Seed a sample reply
        await prisma.message.create({
          data: {
            channelId: stChannel.id,
            parentId: msg1.id,
            userId: 'user_theorist_piltover',
            content: "The audio pitch shift when the chime echoes also aligns with the season 4 Vecna audio cues!",
            isSpoiler: false,
          },
        });
      }

      if (darkChannel) {
        const msg2 = await prisma.message.create({
          data: {
            channelId: darkChannel.id,
            userId: 'user_theorist_piltover',
            content: "Why the origin world's Tannhaus machine is the only true fixed point: Jonas and Martha do not break time; they fulfill the exact conditions that allow their own worlds to never exist.",
            isSpoiler: true,
          },
        });
        await prisma.reaction.createMany({
          data: [
            { messageId: msg2.id, userId: 'user_theorist_duffer', emoji: '❤️' },
            { messageId: msg2.id, userId: 'user_theorist_amy', emoji: '🔥' },
          ],
          skipDuplicates: true,
        });
        await prisma.message.create({
          data: {
            channelId: darkChannel.id,
            parentId: msg2.id,
            userId: 'user_theorist_amy',
            content: "The 33-year cycle mirror symmetry in episode 7 confirms this exact interpretation.",
            isSpoiler: true,
          },
        });
      }

      if (bbChannel) {
        const msg3 = await prisma.message.create({
          data: {
            channelId: bbChannel.id,
            userId: 'user_theorist_amy',
            content: "Felina is the only finale of the golden age where the antihero achieves every tangible goal he set in the pilot, yet dies completely spiritually bankrupt in an automated meth lab.",
            isSpoiler: false,
          },
        });
        await prisma.reaction.createMany({
          data: [
            { messageId: msg3.id, userId: 'user_theorist_duffer', emoji: '❤️' },
          ],
          skipDuplicates: true,
        });
      }
    } catch (err) {
      console.warn('[ChatService] ensureSeedDiscussions note:', err);
    }
  }

  /**
   * Retrieve community pulse discussions across active communities
   */
  async getPulseDiscussions(options: {
    page?: number;
    limit?: number;
    sortBy?: 'likes' | 'recent';
    currentUserId?: string;
  }) {
    await this.ensureSeedDiscussions();

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(30, Math.max(1, Number(options.limit) || 4));
    const skip = (page - 1) * limit;

    const sortBy = options.sortBy || 'likes';
    const orderBy = sortBy === 'recent'
      ? { createdAt: 'desc' as const }
      : [
          { reactions: { _count: 'desc' as const } },
          { createdAt: 'desc' as const },
        ];

    const [total, rawMessages] = await Promise.all([
      prisma.message.count({
        where: { parentId: null },
      }),
      prisma.message.findMany({
        where: { parentId: null },
        orderBy,
        skip,
        take: limit,
        include: {
          channel: {
            include: {
              community: true,
            },
          },
          reactions: true,
          _count: {
            select: {
              replies: true,
              reactions: true,
            },
          },
        },
      }),
    ]);

    // Batch lookup author profiles
    const userIds = Array.from(new Set(rawMessages.map((m) => m.userId)));
    const profiles = await prisma.profile.findMany({
      where: { id: { in: userIds } },
    });
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const discussions = rawMessages.map((msg) => {
      const prof = profileMap.get(msg.userId);
      const authorName = prof?.displayName || prof?.username || `User_${msg.userId.slice(0, 6)}`;
      const authorRole = prof?.role || 'Community Member';
      const authorAvatar =
        prof?.avatarUrl ||
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBmNfypXexpUqGV6ruN3XC8n2OqYyfzM-rHCYQH9eIHwRrMERZmMPSMVhkWDh7lAeFDaMoIKQEcn8pdfMMGDKqiI4PsbTQxIEly40c9OC_7jeis6uUX0Xmau1lUS3kAo7bw8bA67k1U1vhNTC8RwMbUTFVgQAOvm-N4cKCenSDe7FIT_9PVezInr_GDwS61-H7-0B_F9PO1zaeOr3XWdla-rkuVL8j2MXny0EU59iaaB5L157FxLwbvqw';

      const isLiked = options.currentUserId
        ? msg.reactions.some((r) => r.userId === options.currentUserId && (r.emoji === '❤️' || r.emoji === 'like'))
        : false;

      // Group reactions
      const reactionMap = new Map<string, string[]>();
      for (const r of msg.reactions) {
        const users = reactionMap.get(r.emoji) || [];
        users.push(r.userId);
        reactionMap.set(r.emoji, users);
      }

      const formattedReactions: FormattedReaction[] = Array.from(reactionMap.entries()).map(
        ([emoji, users]) => ({
          emoji,
          count: users.length,
          users,
        })
      );

      return {
        id: msg.id,
        channelId: msg.channelId,
        content: msg.content,
        isSpoiler: msg.isSpoiler,
        createdAt: msg.createdAt.toISOString(),
        author: {
          id: msg.userId,
          name: authorName.startsWith('@') ? authorName : `@${authorName}`,
          avatar: authorAvatar,
          role: authorRole,
          badge: this.deriveBadge(authorRole),
        },
        show: {
          id: msg.channel.community.id,
          title: msg.channel.community.title,
          slug: msg.channel.community.slug,
          tmdbId: msg.channel.community.tmdbId,
          mediaType: msg.channel.community.mediaType,
          posterPath: msg.channel.community.posterPath,
          backdropPath: msg.channel.community.backdropPath,
        },
        channel: {
          id: msg.channel.id,
          name: msg.channel.name,
          slug: msg.channel.slug,
        },
        categoryTag: this.deriveCategory(msg.channel.slug, msg.channel.name),
        subtopic: msg.channel.name.replace(/^general-?/, '').replace(/-/g, ' ') || 'Discussion',
        likeCount: msg.reactions.length,
        isLiked,
        replyCount: msg._count.replies,
        reactions: formattedReactions,
      };
    });

    return {
      discussions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get replies for a specific discussion
   */
  async getDiscussionReplies(discussionId: string, _currentUserId?: string) {
    const replies = await prisma.message.findMany({
      where: { parentId: discussionId },
      orderBy: { createdAt: 'asc' },
      include: {
        reactions: true,
      },
    });

    const userIds = Array.from(new Set(replies.map((r) => r.userId)));
    const profiles = await prisma.profile.findMany({
      where: { id: { in: userIds } },
    });
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    return replies.map((r) => {
      const prof = profileMap.get(r.userId);
      const name = prof?.displayName || prof?.username || `User_${r.userId.slice(0, 6)}`;
      const role = prof?.role || 'Community Member';
      const avatar =
        prof?.avatarUrl ||
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBmNfypXexpUqGV6ruN3XC8n2OqYyfzM-rHCYQH9eIHwRrMERZmMPSMVhkWDh7lAeFDaMoIKQEcn8pdfMMGDKqiI4PsbTQxIEly40c9OC_7jeis6uUX0Xmau1lUS3kAo7bw8bA67k1U1vhNTC8RwMbUTFVgQAOvm-N4cKCenSDe7FIT_9PVezInr_GDwS61-H7-0B_F9PO1zaeOr3XWdla-rkuVL8j2MXny0EU59iaaB5L157FxLwbvqw';

      return {
        id: r.id,
        discussionId: r.parentId!,
        content: r.content,
        isSpoiler: r.isSpoiler,
        createdAt: r.createdAt.toISOString(),
        author: {
          id: r.userId,
          name: name.startsWith('@') ? name : `@${name}`,
          avatar,
          role,
        },
      };
    });
  }

  /**
   * Create a reply to an existing discussion
   */
  async createDiscussionReply(
    discussionId: string,
    userId: string,
    content: string,
    userMeta?: { name?: string; avatar?: string; role?: string }
  ) {
    const parent = await prisma.message.findUnique({
      where: { id: discussionId },
      select: { id: true, channelId: true },
    });

    if (!parent) {
      throw new Error('Discussion not found');
    }

    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error('Reply content cannot be empty');
    }

    const reply = await prisma.message.create({
      data: {
        channelId: parent.channelId,
        parentId: parent.id,
        userId,
        content: trimmed,
        isSpoiler: false,
      },
    });

    const replyCount = await prisma.message.count({
      where: { parentId: discussionId },
    });

    // Lookup author profile
    const prof = await prisma.profile.findUnique({
      where: { id: userId },
    });

    const name = prof?.displayName || prof?.username || userMeta?.name || `User_${userId.slice(0, 6)}`;
    const avatar = prof?.avatarUrl || userMeta?.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmNfypXexpUqGV6ruN3XC8n2OqYyfzM-rHCYQH9eIHwRrMERZmMPSMVhkWDh7lAeFDaMoIKQEcn8pdfMMGDKqiI4PsbTQxIEly40c9OC_7jeis6uUX0Xmau1lUS3kAo7bw8bA67k1U1vhNTC8RwMbUTFVgQAOvm-N4cKCenSDe7FIT_9PVezInr_GDwS61-H7-0B_F9PO1zaeOr3XWdla-rkuVL8j2MXny0EU59iaaB5L157FxLwbvqw';
    const role = prof?.role || userMeta?.role || 'Community Member';

    return {
      reply: {
        id: reply.id,
        discussionId,
        content: reply.content,
        isSpoiler: reply.isSpoiler,
        createdAt: reply.createdAt.toISOString(),
        author: {
          id: userId,
          name: name.startsWith('@') ? name : `@${name}`,
          avatar,
          role,
        },
      },
      replyCount,
    };
  }

  /**
   * Toggle pulse discussion like
   */
  async togglePulseLike(discussionId: string, userId: string) {
    const existing = await prisma.reaction.findFirst({
      where: {
        messageId: discussionId,
        userId,
        emoji: '❤️',
      },
    });

    let isLiked = false;
    if (existing) {
      await prisma.reaction.delete({
        where: { id: existing.id },
      });
      isLiked = false;
    } else {
      await prisma.reaction.create({
        data: {
          messageId: discussionId,
          userId,
          emoji: '❤️',
        },
      });
      isLiked = true;
    }

    const likeCount = await prisma.reaction.count({
      where: { messageId: discussionId },
    });

    return {
      messageId: discussionId,
      isLiked,
      likeCount,
    };
  }

  /**
   * Delete a pulse discussion with server ownership enforcement
   */
  async deletePulseDiscussion(discussionId: string, userId: string) {
    const msg = await prisma.message.findUnique({
      where: { id: discussionId },
      select: { id: true, userId: true },
    });

    if (!msg) {
      const err = new Error('Discussion not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    if (msg.userId !== userId) {
      const err = new Error('Unauthorized to delete this discussion');
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    }

    await prisma.message.delete({
      where: { id: discussionId },
    });

    return { success: true, messageId: discussionId };
  }
}

export const chatService = new ChatService();
