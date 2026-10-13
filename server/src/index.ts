import dns from 'node:dns';
import http from 'node:http';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { config, getSafeConfigDiagnostics } from './config.js';
import tmdbRoutes from './routes/tmdb.routes.js';
import communityRoutes from './routes/community.routes.js';
import reviewRoutes from './routes/review.routes.js';
import { initSocketServer } from './socket.js';
import prisma from './db/prisma.js';
import { tmdbService } from './services/tmdb.service.js';

// Prioritize IPv4 resolution to prevent connect timeouts on dual-stack hosts
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore if unsupported in environment
}

const app = express();

const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
].filter(Boolean);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, server-to-server, mobile)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        (origin.endsWith('.vercel.app') && origin.includes('popcho'))
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());

// Request logging middleware (safe, no body/secret printing)
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Root status handler (friendly indicator when accessing http://localhost:5000 in browser)
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'PopCho Backend API',
    status: 'online',
    message: 'The PopCho API server is running successfully.',
    frontendUrl: config.clientUrl || 'http://localhost:5173',
    endpoints: {
      health: '/api/health',
      live: '/api/health/live',
      trendingTv: '/api/tmdb/trending?mediaType=tv&timeWindow=week&page=1',
      trendingMovies: '/api/tmdb/trending?mediaType=movie&timeWindow=week&page=1',
      communities: '/api/communities',
    },
  });
});

// Basic liveness probe (does not call downstream dependencies)
app.get('/api/health/live', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'popcho-server',
    timestamp: new Date().toISOString(),
  });
});

// Primary health & readiness check with safe, bounded database probe
app.get('/api/health', async (_req: Request, res: Response) => {
  let dbStatus: 'connected' | 'disconnected' | 'not_configured' = 'not_configured';

  if (config.databaseUrl) {
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB health check timeout')), 2500)),
      ]);
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }
  }

  const isDegraded = dbStatus === 'disconnected';

  res.status(isDegraded ? 503 : 200).json({
    status: isDegraded ? 'degraded' : 'ok',
    service: 'popcho-server',
    timestamp: new Date().toISOString(),
    tmdbConfigured: config.tmdb.isConfigured(),
    tmdbAuthMode: config.tmdb.authMode,
    database: dbStatus,
    realtime: 'socket.io-enabled',
  });
});

// Explicit bounded TMDB connectivity diagnostic (isolated from primary health polling)
app.get('/api/health/tmdb', async (_req: Request, res: Response) => {
  if (!config.tmdb.isConfigured()) {
    return res.status(503).json({
      status: 'error',
      service: 'tmdb-upstream',
      configured: false,
      message: 'TMDB credentials are not configured on the server.',
    });
  }

  try {
    await tmdbService.getTrending('all', 'week', 1);
    res.json({
      status: 'ok',
      service: 'tmdb-upstream',
      configured: true,
      authMode: config.tmdb.authMode,
      upstreamReachable: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'TMDB probe failed';
    res.status(502).json({
      status: 'error',
      service: 'tmdb-upstream',
      configured: true,
      authMode: config.tmdb.authMode,
      upstreamReachable: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Mount Routes
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/reviews', reviewRoutes);

// Global Error Handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  console.error('Unhandled server error:', message);
  res.status(500).json({
    error: message,
  });
});

// Create HTTP server and attach Socket.IO
const httpServer = http.createServer(app);
const io = initSocketServer(httpServer, allowedOrigins);

httpServer.listen(config.port, () => {
  const diagnostics = getSafeConfigDiagnostics();
  console.log(`[PopCho Server] Listening on http://localhost:${diagnostics.port}`);
  console.log(`[PopCho Server] TMDB Auth Mode: ${diagnostics.tmdbAuthMode} (Configured: ${diagnostics.tmdbConfigured})`);
  console.log(`[PopCho Server] Database Configured: ${diagnostics.databaseConfigured}`);
  console.log(`[PopCho Server] Real-time messaging active with Socket.IO`);
});

export { app, httpServer, io };
export default app;
