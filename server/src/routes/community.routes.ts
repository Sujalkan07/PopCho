import { Router, type Request, type Response } from 'express';
import { communityService } from '../services/community.service.js';
import { chatService } from '../services/chat.service.js';
import { leaderboardService } from '../services/leaderboard.service.js';
import { broadcastPulseEvent } from '../socket.js';
import { authMiddleware, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware to all community routes
router.use(authMiddleware);


/**
 * 1. List communities with pagination and search
 * GET /api/communities
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const userId = req.user?.id;

    const data = await communityService.listCommunities({
      page,
      limit,
      search,
      userId,
    });

    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list communities';
    res.status(500).json({ error: msg });
  }
});

/**
 * 2. Lookup a community by TMDB ID and Media Type (Read-Only, no write side effects)
 * GET /api/communities/lookup?tmdbId=...&mediaType=...
 */
router.get('/lookup', async (req: Request, res: Response) => {
  try {
    const tmdbId = Number(req.query.tmdbId);
    const mediaType = (req.query.mediaType as string) || 'tv';

    if (!tmdbId || isNaN(tmdbId)) {
      return res.status(400).json({ error: 'Valid tmdbId parameter is required' });
    }

    const fallbackTitle = req.query.title as string | undefined;
    const fallbackPoster = req.query.poster as string | undefined;
    const fallbackBackdrop = req.query.backdrop as string | undefined;
    const fallbackOverview = req.query.overview as string | undefined;

    const community = await communityService.lookupCommunityReadOnly({
      tmdbId,
      mediaType,
      fallbackTitle,
      fallbackPoster,
      fallbackBackdrop,
      fallbackOverview,
    });

    const membership = (community && community.isPersisted && req.user)
      ? await communityService.getMembershipStatus(community.id, req.user.id)
      : { isMember: false, role: null };

    res.json({
      community,
      isMember: membership.isMember,
      role: membership.role,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to lookup community';
    res.status(500).json({ error: msg });
  }
});

/**
 * 2.5 Retrieve user's joined communities (My Hubs)
 * GET /api/communities/user/hubs
 */
router.get('/user/hubs', requireAuth, async (req: Request, res: Response) => {
  try {
    const hubs = await communityService.getUserHubs(req.user!.id);
    res.json({ hubs, count: hubs.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve user hubs';
    res.status(500).json({ error: msg });
  }
});

/**
 * 2.6 Community Pulse Feed (Real community discussions across shows)
 * GET /api/communities/pulse
 */
router.get('/pulse', async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = req.query.limit !== undefined ? Number(req.query.limit) || 4 : 4;
    const sortBy = (req.query.sortBy as string) === 'recent' ? 'recent' : 'likes';
    const currentUserId = req.user?.id;

    const data = await chatService.getPulseDiscussions({ page, limit, sortBy, currentUserId });
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve pulse feed';
    res.status(500).json({ error: msg });
  }
});

/**
 * 2.7 Get replies for a discussion
 * GET /api/communities/pulse/:id/replies
 */
router.get('/pulse/:id/replies', async (req: Request, res: Response) => {
  try {
    const discussionId = req.params.id as string;
    const currentUserId = req.user?.id;
    const replies = await chatService.getDiscussionReplies(discussionId, currentUserId);
    res.json({ replies });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve replies';
    res.status(500).json({ error: msg });
  }
});

/**
 * 2.8 Submit a reply to a discussion
 * POST /api/communities/pulse/:id/replies
 */
router.post('/pulse/:id/replies', requireAuth, async (req: Request, res: Response) => {
  try {
    const discussionId = req.params.id as string;
    const { content } = req.body;
    const user = req.user!;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Reply content cannot be empty' });
    }

    const result = await chatService.createDiscussionReply(discussionId, user.id, content, user);
    broadcastPulseEvent('pulse_reply_created', {
      discussionId,
      reply: result.reply,
      replyCount: result.replyCount,
    });
    res.status(201).json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit reply';
    res.status(400).json({ error: msg });
  }
});

/**
 * 2.9 Toggle like on a discussion
 * POST /api/communities/pulse/:id/like
 */
router.post('/pulse/:id/like', requireAuth, async (req: Request, res: Response) => {
  try {
    const discussionId = req.params.id as string;
    const user = req.user!;

    const result = await chatService.togglePulseLike(discussionId, user.id);
    broadcastPulseEvent('pulse_reaction_updated', {
      discussionId: result.messageId,
      isLiked: result.isLiked,
      likeCount: result.likeCount,
    });
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to toggle like';
    res.status(400).json({ error: msg });
  }
});

/**
 * 2.10 Delete a discussion (enforces server ownership)
 * DELETE /api/communities/pulse/:id
 */
router.delete('/pulse/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const discussionId = req.params.id as string;
    const user = req.user!;

    const result = await chatService.deletePulseDiscussion(discussionId, user.id);
    broadcastPulseEvent('pulse_post_deleted', { discussionId });
    res.json(result);
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode || 500;
    const msg = err instanceof Error ? err.message : 'Failed to delete discussion';
    res.status(status).json({ error: msg });
  }
});

/**
 * 2.11 Top Theorists Leaderboard (Calculated transparently from recorded database activity)
 * GET /api/communities/leaderboard
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const period = req.query.period === 'all' ? 'all' : 'week';
    const limit = Number(req.query.limit) || 5;

    const data = await leaderboardService.getLeaderboard(period, limit);
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve leaderboard';
    res.status(500).json({ error: msg });
  }
});

/**
 * 3. Retrieve community details by ID or Slug
 * GET /api/communities/:communityId
 */
