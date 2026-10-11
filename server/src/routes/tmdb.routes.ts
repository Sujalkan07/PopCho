import { Router, type Request, type Response } from 'express';
import { tmdbService } from '../services/tmdb.service.js';

const router = Router();

/**
 * GET /api/tmdb/trending
 * Query params: mediaType ('all' | 'movie' | 'tv'), timeWindow ('day' | 'week')
 */
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const mediaType = (req.query.mediaType as 'all' | 'movie' | 'tv') || 'all';
    const timeWindow = (req.query.timeWindow as 'day' | 'week') || 'week';
    const page = Number(req.query.page) || 1;
    const data = await tmdbService.getTrending(mediaType, timeWindow, page);
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching trending media:', error.message);
    res.status(500).json({ error: error.message || 'Failed to fetch trending media' });
  }
});

/**
 * GET /api/tmdb/popular
 * Query params: mediaType ('tv' | 'movie'), page
 */
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const mediaType = (req.query.mediaType as 'tv' | 'movie') || 'tv';
    const page = Number(req.query.page) || 1;
    const data = await tmdbService.getPopular(mediaType, page);
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching popular media:', error.message);
    res.status(500).json({ error: error.message || 'Failed to fetch popular media' });
  }
});

/**
 * GET /api/tmdb/search
 * Query params: query, page
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = String(req.query.query || '');
    const page = Number(req.query.page) || 1;
    if (!query.trim()) {
      res.json({ results: [], total: 0, page: 1 });
      return;
    }
    const data = await tmdbService.search(query, page);
    res.json(data);
  } catch (error: any) {
    console.error('Error searching media:', error.message);
    res.status(500).json({ error: error.message || 'Failed to search media' });
  }
});

/**
 * GET /api/tmdb/details/:id
 * Query params: mediaType ('tv' | 'movie')
 */
router.get('/details/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const mediaType = (req.query.mediaType as 'tv' | 'movie') || 'tv';
    const data = await tmdbService.getDetails(id, mediaType);
    res.json(data);
  } catch (error: any) {
    console.error(`Error fetching details for ${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message || 'Failed to fetch media details' });
  }
});

/**
 * GET /api/tmdb/credits/:id
 * Query params: mediaType ('tv' | 'movie')
 */
router.get('/credits/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const mediaType = (req.query.mediaType as 'tv' | 'movie') || 'tv';
    const data = await tmdbService.getCredits(id, mediaType);
    res.json(data);
  } catch (error: any) {
    console.error(`Error fetching credits for ${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message || 'Failed to fetch media credits' });
  }
});

/**
 * GET /api/tmdb/tv/:id/season/:seasonNumber
 */
router.get('/tv/:id/season/:seasonNumber', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const seasonNumber = String(req.params.seasonNumber);
    const data = await tmdbService.getSeason(id, Number(seasonNumber) || 1);
    res.json(data);
  } catch (error: any) {
    console.error(`Error fetching season ${req.params.seasonNumber} for ${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message || 'Failed to fetch season details' });
  }
});

/**
 * GET /api/tmdb/similar/:id
 * Query params: mediaType ('tv' | 'movie')
 */
router.get('/similar/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const mediaType = (req.query.mediaType as 'tv' | 'movie') || 'tv';
    const data = await tmdbService.getSimilar(id, mediaType);
    res.json(data);
  } catch (error: any) {
    console.error(`Error fetching similar media for ${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message || 'Failed to fetch similar media' });
  }
});

export default router;
