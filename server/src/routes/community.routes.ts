import { Router, type Request, type Response } from 'express';
import { communityService } from '../services/community.service.js';
import { chatService } from '../services/chat.service.js';
import { devAuthMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// Apply dev auth middleware to all community routes
router.use(devAuthMiddleware);

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
 * 2. Find or create a community by TMDB ID and Media Type
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

    const community = await communityService.findOrCreateCommunity({
      tmdbId,
      mediaType,
      fallbackTitle,
      fallbackPoster,
      fallbackBackdrop,
      fallbackOverview,
    });

    const membership = req.user
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
 * 4. Join a community
 * POST /api/communities/:communityId/join
 */
router.post('/:communityId/join', async (req: Request, res: Response) => {
  try {
    const communityId = req.params.communityId as string;
    const userId = req.user!.id;
    const role = (req.body?.role as string) || 'MEMBER';

    const result = await communityService.joinCommunity(communityId, userId, role);
    res.json({
      message: 'Joined community successfully',
      ...result,
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
router.post('/:communityId/leave', async (req: Request, res: Response) => {
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

    const isChannelValid = await chatService.verifyChannelInCommunity(communityId, channelId);
    if (!isChannelValid) {
      return res.status(404).json({ error: 'Channel does not belong to the specified community' });
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
router.post('/:communityId/channels/:channelId/messages', async (req: Request, res: Response) => {
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
