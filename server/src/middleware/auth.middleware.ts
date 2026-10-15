import type { Request, Response, NextFunction } from 'express';
import { serverSupabase, isServerSupabaseConfigured } from '../services/supabase.service.js';
import prisma from '../db/prisma.js';

export interface UserIdentity {
  id: string;
  name: string;
  avatar: string;
  role: string;
  email?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserIdentity;
    }
  }
}

export const DEFAULT_DEV_USER: UserIdentity = {
  id: 'user_fan_01',
  name: 'You (Fan)',
  avatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBmNfypXexpUqGV6ruN3XC8n2OqYyfzM-rHCYQH9eIHwRrMERZmMPSMVhkWDh7lAeFDaMoIKQEcn8pdfMMGDKqiI4PsbTQxIEly40c9OC_7jeis6uUX0Xmau1lUS3kAo7bw8bA67k1U1vhNTC8RwMbUTFVgQAOvm-N4cKCenSDe7FIT_9PVezInr_GDwS61-H7-0B_F9PO1zaeOr3XWdla-rkuVL8j2MXny0EU59iaaB5L157FxLwbvqw',
  role: 'Community Member',
};

/**
 * Universal authentication middleware.
 * Supports:
 * 1. Supabase Bearer JWT verification (when Supabase is configured).
 * 2. Unverified JWT payload inspection in local development when keys are not yet configured.
 * 3. Fallback to custom dev headers (x-user-id, x-user-name).
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();

    if (token) {
      // If server Supabase client is configured, verify token cryptographically
      if (isServerSupabaseConfigured && serverSupabase) {
        try {
          const { data, error } = await serverSupabase.auth.getUser(token);
          if (!error && data.user) {
            const u = data.user;
            const meta = u.user_metadata || {};
            const name = meta.full_name || meta.name || u.email?.split('@')[0] || 'PopCho Fan';
            const avatar = meta.avatar_url || meta.picture || DEFAULT_DEV_USER.avatar;

            req.user = {
              id: u.id,
              name,
              avatar,
              role: 'Community Member',
              email: u.email,
            };

            // Optional asynchronous profile sync
            try {
              await prisma.profile.upsert({
                where: { id: u.id },
                update: {
                  email: u.email,
                  displayName: name,
                  avatarUrl: avatar,
                },
                create: {
                  id: u.id,
                  email: u.email,
                  displayName: name,
                  avatarUrl: avatar,
                  role: 'Community Member',
                },
              });
            } catch {
              // Silently ignore profile sync errors so request is not blocked
            }

            return next();
          }
        } catch (err) {
          console.error('[AuthMiddleware] Supabase token verification failed:', err);
        }
      } else {
        // Fallback for development if Supabase token is passed but server keys are not yet set
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            if (payload && payload.sub) {
              const meta = payload.user_metadata || {};
              req.user = {
                id: payload.sub,
                name: meta.full_name || meta.name || payload.email?.split('@')[0] || `User_${payload.sub.slice(0, 6)}`,
                avatar: meta.avatar_url || meta.picture || DEFAULT_DEV_USER.avatar,
                role: 'Community Member',
                email: payload.email,
              };
              return next();
            }
          }
        } catch {
          // Token decode failed, proceed to dev header fallback
        }
      }
    }
  }

  // Fallback to dev headers
  const customId = req.headers['x-user-id'] as string | undefined;
  const customName = req.headers['x-user-name'] as string | undefined;
  const customAvatar = req.headers['x-user-avatar'] as string | undefined;
  const customRole = req.headers['x-user-role'] as string | undefined;

  if (customId && customId.trim()) {
    req.user = {
      id: customId.trim(),
      name: customName?.trim() || `User_${customId.slice(0, 6)}`,
      avatar: customAvatar?.trim() || DEFAULT_DEV_USER.avatar,
      role: customRole?.trim() || 'Community Member',
    };
  }

  next();
}

/**
 * Require authentication guard.
 * Returns 401 if no valid user identity is present on the request.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      error: 'Authentication required. Please sign in to perform this action.',
    });
    return;
  }
  next();
}

/**
 * Legacy export for backward compatibility
 */
export const devAuthMiddleware = authMiddleware;
