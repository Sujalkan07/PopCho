import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deterministic environment resolution:
// Resolves relative to server directory structure, regardless of CWD.
const serverRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(serverRoot, '..');

const serverEnvPath = path.resolve(serverRoot, '.env');
const repoEnvPath = path.resolve(repoRoot, '.env');

// 1. Load server/.env first if present
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
}

// 2. Fallback to repository root .env for unpopulated variables
if (fs.existsSync(repoEnvPath)) {
  dotenv.config({ path: repoEnvPath });
}

// 3. Fallback to process.cwd() .env as safety net
dotenv.config();

const readAccessToken = (process.env.TMDB_READ_ACCESS_TOKEN || '').trim();
const apiKey = (process.env.TMDB_API_KEY || '').trim();

export type TmdbAuthMode = 'token' | 'key' | 'none';

/**
 * Determine TMDB credential strategy with explicit precedence:
 * 1. TMDB_READ_ACCESS_TOKEN (v4 Bearer token) - PREFERRED
 * 2. TMDB_API_KEY (v3 API key parameter) - FALLBACK
 * 3. 'none' if no valid credential exists
 */
export function getTmdbAuthMode(): TmdbAuthMode {
  if (readAccessToken) return 'token';
  if (apiKey) return 'key';
  return 'none';
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  jwtSecret: process.env.JWT_SECRET || 'popcho_jwt_secret_dev',
  databaseUrl: process.env.DATABASE_URL || '',
  tmdb: {
    apiKey,
    readAccessToken,
    authMode: getTmdbAuthMode(),
    baseUrl: (process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3').replace(/\/+$/, ''),
    imageBaseUrl: (process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p').replace(/\/+$/, ''),
    isConfigured(): boolean {
      return getTmdbAuthMode() !== 'none';
    },
  },
};

/**
 * Safe diagnostic summary that NEVER leaks credentials or secrets.
 */
export function getSafeConfigDiagnostics() {
  return {
    port: config.port,
    clientUrl: config.clientUrl,
    databaseConfigured: Boolean(config.databaseUrl),
    tmdbAuthMode: config.tmdb.authMode,
    tmdbConfigured: config.tmdb.isConfigured(),
    tmdbBaseUrl: config.tmdb.baseUrl,
  };
}
