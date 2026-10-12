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
    return prisma.channel.findUnique({
      where: { id: channelId },
      include: { community: true },
    });
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

    // Reverse into chronological order (oldest to newest) for client display
    return messages.reverse().map((m) => this.formatMessage(m));
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
    const channel = await prisma.channel.findUnique({
      where: { id: params.channelId },
    });
    if (!channel) {
      throw new Error('Channel not found');
    }

    const message = await prisma.message.create({
      data: {
        channelId: params.channelId,
        userId: params.userId,
        content: cleanContent,
        isSpoiler: Boolean(params.isSpoiler),
      },
      include: {
        reactions: true,
      },
    });

    return this.formatMessage(message, {
      name: params.userName,
      avatar: params.userAvatar,
      role: params.userRole,
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
}

export const chatService = new ChatService();
