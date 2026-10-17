import prisma from '../db/prisma.js';

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
  stats: {
    reviewsCount: number;
    messagesCount: number;
    helpfulVotesReceived: number;
    reactionsReceived: number;
    commentsCount: number;
  };
}

export interface LeaderboardResponse {
  period: 'week' | 'all';
  updatedAt: string;
  theorists: LeaderboardTheorist[];
  scoringFormula: {
    reviewPublished: number;
    helpfulVoteReceived: number;
    messagePosted: number;
    reactionReceived: number;
    commentPosted: number;
  };
}

const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBmNfypXexpUqGV6ruN3XC8n2OqYyfzM-rHCYQH9eIHwRrMERZmMPSMVhkWDh7lAeFDaMoIKQEcn8pdfMMGDKqiI4PsbTQxIEly40c9OC_7jeis6uUX0Xmau1lUS3kAo7bw8bA67k1U1vhNTC8RwMbUTFVgQAOvm-N4cKCenSDe7FIT_9PVezInr_GDwS61-H7-0B_F9PO1zaeOr3XWdla-rkuVL8j2MXny0EU59iaaB5L157FxLwbvqw';

function deriveBadge(role?: string | null): string {
  if (!role) return 'Community Voice';
  const lower = role.toLowerCase();
  if (lower.includes('theorist')) return 'Top Theorist';
  if (lower.includes('critic') || lower.includes('verified')) return 'Verified Critic';
  if (lower.includes('scholar') || lower.includes('lore')) return 'Lore Scholar';
  if (lower.includes('admin') || lower.includes('mod') || lower.includes('staff')) return 'Staff';
  return 'Active Contributor';
}

export class LeaderboardService {
  /**
   * Transparent scoring weights:
   * - Review published: 100 pts
   * - Helpful vote received on review: 50 pts
   * - Community message/theory posted: 20 pts
   * - Reaction received on message: 10 pts
   * - Review comment posted: 15 pts
   */
  readonly SCORING_RULES = {
    reviewPublished: 100,
    helpfulVoteReceived: 50,
    messagePosted: 20,
    reactionReceived: 10,
    commentPosted: 15,
  };

  async getLeaderboard(period: 'week' | 'all' = 'week', limit: number = 5): Promise<LeaderboardResponse> {
    const boundedLimit = Math.min(20, Math.max(1, limit));
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dateFilter = period === 'week' ? { createdAt: { gte: oneWeekAgo } } : {};

    // 1. Gather all activity within time window
    const [reviews, reviewVotes, messages, reactions, comments] = await Promise.all([
      prisma.review.findMany({
        where: dateFilter,
        select: { id: true, userId: true, helpfulCount: true },
      }),
      prisma.reviewVote.findMany({
        where: dateFilter,
        select: {
          id: true,
          reviewId: true,
          review: { select: { userId: true } },
        },
      }),
      prisma.message.findMany({
        where: dateFilter,
        select: { id: true, userId: true },
      }),
      prisma.reaction.findMany({
        where: dateFilter,
        select: {
          id: true,
          message: { select: { userId: true } },
        },
      }),
      prisma.reviewComment.findMany({
        where: dateFilter,
        select: { id: true, userId: true },
      }),
    ]);

    // 2. Accumulate user statistics
    const statsMap = new Map<
      string,
      {
        userId: string;
        reviewsCount: number;
        helpfulVotesReceived: number;
        messagesCount: number;
        reactionsReceived: number;
        commentsCount: number;
      }
    >();

    const getOrCreate = (userId: string) => {
      let stats = statsMap.get(userId);
      if (!stats) {
        stats = {
          userId,
          reviewsCount: 0,
          helpfulVotesReceived: 0,
          messagesCount: 0,
          reactionsReceived: 0,
          commentsCount: 0,
        };
        statsMap.set(userId, stats);
      }
      return stats;
    };

    // Reviews published
    for (const r of reviews) {
      if (r.userId) getOrCreate(r.userId).reviewsCount += 1;
    }

    // Helpful votes received by review author
    for (const v of reviewVotes) {
      const authorId = v.review?.userId;
      if (authorId) getOrCreate(authorId).helpfulVotesReceived += 1;
    }

    // Messages posted
    for (const m of messages) {
      if (m.userId) getOrCreate(m.userId).messagesCount += 1;
    }

    // Reactions received by message author
    for (const r of reactions) {
      const authorId = r.message?.userId;
      if (authorId) getOrCreate(authorId).reactionsReceived += 1;
    }

    // Review comments posted
    for (const c of comments) {
      if (c.userId) getOrCreate(c.userId).commentsCount += 1;
    }

    // If no activity in week window, we return empty list gracefully
    if (statsMap.size === 0) {
      return {
        period,
        updatedAt: now.toISOString(),
        theorists: [],
        scoringFormula: this.SCORING_RULES,
      };
    }

    // 3. Batch lookup User Profiles from database
    const userIds = Array.from(statsMap.keys());
    const profiles = await prisma.profile.findMany({
      where: { id: { in: userIds } },
    });
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    // 4. Calculate total score per user using formula
    const rankedList = Array.from(statsMap.values()).map((st) => {
      const points =
        st.reviewsCount * this.SCORING_RULES.reviewPublished +
        st.helpfulVotesReceived * this.SCORING_RULES.helpfulVoteReceived +
        st.messagesCount * this.SCORING_RULES.messagePosted +
        st.reactionsReceived * this.SCORING_RULES.reactionReceived +
        st.commentsCount * this.SCORING_RULES.commentPosted;

      const prof = profileMap.get(st.userId);
      const name = prof?.displayName || prof?.username || `User_${st.userId.slice(0, 6)}`;
      const cleanName = name.replace(/^@+/, '').trim();
      const role = prof?.role || (st.reviewsCount > 0 ? 'Community Critic' : 'Community Member');

      let activitySummary = '';
      if (st.reviewsCount > 0 && st.messagesCount > 0) {
        activitySummary = `${st.reviewsCount} Reviews · ${st.messagesCount} Theories`;
      } else if (st.reviewsCount > 0) {
        activitySummary = `${st.reviewsCount} Published ${st.reviewsCount === 1 ? 'Review' : 'Reviews'}`;
      } else if (st.messagesCount > 0) {
        activitySummary = `${st.messagesCount} Active ${st.messagesCount === 1 ? 'Theory' : 'Theories'}`;
      } else if (st.helpfulVotesReceived > 0) {
        activitySummary = `${st.helpfulVotesReceived} Helpful ${st.helpfulVotesReceived === 1 ? 'Vote' : 'Votes'}`;
      } else {
        activitySummary = `${st.reactionsReceived} Reactions`;
      }

      return {
        userId: st.userId,
        displayName: cleanName,
        username: prof?.username ? prof.username.replace(/^@+/, '').trim() : cleanName,
        avatarUrl: prof?.avatarUrl || DEFAULT_AVATAR,
        role,
        badge: deriveBadge(role),
        points,
        formattedPoints: `+${points.toLocaleString()} pts`,
        activitySummary,
        stats: st,
      };
    });

    // 5. Deterministic descending sort by points, then reviewsCount, then messagesCount
    rankedList.sort((a, b) => b.points - a.points || b.stats.reviewsCount - a.stats.reviewsCount || b.stats.messagesCount - a.stats.messagesCount);

    const theorists: LeaderboardTheorist[] = rankedList.slice(0, boundedLimit).map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    return {
      period,
      updatedAt: now.toISOString(),
      theorists,
      scoringFormula: this.SCORING_RULES,
    };
  }
}

export const leaderboardService = new LeaderboardService();
