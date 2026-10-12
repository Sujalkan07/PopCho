import type { Request, Response, NextFunction } from 'express';

export interface UserIdentity {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
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
 * Development authentication middleware.
 * Resolves user identity from request headers (x-user-id, x-user-name, etc.)
 * or defaults to a stable local development user.
 */
export function devAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
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
  } else {
    req.user = DEFAULT_DEV_USER;
  }

  next();
}
