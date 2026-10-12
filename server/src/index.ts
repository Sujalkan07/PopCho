import dns from 'node:dns';
import http from 'node:http';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { config } from './config.js';
import tmdbRoutes from './routes/tmdb.routes.js';
import communityRoutes from './routes/community.routes.js';
import { initSocketServer } from './socket.js';

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
];

// Middlewares
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'popcho-server',
    timestamp: new Date().toISOString(),
    tmdbConfigured: Boolean(config.tmdb.readAccessToken || config.tmdb.apiKey),
    database: 'connected',
    realtime: 'socket.io-enabled',
  });
});

// Mount Routes
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/communities', communityRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Create HTTP server and attach Socket.IO
const httpServer = http.createServer(app);
const io = initSocketServer(httpServer, allowedOrigins);

httpServer.listen(config.port, () => {
  console.log(` PopCho Server running on http://localhost:${config.port}`);
  console.log(` TMDB integration active with secure backend proxy`);
  console.log(` Real-time messaging active with Socket.IO`);
});

export { app, httpServer, io };
export default app;

