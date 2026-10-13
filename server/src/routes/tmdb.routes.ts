import { Router, type Request, type Response } from 'express';
import { tmdbService, TmdbApiError } from '../services/tmdb.service.js';

const router = Router();

/**
 * Validates and converts positive integers for pagination.
 */
function parsePositiveInt(val: unknown, fallback: number = 1): number | null {
  if (val === undefined || val === null || val === '') return fallback;
  const num = Number(val);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

/**
 * Validates and parses non-negative integers (e.g., season 0 is allowed for specials).
 */
function parseNonNegativeInt(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  if (!Number.isInteger(num) || num < 0) return null;
  return num;
}

/**
 * Validates and sanitizes media IDs (strips movie- or tv- prefix, verifies numeric ID).
 */
function parseCleanId(id: unknown): string | null {
  const strId = Array.isArray(id) ? id[0] : id;
  if (!strId || typeof strId !== 'string') return null;
  const clean = strId.trim().replace(/^(tv-|movie-)/, '');
  if (!clean || clean === 'undefined' || clean === 'null') return null;
  if (!/^\d+$/.test(clean)) return null;
  return clean;
}

/**
 * Centralized error handler preserving accurate HTTP status codes and safe diagnostics.
 */
function handleTmdbRouteError(res: Response, error: unknown, context: string): void {
  if (error instanceof TmdbApiError) {
    console.error(`[TMDB Route Error] ${context} (${error.code}): ${error.message}`);
    res.status(error.status).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Internal Server Error';
  console.error(`[TMDB Route Error] ${context}: ${message}`);
  res.status(500).json({
    error: 'An unexpected internal error occurred while processing the TMDB request',
    code: 'INTERNAL_ERROR',
  });
}

/**
 * GET /api/tmdb/trending
 * Query params: mediaType ('all' | 'movie' | 'tv'), timeWindow ('day' | 'week'), page
 */
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const rawMediaType = req.query.mediaType;
    let mediaType: 'all' | 'movie' | 'tv' = 'all';
    if (rawMediaType !== undefined) {
      if (rawMediaType !== 'all' && rawMediaType !== 'movie' && rawMediaType !== 'tv') {
        return res.status(400).json({
          error: "Invalid mediaType: must be 'all', 'movie', or 'tv'",
          code: 'INVALID_MEDIA_TYPE',
        });
      }
      mediaType = rawMediaType;
    }

    const rawTimeWindow = req.query.timeWindow;
    let timeWindow: 'day' | 'week' = 'week';
    if (rawTimeWindow !== undefined) {
      if (rawTimeWindow !== 'day' && rawTimeWindow !== 'week') {
        return res.status(400).json({
          error: "Invalid timeWindow: must be 'day' or 'week'",
          code: 'INVALID_TIME_WINDOW',
        });
      }
      timeWindow = rawTimeWindow;
    }

    const page = parsePositiveInt(req.query.page, 1);
    if (page === null) {
      return res.status(400).json({
        error: 'Invalid page parameter: must be a positive integer',
        code: 'INVALID_PAGE',
      });
    }

    const data = await tmdbService.getTrending(mediaType, timeWindow, page);
    res.json(data);
  } catch (error: unknown) {
    handleTmdbRouteError(res, error, 'GET /trending');
  }
});

/**
 * GET /api/tmdb/popular
 * Query params: mediaType ('tv' | 'movie'), page
 */
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const rawMediaType = req.query.mediaType;
    let mediaType: 'tv' | 'movie' = 'tv';
    if (rawMediaType !== undefined) {
      if (rawMediaType !== 'tv' && rawMediaType !== 'movie') {
        return res.status(400).json({
          error: "Invalid mediaType: must be 'tv' or 'movie'",
          code: 'INVALID_MEDIA_TYPE',
        });
      }
      mediaType = rawMediaType;
    }

    const page = parsePositiveInt(req.query.page, 1);
    if (page === null) {
      return res.status(400).json({
        error: 'Invalid page parameter: must be a positive integer',
        code: 'INVALID_PAGE',
      });
    }

    const data = await tmdbService.getPopular(mediaType, page);
    res.json(data);
  } catch (error: unknown) {
    handleTmdbRouteError(res, error, 'GET /popular');
  }
});

/**
 * GET /api/tmdb/search
 * Query params: query, page
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    if (!query) {
      return res.json({ results: [], total: 0, page: 1 });
    }

    const page = parsePositiveInt(req.query.page, 1);
    if (page === null) {
      return res.status(400).json({
        error: 'Invalid page parameter: must be a positive integer',
        code: 'INVALID_PAGE',
      });
    }

    const data = await tmdbService.search(query, page);
    res.json(data);
  } catch (error: unknown) {
    handleTmdbRouteError(res, error, 'GET /search');
  }
});

/**
 * GET /api/tmdb/details/:id
 * Query params: mediaType ('tv' | 'movie')
 */
