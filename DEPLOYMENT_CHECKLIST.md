# PopCho — Production Deployment Checklist

This document is the actionable, step-by-step operations checklist for deploying **PopCho** to production.

---

## 1. Recommended Service Architecture

```
                    ┌────────────────────────────────────────┐
                    │               END USER                 │
                    └──────────────────┬─────────────────────┘
                                       │ HTTPS (Web Browser)
                                       ▼
                    ┌────────────────────────────────────────┐
                    │            Vercel (Frontend)           │
                    │         React 19 + Vite 8 SPA          │
                    │      https://<your-app>.vercel.app     │
                    └────────────┬──────────────┬────────────┘
                                 │              │
                   REST / WSS    │              │ Supabase Auth SDK
                   (VITE_API_URL)│              │ (Public Anon Key)
                                 ▼              ▼
     ┌───────────────────────────────┐   ┌───────────────────────────┐
     │        Render (Backend)       │   │       Supabase Auth       │
     │      Express + Socket.IO      │   │  GoTrue Identity Service  │
     │ https://<backend>.onrender.com│   │ https://<proj>.supabase.co│
     └───────────┬──────────────┬────┘   └─────────────┬─────────────┘
                 │              │                      │
     Direct /    │              │ HTTPS                │ Token Verification
     Pooled TCP  │              │ (Bearer Token)       │ (serverSupabase)
                 ▼              ▼                      ▼
┌──────────────────────────┐  ┌──────────────────────────────────────┐
│  Managed PostgreSQL DB   │  │               TMDB API               │
│  (Supabase / Neon / AWS) │  │          api.themoviedb.org          │
│   Prisma ORM (Port 5432) │  │        (Server-side Bearer)          │
└──────────────────────────┘  └──────────────────────────────────────┘
```

- **Frontend**: Vercel (Edge static hosting with client-side SPA routing).
- **Backend API & WebSockets**: Render (Node.js Web Service running Express 4 and Socket.IO 4).
- **Database**: Managed PostgreSQL (Supabase Database, Neon, or Render PostgreSQL).
- **Authentication**: Supabase Auth (GoTrue) using Bearer JWTs and cryptographic token verification.
- **Media Catalog**: Upstream TMDB API v3 via server-side proxy with IPv4 resolution.

---

## 2. Directory Roots & Build / Start Commands

### Frontend (Vercel)
- **Root Directory**: `.` (Repository root)
- **Framework Preset**: `Vite`
- **Install Command**: `npm install`
- **Build Command**: `npm run build` (`tsc -b && vite build`)
- **Output Directory**: `dist`
- **Node.js Version**: `20.x` or `22.x`

