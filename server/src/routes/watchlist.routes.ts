import { Router, type Request, type Response } from 'express';
import { watchlistService } from '../services/watchlist.service.js';
import { authMiddleware, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/watchlist
 * Retrieve current authenticated user's watchlist
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const items = await watchlistService.getUserWatchlist(userId);
    res.json({
      items,
      count: items.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve watchlist';
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/watchlist/ids
 * Returns list of keys for quickly rendering active bookmark state on cards
 */
router.get('/ids', async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.json({ keys: [], ids: [] });
    }
    const keys = await watchlistService.getUserWatchlistKeys(req.user.id);
    res.json({
      keys: keys.map((k) => k.key),
      items: keys,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve watchlist IDs';
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/watchlist/toggle
 * Toggle addition/removal of a title in the user's persistent watchlist
 */
router.post('/toggle', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { tmdbId, mediaType, title, posterPath } = req.body;

    if (!tmdbId || !title) {
      return res.status(400).json({ error: 'tmdbId and title are required' });
    }

    const result = await watchlistService.toggleItem(userId, {
      tmdbId: Number(tmdbId),
      mediaType: (mediaType as string) || 'tv',
      title: String(title).trim(),
      posterPath: posterPath ? String(posterPath).trim() : undefined,
    });

    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update watchlist';
    res.status(500).json({ error: msg });
  }
});

/**
 * DELETE /api/watchlist/:tmdbId/:mediaType
 * Remove a specific title from the user's persistent watchlist
 */
router.delete('/:tmdbId/:mediaType', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const tmdbId = Number(req.params.tmdbId);
    const mediaType = req.params.mediaType as string;

    if (!tmdbId || isNaN(tmdbId)) {
      return res.status(400).json({ error: 'Valid tmdbId parameter is required' });
    }

    const result = await watchlistService.removeItem(userId, tmdbId, mediaType || 'tv');
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete watchlist item';
    res.status(500).json({ error: msg });
  }
});

export default router;