router.get('/details/:id', async (req: Request, res: Response) => {
  try {
    const cleanId = parseCleanId(req.params.id);
    if (!cleanId) {
      return res.status(400).json({
        error: 'Invalid or missing media ID: must be a positive numeric ID',
        code: 'INVALID_ID',
      });
    }

    const rawMediaType = req.query.mediaType;
    let mediaType: 'tv' | 'movie' = 'tv';
    if (rawMediaType !== undefined) {
      if (rawMediaType !== 'tv' && rawMediaType !== 'movie') {
        return res.status(400).json({
          error: "Invalid mediaType: must be 'tv' or 'movie'",
          code: 'INVALID_MEDIA_TYPE',
        });
      }
      mediaType = rawMediaType;
    }

    const data = await tmdbService.getDetails(cleanId, mediaType);
    res.json(data);
  } catch (error: unknown) {
    handleTmdbRouteError(res, error, `GET /details/${req.params.id}`);
  }
});

/**
 * GET /api/tmdb/credits/:id
 * Query params: mediaType ('tv' | 'movie')
 */
router.get('/credits/:id', async (req: Request, res: Response) => {
  try {
    const cleanId = parseCleanId(req.params.id);
    if (!cleanId) {
      return res.status(400).json({
        error: 'Invalid or missing media ID: must be a positive numeric ID',
        code: 'INVALID_ID',
      });
    }

    const rawMediaType = req.query.mediaType;
    let mediaType: 'tv' | 'movie' = 'tv';
    if (rawMediaType !== undefined) {
      if (rawMediaType !== 'tv' && rawMediaType !== 'movie') {
        return res.status(400).json({
          error: "Invalid mediaType: must be 'tv' or 'movie'",
          code: 'INVALID_MEDIA_TYPE',
        });
      }
      mediaType = rawMediaType;
    }

    const data = await tmdbService.getCredits(cleanId, mediaType);
    res.json(data);
  } catch (error: unknown) {
    handleTmdbRouteError(res, error, `GET /credits/${req.params.id}`);
  }
});

/**
 * GET /api/tmdb/tv/:id/season/:seasonNumber
 */
router.get('/tv/:id/season/:seasonNumber', async (req: Request, res: Response) => {
  try {
    const cleanId = parseCleanId(req.params.id);
    if (!cleanId) {
      return res.status(400).json({
        error: 'Invalid or missing TV show ID: must be a positive numeric ID',
        code: 'INVALID_ID',
      });
    }

    const seasonNumber = parseNonNegativeInt(req.params.seasonNumber);
    if (seasonNumber === null) {
      return res.status(400).json({
        error: 'Invalid seasonNumber parameter: must be a non-negative integer',
        code: 'INVALID_SEASON_NUMBER',
      });
    }

    const data = await tmdbService.getSeason(cleanId, seasonNumber);
    res.json(data);
  } catch (error: unknown) {
    handleTmdbRouteError(res, error, `GET /tv/${req.params.id}/season/${req.params.seasonNumber}`);
  }
});

/**
 * GET /api/tmdb/similar/:id
 * Query params: mediaType ('tv' | 'movie')
 */
router.get('/similar/:id', async (req: Request, res: Response) => {
  try {
    const cleanId = parseCleanId(req.params.id);
    if (!cleanId) {
      return res.status(400).json({
        error: 'Invalid or missing media ID: must be a positive numeric ID',
        code: 'INVALID_ID',
      });
    }

    const rawMediaType = req.query.mediaType;
    let mediaType: 'tv' | 'movie' = 'tv';
    if (rawMediaType !== undefined) {
      if (rawMediaType !== 'tv' && rawMediaType !== 'movie') {
        return res.status(400).json({
          error: "Invalid mediaType: must be 'tv' or 'movie'",
          code: 'INVALID_MEDIA_TYPE',
        });
      }
      mediaType = rawMediaType;
    }

    const data = await tmdbService.getSimilar(cleanId, mediaType);
    res.json(data);
  } catch (error: unknown) {
    handleTmdbRouteError(res, error, `GET /similar/${req.params.id}`);
  }
});

/**
 * GET /api/tmdb/reviews/:id
 * Query params: mediaType ('tv' | 'movie'), page
 */
router.get('/reviews/:id', async (req: Request, res: Response) => {
  try {
    const cleanId = parseCleanId(req.params.id);
    if (!cleanId) {
      return res.status(400).json({
        error: 'Invalid or missing media ID: must be a positive numeric ID',
        code: 'INVALID_ID',
      });
    }

    const rawMediaType = req.query.mediaType;
    let mediaType: 'tv' | 'movie' = 'tv';
    if (rawMediaType !== undefined) {
      if (rawMediaType !== 'tv' && rawMediaType !== 'movie') {
        return res.status(400).json({
          error: "Invalid mediaType: must be 'tv' or 'movie'",
          code: 'INVALID_MEDIA_TYPE',
        });
      }
      mediaType = rawMediaType;
    }

    const page = parsePositiveInt(req.query.page, 1);
    if (page === null) {
      return res.status(400).json({
        error: 'Invalid page parameter: must be a positive integer',
        code: 'INVALID_PAGE',
      });
    }

    const data = await tmdbService.getReviews(cleanId, mediaType, page);
    res.json(data);
  } catch (error: unknown) {
    handleTmdbRouteError(res, error, `GET /reviews/${req.params.id}`);
  }
});

export default router;
