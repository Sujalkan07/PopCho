import { Router, type Request, type Response } from 'express';
import { reviewService } from '../services/review.service.js';
import { authMiddleware, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware to identify user
router.use(authMiddleware);


function parseParamId(id: unknown): string {
  if (Array.isArray(id)) return String(id[0] || '');
  return typeof id === 'string' ? id : String(id || '');
}

/**
 * GET /api/reviews
 * Query parameters: page, limit, search, filter, showId
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const filter = req.query.filter as string | undefined;
    const showId = req.query.showId as string | undefined;
    const currentUserId = req.user?.id;

    const data = await reviewService.listReviews(
      { page, limit, search, filter, showId },
      currentUserId
    );

    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve reviews';
    console.error('[Review Route Error] GET /api/reviews:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/reviews/critics/top
 * Returns authentic aggregated top critics based on submitted reviews
 */
router.get('/critics/top', async (_req: Request, res: Response) => {
  try {
    const critics = await reviewService.getTopCritics();
    res.json(critics);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve top critics';
    console.error('[Review Route Error] GET /api/reviews/critics/top:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/reviews
 * Create a new critical deep dive review
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      tmdbId,
      mediaType,
      showTitle,
      showPoster,
      showBackdrop,
      headline,
      content,
      rating,
      essayType,
      categoryTag,
      hasSpoiler,
    } = req.body;

    const review = await reviewService.createReview(
      {
        tmdbId,
        mediaType,
        showTitle,
        showPoster,
        showBackdrop,
        headline,
        content,
        rating,
        essayType,
        categoryTag,
        hasSpoiler,
      },
      req.user!
    );

    res.status(201).json(review);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to publish review';
    console.error('[Review Route Error] POST /api/reviews:', msg);
    res.status(400).json({ error: msg });
  }
});

/**
 * POST /api/reviews/:id/vote
 * Toggle helpful vote for a review
 */
router.post('/:id/vote', requireAuth, async (req: Request, res: Response) => {
  try {
    const reviewId = parseParamId(req.params.id);
    const result = await reviewService.toggleHelpful(reviewId, req.user!.id);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to toggle vote';
    console.error('[Review Route Error] POST /api/reviews/:id/vote:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/reviews/:id/bookmark
 * Toggle bookmark for a review
 */
router.post('/:id/bookmark', requireAuth, async (req: Request, res: Response) => {
  try {
    const reviewId = parseParamId(req.params.id);
    const result = await reviewService.toggleBookmark(reviewId, req.user!.id);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to toggle bookmark';
    console.error('[Review Route Error] POST /api/reviews/:id/bookmark:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/reviews/:id/comments
 * List comments on a review
 */
router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const reviewId = parseParamId(req.params.id);
    const comments = await reviewService.listComments(reviewId);
    res.json(comments);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve comments';
    console.error('[Review Route Error] GET /api/reviews/:id/comments:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/reviews/:id/comments
 * Add a comment to a review
 */
router.post('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  try {
    const reviewId = parseParamId(req.params.id);
    const { content } = req.body;
    const comment = await reviewService.addComment(reviewId, content, req.user!);
    res.status(201).json(comment);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to post comment';
    console.error('[Review Route Error] POST /api/reviews/:id/comments:', msg);
    res.status(400).json({ error: msg });
  }
});

/**
 * DELETE /api/reviews/:id
 * Delete a review (strictly enforces author ownership)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const reviewId = parseParamId(req.params.id);
    const result = await reviewService.deleteReview(reviewId, req.user!.id);
    res.json(result);
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode || 500;
    const msg = err instanceof Error ? err.message : 'Failed to delete review';
    console.error('[Review Route Error] DELETE /api/reviews/:id:', msg);
    res.status(status).json({ error: msg });
  }
});

export default router;
