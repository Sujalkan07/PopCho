import { Router, type Request, type Response } from 'express';
import { avatarService } from '../services/avatar.service.js';

const router = Router();

/**
 * GET /api/avatars/catalog
 * Retrieve canon avatars with category, archetype, or query filters.
 */
router.get('/catalog', (req: Request, res: Response) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const archetype = typeof req.query.archetype === 'string' ? req.query.archetype : undefined;
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;

    const result = avatarService.getCatalog({ category, archetype, query });
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve avatar catalog';
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/avatars/random
 * Pick a random character portrait, optionally filtered by category.
 */
router.get('/random', (req: Request, res: Response) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const item = avatarService.getRandom(category);
    res.json({ item });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to select random avatar';
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/avatars/:id
 * Retrieve single character avatar by ID.
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const item = avatarService.getById(id);
    if (!item) {
      return res.status(404).json({ error: 'Avatar character not found' });
    }
    res.json({ item });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve avatar';
    res.status(500).json({ error: msg });
  }
});

export default router;
