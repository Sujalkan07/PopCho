import dns from 'node:dns';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { config } from './config.js';
import tmdbRoutes from './routes/tmdb.routes.js';

// Prioritize IPv4 resolution to prevent connect timeouts on dual-stack hosts
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore if unsupported in environment
}

const app = express();

// Middlewares
app.use(cors({
  origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
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
    tmdbConfigured: Boolean(config.tmdb.readAccessToken || config.tmdb.apiKey)
  });
});

// Mount TMDB Routes
app.use('/api/tmdb', tmdbRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error'
  });
});

const server = app.listen(config.port, () => {
  console.log(` PopCho Server running on http://localhost:${config.port}`);
  console.log(` TMDB integration active with secure backend proxy`);
});

export default app;
