import { Router, type Request, type Response } from 'express';
import { prisma } from '../db/prisma.js';
import { authMiddleware, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/auth/me
 * Returns current authenticated user and profile
 */
router.get('/me', async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.json({ authenticated: false, user: null, profile: null });
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.user.id },
    });

    res.json({
      authenticated: true,
      user: req.user,
      profile: profile || {
        id: req.user.id,
        email: req.user.email,
        displayName: req.user.name,
        avatarUrl: req.user.avatar,
        role: req.user.role,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve profile';
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/auth/profile
 * Sync / upsert profile for authenticated user.
 * Role escalation is strictly prohibited: roles cannot be modified by user requests.
 */
router.post('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { displayName, avatarUrl, username } = req.body;

    const profile = await prisma.profile.upsert({
      where: { id: userId },
      update: {
        ...(displayName !== undefined && { displayName: String(displayName).trim() }),
        ...(avatarUrl !== undefined && { avatarUrl: String(avatarUrl).trim() }),
        ...(username !== undefined && { username: String(username).trim() }),
      },
      create: {
        id: userId,
        email: req.user?.email || null,
        displayName: displayName ? String(displayName).trim() : req.user?.name || 'PopCho Fan',
        avatarUrl: avatarUrl ? String(avatarUrl).trim() : req.user?.avatar || null,
        username: username ? String(username).trim() : null,
        role: 'Community Member',
      },
    });

    res.json({ profile });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save profile';
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/auth/avatar
 * Dedicated endpoint to update and confirm user avatar selection during onboarding or settings.
 */
router.post('/avatar', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { avatarUrl, avatarSource, avatarMediaId, avatarCharacter, avatarTitle } = req.body;

    if (!avatarUrl || typeof avatarUrl !== 'string' || !avatarUrl.trim()) {
      return res.status(400).json({ error: 'Valid avatarUrl is required' });
    }

    const cleanAvatarUrl = avatarUrl.trim();

    const profile = await prisma.profile.upsert({
      where: { id: userId },
      update: {
        avatarUrl: cleanAvatarUrl,
      },
      create: {
        id: userId,
        email: req.user?.email || null,
        displayName: req.user?.name || 'PopCho Fan',
        avatarUrl: cleanAvatarUrl,
        role: 'Community Member',
      },
    });

    res.json({
      success: true,
      profile: {
        ...profile,
        avatarSource: avatarSource || null,
        avatarMediaId: avatarMediaId || null,
        avatarCharacter: avatarCharacter || null,
        avatarTitle: avatarTitle || null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save avatar';
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/auth/profile/:id
 * Retrieve sanitized public profile for another user.
 * Private credentials such as email are strictly excluded.
 */
router.get('/profile/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const profile = await prisma.profile.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve profile';
    res.status(500).json({ error: msg });
  }
});

export default router;