router.get('/:communityId', async (req: Request, res: Response) => {
  try {
    const communityId = req.params.communityId as string;
    const userId = req.user?.id;

    const community = await communityService.getCommunityByIdOrSlug(communityId, userId);
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    res.json(community);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve community';
    res.status(500).json({ error: msg });
  }
});

/**
 * 4. Join a community (Creates community at write-time if it was previewed)
 * POST /api/communities/:communityId/join
 */
router.post('/:communityId/join', requireAuth, async (req: Request, res: Response) => {
  try {
    const communityId = req.params.communityId as string;
    const userId = req.user!.id;
    const role = (req.body?.role as string) || 'MEMBER';
    const tmdbId = req.body?.tmdbId ? Number(req.body.tmdbId) : undefined;
    const mediaType = (req.body?.mediaType as string) || 'tv';
    const fallbackTitle = req.body?.title as string | undefined;
    const fallbackPoster = req.body?.posterPath as string | undefined;
    const fallbackBackdrop = req.body?.backdropPath as string | undefined;

    let targetCommunityId = communityId;
    // If joining a virtual preview community or joining by TMDB info, ensure it is created in DB
    if (communityId.startsWith('virtual-') || (tmdbId && !isNaN(tmdbId))) {
      const parsedTmdbId = tmdbId || Number(communityId.split('-').pop());
      const ensured = await communityService.findOrCreateCommunity({
        tmdbId: parsedTmdbId,
        mediaType,
        fallbackTitle,
        fallbackPoster,
        fallbackBackdrop,
      });
      targetCommunityId = ensured.id;
    }

    const result = await communityService.joinCommunity(targetCommunityId, userId, role);
    res.json({
      message: 'Joined community successfully',
      ...result,
      communityId: targetCommunityId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to join community';
    res.status(400).json({ error: msg });
  }
});

/**
 * 5. Leave a community
 * POST /api/communities/:communityId/leave
 */
router.post('/:communityId/leave', requireAuth, async (req: Request, res: Response) => {
  try {
    const communityId = req.params.communityId as string;
    const userId = req.user!.id;

    const result = await communityService.leaveCommunity(communityId, userId);
    res.json({
      message: 'Left community successfully',
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to leave community';
    res.status(400).json({ error: msg });
  }
});

/**
 * 6. Retrieve channels belonging to a community
 * GET /api/communities/:communityId/channels
 */
router.get('/:communityId/channels', async (req: Request, res: Response) => {
  try {
    const communityId = req.params.communityId as string;
    const channels = await chatService.getChannels(communityId);
    res.json({ channels });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve channels';
    res.status(500).json({ error: msg });
  }
});

/**
 * 7. Retrieve message history for a channel
 * GET /api/communities/:communityId/channels/:channelId/messages
 */
router.get('/:communityId/channels/:channelId/messages', async (req: Request, res: Response) => {
  try {
    const communityId = req.params.communityId as string;
    const channelId = req.params.channelId as string;
    const limit = Number(req.query.limit) || 50;
    const before = req.query.before as string | undefined;

    // Gracefully handle virtual/preview IDs
    if (communityId.startsWith('virtual-') || channelId.startsWith('preview-') || channelId.startsWith('ch-')) {
      return res.json({ messages: [] });
    }

    const isChannelValid = await chatService.verifyChannelInCommunity(communityId, channelId);
    if (!isChannelValid) {
      return res.json({ messages: [] });
    }

    const messages = await chatService.getChannelMessages(channelId, { limit, before });
    res.json({ messages });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve messages';
    res.status(500).json({ error: msg });
  }
});

/**
 * 8. Send a message to a channel
 * POST /api/communities/:communityId/channels/:channelId/messages
 */
router.post('/:communityId/channels/:channelId/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const communityId = req.params.communityId as string;
    const channelId = req.params.channelId as string;
    const { content, isSpoiler } = req.body;
    const user = req.user!;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const isChannelValid = await chatService.verifyChannelInCommunity(communityId, channelId);
    if (!isChannelValid) {
      return res.status(404).json({ error: 'Channel does not belong to the specified community' });
    }

    const message = await chatService.createMessage({
      channelId,
      userId: user.id,
      content,
      isSpoiler: Boolean(isSpoiler),
      userName: user.name,
      userAvatar: user.avatar,
      userRole: user.role,
    });

    res.status(201).json({ message });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send message';
    res.status(400).json({ error: msg });
  }
});

/**
 * 9. Toggle emoji reaction on a message
 * POST /api/communities/:communityId/channels/:channelId/messages/:messageId/reactions
 */
router.post(
  '/:communityId/channels/:channelId/messages/:messageId/reactions',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const communityId = req.params.communityId as string;
      const channelId = req.params.channelId as string;
      const messageId = req.params.messageId as string;
      const { emoji } = req.body;
      const userId = req.user!.id;

      if (!emoji || !emoji.trim()) {
        return res.status(400).json({ error: 'Emoji is required' });
      }

      const isChannelValid = await chatService.verifyChannelInCommunity(communityId, channelId);
      if (!isChannelValid) {
        return res.status(404).json({ error: 'Channel does not belong to the specified community' });
      }

      const result = await chatService.toggleReaction({
        messageId,
        userId,
        emoji,
      });

      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle reaction';
      res.status(400).json({ error: msg });
    }
  }
);

export default router;