### Backend (Render)
- **Root Directory**: `server`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run prisma:generate && npm run build`
- **Start Command**: `npm start` (`node --dns-result-order=ipv4first dist/index.js`)
- **Health Check Path**: `/api/health`

---

## 3. Environment Variables Specification

> **SECURITY NOTICE**: NEVER commit `.env` files or expose private tokens. Frontend variables starting with `VITE_` are bundled into browser-accessible code; secrets must strictly remain on the backend.

### 3.1 Frontend Environment Variables (Vercel)

| Variable Name | Required | Type | Target Environment | Description / Example Value |
|---|---|---|---|---|
| `VITE_API_URL` | **Yes** | Public | Production, Preview | HTTPS origin of the deployed Render backend (e.g. `https://popcho-backend.onrender.com`). |
| `VITE_SUPABASE_URL` | **Yes** | Public | Production, Preview | Supabase project URL (`https://<project-ref>.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Public | Production, Preview | Supabase public anonymous API key (`eyJ...`). |

### 3.2 Backend Environment Variables (Render)

| Variable Name | Required | Type | Target Environment | Description / Example Value |
|---|---|---|---|---|
| `NODE_ENV` | **Yes** | Public | Production | Must be set to `production`. Automatically disables dev auth bypasses. |
| `PORT` | **Auto** | System | Production | Render automatically injects this port (e.g. `10000`). |
| `CLIENT_URL` | **Yes** | Public | Production | HTTPS origin of your Vercel frontend (e.g. `https://popcho.vercel.app`). Included in CORS whitelist. |
| `DATABASE_URL` | **Yes** | **Secret** | Production | Production PostgreSQL connection URI with SSL (`postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB]?sslmode=require`). |
| `JWT_SECRET` | **Yes** | **Secret** | Production | Cryptographic secret for signing internal sessions (generate 32+ random characters). |
| `SUPABASE_URL` | **Yes** | Public | Production | Supabase project URL (`https://<project-ref>.supabase.co`). |
| `SUPABASE_ANON_KEY` | **Yes** | Public | Production | Supabase anonymous key used for server-side token verification fallback. |
| `SUPABASE_SERVICE_ROLE_KEY`| Optional | **Secret** | Production | Supabase privileged service role key (for administrative user sync). |
| `TMDB_READ_ACCESS_TOKEN` | **Yes** | **Secret** | Production | TMDB v4 Read Access Token (Bearer auth). Preferred credential mode. |
| `TMDB_API_KEY` | Optional | **Secret** | Production | TMDB v3 API Key (used as fallback if Read Access Token is absent). |
| `ENABLE_DEV_AUTH_BYPASS` | **Yes** | Flag | Production | Must be set to `false`. |

---

## 4. Production Database Preparation & Migration Procedure

### 4.1 Safe Baseline Initialization
The repository contains a validated, cumulative migration baseline at `server/prisma/migrations/20261015000000_init/migration.sql`.

To initialize a new, empty managed production database:
1. Provision your PostgreSQL instance on Supabase, Neon, or Render.
2. Obtain the production connection string. If using Supabase or PgBouncer, ensure:
   - For direct migration execution: use the **Direct Connection URL** (port 5432).
   - For runtime queries: use the **Connection Pooler URL** (port 6543, transaction mode) or Direct URL.
3. From your local deployment terminal (or via a secure CI/CD migration job), execute:
   ```bash
   cd server
   DATABASE_URL="<YOUR_PRODUCTION_DATABASE_URL>" npx prisma migrate deploy
   ```
4. Verify migration status:
   ```bash
   DATABASE_URL="<YOUR_PRODUCTION_DATABASE_URL>" npx prisma migrate status
   ```
   *Expected result: "Database schema is up to date! 1 migration found in prisma/migrations".*

> **CRITICAL SAFEGUARD**: Never run `prisma migrate reset`, `prisma db push --force-reset`, or destructive DDL on a production database with live records.

---

## 5. Vercel Deployment Instructions

1. Push the repository to GitHub.
2. Log in to [Vercel Dashboard](https://vercel.com) and click **"Add New Project"**.
3. Import `PopCho`.
4. Configure Project Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Configure Environment Variables in Vercel:
   - `VITE_API_URL`: `https://<your-render-service>.onrender.com`
   - `VITE_SUPABASE_URL`: `https://<your-project>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `<your-supabase-anon-key>`
6. Deploy.
7. Verification: Navigate to a sub-route (e.g. `/discover` or `/communities`) and reload the browser page. The `vercel.json` SPA rewrite rule guarantees that reloading does not return 404.

---

## 6. Render Deployment Instructions

1. Log in to [Render Dashboard](https://render.com) and click **"New +" -> "Web Service"**.
2. Connect your GitHub repository `PopCho`.
3. Configure Service Settings:
   - **Name**: `popcho-backend`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run prisma:generate && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Standard or Free (Standard recommended for persistent WebSocket connections without spin-down)
4. Configure Environment Variables in Render:
   - Add all 10 backend variables listed in Section 3.2.
5. Configure Health Check:
   - Set **Health Check Path** to `/api/health`.
6. Deploy.
7. Verification: Render will automatically execute the build, run the health check against `/api/health`, and mark the service as live once it returns status 200.

---

## 7. Supabase Authentication Setup

1. In the [Supabase Dashboard](https://supabase.com/dashboard), navigate to **Authentication -> URL Configuration**.
2. Set **Site URL** to your Vercel production domain:
   - `https://<your-app>.vercel.app`
3. Add Redirect URLs:
   - `https://<your-app>.vercel.app/**`
   - `http://localhost:5173/**` (for local development)
4. Under **Authentication -> Providers -> Email**, ensure Email Signup is enabled. (If rate limiting occurs on free tier, configure custom SMTP via Resend or SendGrid).

---

## 8. CORS & WebSocket Real-Time Configuration

- The backend dynamically allows:
  1. Any origin explicitly matching `CLIENT_URL`.
  2. Any localhost / loopback address (`http://localhost:5173`, `http://127.0.0.1:5173`).
  3. Any Vercel deployment ending with `.vercel.app` that contains `popcho`.
- When custom domains are attached to Vercel (e.g. `https://popcho.com`), update `CLIENT_URL` in Render environment variables.
- Socket.IO utilizes the same origin validation callback as Express, ensuring seamless WebSocket and HTTP polling handshakes.

---

## 9. Health Checks & Observability

The backend provides three distinct observability endpoints:

1. `GET /api/health`
   - Primary readiness and liveness check.
   - Probes database connectivity (`SELECT 1`) with a 2.5-second timeout.
   - Returns HTTP 200 when healthy, or HTTP 503 if database connectivity is degraded.
2. `GET /api/health/live`
   - Lightweight orchestrator probe (returns HTTP 200 without downstream I/O).
3. `GET /api/health/tmdb`
   - Isolated upstream TMDB connectivity diagnostic.

---

## 10. Post-Deployment Verification Procedure

Perform the following manual and automated smoke tests immediately after going live:

- [ ] **Liveness Probe**: Visit `https://<backend>.onrender.com/api/health` -> verify `"status": "ok"` and `"database": "connected"`.
- [ ] **SPA Route Traversal**: Visit `https://<app>.vercel.app/discover`, reload browser -> verify no 404 error.
- [ ] **Media Browsing**: Open Discover page -> verify live TMDB titles and high-resolution posters load.
- [ ] **Search Verification**: Search "Severance" in Global Navbar and Discover search bar -> verify debounced results.
- [ ] **Authentication**: Sign up / Log in with a real email account via Supabase modal -> verify profile avatar and session persistence.
- [ ] **Watchlist Persistence**: Bookmark a movie -> reload page -> verify item remains bookmarked.
- [ ] **Review Composer Autocomplete**: Open Reviews page -> Click "Write a Review" -> type show title -> select autocomplete result -> submit -> verify review appears with real artwork.
- [ ] **Community Join & Real-Time Chat**: Join a community hub -> open text channel -> send message -> verify instant display and persistence after refresh.
- [ ] **Cross-User Isolation**: Open incognito session as User B -> verify User A's private watchlist and reviews cannot be tampered with.

---

## 11. Rollback & Disaster Recovery Strategy

1. **Frontend Rollback**:
   - In Vercel Dashboard -> Deployments -> find the previous stable deployment -> click **"Promote to Production"**. Rollback takes < 5 seconds.
2. **Backend Rollback**:
   - In Render Dashboard -> Deploys -> find previous commit -> click **"Rollback"**.
3. **Database Safeguard**:
   - Enable automated point-in-time recovery (PITR) in your PostgreSQL hosting provider.
   - Do not perform destructive table drops in migrations; write additive migrations for schema evolution.
