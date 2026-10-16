# PopCho — Fandom Meets Streaming 🍿🎬

[![Live Frontend](https://img.shields.io/badge/Frontend-Vercel-black?style=for-the-badge&logo=vercel)](https://pop-cho.vercel.app)
[![Live Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://popcho-backend.onrender.com)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)

> **PopCho** is a modern entertainment discovery and fan-engagement platform. It bridges the gap between streaming catalogs and social fandom by uniting live media browsing with show-specific community hubs, real-time topic channels, spoiler-protected discussions, long-form user reviews, and personal watchlists.

---

## 🌟 Live Deployments

- **Web Application (Frontend)**: [https://pop-cho.vercel.app](https://pop-cho.vercel.app)
- **REST & Real-Time API (Backend)**: [https://popcho-backend.onrender.com](https://popcho-backend.onrender.com)
- **API Health Check**: [`https://popcho-backend.onrender.com/api/health`](https://popcho-backend.onrender.com/api/health)

---

## 📖 The Problem & The Vision

### Why PopCho?
In the current streaming era, entertainment discovery is fragmented:
1. **Catalog Silos**: Viewers browse Netflix, Disney+, Apple TV+, and HBO Max separately without a centralized social hub.
2. **Dispersed Discussions**: Fan discourse is scattered across Reddit threads, Discord servers, Twitter/X hashtags, and Letterboxd logs.
3. **Spoiler Hazards**: Casual viewers fear browsing social media while watching an ongoing series due to unmoderated spoilers.

### What PopCho Solves:
PopCho brings the entire viewing lifecycle into one cohesive, cinematic experience:
- **Discover**: Browse trending, top-rated, and upcoming movies and TV shows powered by real-time TMDB integration.
- **Connect**: Jump directly from any title into its dedicated **Fandom Hub** with specialized chat channels (`#general`, `#theories`, `#episodes`, `#spoilers`).
- **Discuss in Real-Time**: Engage in live chat rooms with WebSocket messaging, user presence indicators, and spoiler-reveal masks.
- **Critique & Express**: Write comprehensive essays or quick reviews with custom star scores, category tags, and community upvotes.
- **Track**: Maintain a private watchlist synchronized seamlessly across your devices.

---

## 🏛️ System Architecture

```
                    ┌────────────────────────────────────────┐
                    │               END USER                 │
                    └──────────────────┬─────────────────────┘
                                       │ HTTPS (Web Browser)
                                       ▼
                    ┌────────────────────────────────────────┐
                    │            Vercel (Frontend)           │
                    │         React 19 + Vite 8 SPA          │
                    │      https://pop-cho.vercel.app        │
                    └────────────┬──────────────┬────────────┘
                                 │              │
                   REST & WSS    │              │ Supabase Auth SDK
                 (VITE_API_URL)  │              │ (Public Anon Key)
                                 ▼              ▼
     ┌──────────────────────────────────────────┐   ┌───────────────────────────┐
     │             Render (Backend)             │   │       Supabase Auth       │
     │        Express 4 + Socket.IO 4           │   │  GoTrue Identity Service  │
     │    https://popcho-backend.onrender.com   │   │ https://<proj>.supabase.co│
     └───────────┬──────────────────────────┬───┘   └─────────────┬─────────────┘
                 │                          │                     │
     Prisma ORM  │                          │ HTTPS (Bearer)      │ Token Verification
     (Port 6543) │                          │ Server Proxy        │ (serverSupabase)
                 ▼                          ▼                     ▼
┌──────────────────────────┐   ┌──────────────────────────────────────┐
│  Supabase PostgreSQL DB  │   │               TMDB API               │
│ Managed Cloud PostgreSQL │   │          api.themoviedb.org          │
│  Prisma Migration Engine │   │         (v4 Bearer Token)            │
└──────────────────────────┘   └──────────────────────────────────────┘
```

---

## 🚀 Key Features in Detail

### 1. 🎬 Intelligent Media Discovery
- **Live TMDB Catalog**: Fetches trending TV series, blockbuster movies, top-rated shows, and daily recommendations.
- **Server-Side Proxy**: All TMDB requests route through the backend, keeping API keys secret and implementing IPv4 resolution.
- **Deep Metadata Inspection**: Cast & crew profiles, official trailers, release dates, synopsis, content ratings, and genre tags.
- **Debounced Instant Search**: Global search bar in the navbar and discover tab with real-time title filtering.

### 2. 💬 Fandom Hubs & Real-Time Chat Workspaces
- **Automatic Hub Provisioning**: Accessing any movie or TV series automatically provisions its community space in the database.
- **Multi-Channel Architecture**:
  - `#general`: Daily fan banter, news, and cast discussions.
  - `#theories`: Plot predictions, easter egg hunts, and lore deep dives.
  - `#episodes`: Live watch-party reactions and episode breakdowns.
  - `#spoilers`: Masked safe space for leaks, endings, and plot reveals.
  - `#fan-art`: Community creations, edits, wallpapers, and memes.
- **Real-Time WebSocket Engine**: Instant bidirectional messaging powered by Socket.IO with fallback REST endpoints.
- **Spoiler Blur Shields**: Messages tagged with `[SPOILER]` or submitted in spoiler mode render with click-to-reveal blur masks.
- **Interactive Reactions**: Emoji counters (`🔥`, `❤️`, `🤯`, `😂`, `👏`) with instant optimistic client updates.
- **Live Fan Presence**: Active member counters showing how many fans are in the channel room.

### 3. ✍️ Community Reviews & Editorial System
- **Rich Review Composer**: Full-screen modal with debounced media autocomplete, star score slider (1.0 - 10.0), spoiler toggle, and essay classification.
- **Review Feed & Filtering**: Sort by trending, highest rated, newest, or category.
- **Helpful Voting**: Readers vote on helpful analyses with duplicate vote prevention.
- **Nested Comments**: Threaded discussions under individual reviews.

### 4. 🔖 Personal Watchlists & Multi-User Isolation
- **One-Click Bookmarking**: Add or remove movies and TV shows from anywhere on the platform.
- **Isolated User Data**: Strict database scoping ensures users only view and modify their own watchlists and bookmarks.
- **Instant Persistence**: Immediate updates stored in PostgreSQL via Prisma models.

### 5. 🔐 Enterprise-Grade Authentication
- **Supabase GoTrue Integration**: Email signup, login, session persistence, and avatar generation.
- **Cryptographic Token Verification**: The Express backend and Socket.IO server verify incoming Supabase JWT Bearer tokens directly with Supabase's identity service.

---

## 🛠️ Tech Stack & Tools

| Layer | Technologies | Purpose |
|---|---|---|
| **Frontend UI** | **React 19**, **TypeScript**, **Tailwind CSS v4** | Component-driven, responsive dark-mode interface |
| **Build & Bundler** | **Vite 8** | Sub-second HMR and production bundle optimization |
| **Icons & Styling** | **Lucide React**, Google Material Symbols | Modern iconography and sleek aesthetic |
| **Client Routing** | **React Router v7** | Client-side SPA routing with deep link rewrites |
| **Backend API** | **Node.js (v22)**, **Express 4**, **TypeScript** | RESTful routing, input validation, and middleware pipeline |
| **Real-Time Engine** | **Socket.IO 4** | Bidirectional WebSocket rooms, presence, and chat events |
| **Database & ORM** | **PostgreSQL**, **Prisma ORM (v6)** | Strongly typed database models, relations, and migrations |
| **Identity / Auth** | **Supabase Auth (GoTrue)** | Secure JWT issuing, refresh tokens, and user metadata |
| **Media Catalog** | **The Movie Database (TMDB) API v3/v4** | High-resolution posters, backdrops, and media details |
| **Hosting (Frontend)** | **Vercel** | Global Edge CDN with automated SPA rewrites |
| **Hosting (Backend)** | **Render** | Managed Node.js Web Service with zero-downtime deploys |
| **Hosting (Database)**| **Supabase Cloud** | Managed PostgreSQL with connection pooling |

---

## 📁 Repository Structure

```
PopCho/
├── public/                     # Static client assets (favicons, icons)
├── src/                        # Frontend React 19 source code
│   ├── components/             # Reusable UI component modules
│   │   ├── auth/               # AuthModal (Supabase login & register)
│   │   ├── chat/               # CommunityChatWorkspace, JoinHubModal
│   │   ├── directory/          # RequestHubModal, Hub cards
│   │   ├── navigation/         # Navbar, Footer, Mobile Navigation
│   │   └── reviews/            # ReviewCard, ReviewComposerModal
│   ├── context/                # React context providers (AuthContext)
│   ├── pages/                  # Top-level route views
│   │   ├── CommunitiesPage.tsx # Hub directory & category browser
│   │   ├── CommunityReviewsPage.tsx # Global review stream & filters
│   │   ├── DiscoverPage.tsx    # Trending hero banner, media carousels
│   │   ├── HubsPage.tsx        # Fandom hub dashboard & active rooms
│   │   ├── MovieDetailPage.tsx # Media title inspector, cast, reviews
│   │   └── WatchlistPage.tsx   # User personal bookmarked library
│   ├── services/               # Frontend API clients & socket connectors
│   │   ├── community/          # Community REST client & Socket.IO helpers
│   │   ├── review/             # Review fetch, compose, vote APIs
│   │   ├── tmdb/               # TMDB query wrappers & TypeScript types
│   │   └── watchlist/          # User watchlist sync client
│   ├── types/                  # Global shared TypeScript interfaces
│   ├── App.tsx                 # Root application component & layout
│   ├── main.tsx                # React DOM entrypoint
│   └── index.css               # Tailwind CSS rules & theme variables
├── server/                     # Backend Node.js & Express service
│   ├── prisma/                 # Database schema & migrations
│   │   ├── migrations/         # PostgreSQL migration history
│   │   │   └── 20261015000000_init/ # Baseline migration SQL
│   │   └── schema.prisma       # Prisma data model definition
│   ├── src/                    # Backend TypeScript source code
│   │   ├── db/                 # Prisma client instance configuration
│   │   ├── middleware/         # Auth verification & CORS middleware
│   │   ├── routes/             # Express API controllers & routes
│   │   │   ├── auth.routes.ts      # Profile sync & identity routes
│   │   │   ├── community.routes.ts # Hub lookup, channels, messages
│   │   │   ├── review.routes.ts    # Review CRUD, comments, helpful votes
│   │   │   ├── tmdb.routes.ts      # TMDB proxy (trending, details, search)
│   │   │   └── watchlist.routes.ts # User-isolated watchlist endpoints
│   │   ├── services/           # Business logic & external adapters
│   │   │   ├── chat.service.ts     # Channel message persistence & queries
│   │   │   ├── community.service.ts# Hub auto-provisioning & seeding
│   │   │   ├── review.service.ts   # Review calculations & comments
│   │   │   ├── supabase.service.ts # Supabase JWT token verification
│   │   │   ├── tmdb.service.ts     # TMDB upstream fetcher with IPv4 DNS
│   │   │   └── watchlist.service.ts# Watchlist DB queries
│   │   ├── config.ts           # Type-safe environment variable parser
│   │   ├── index.ts            # HTTP server setup, routes, & error handling
│   │   └── socket.ts           # Socket.IO connection & event handlers
│   ├── package.json            # Server dependencies & scripts
│   └── tsconfig.json           # Server TypeScript compiler configuration
├── .env.example                # Example frontend environment variables
├── package.json                # Root package configuration & build scripts
├── render.yaml                 # Render Blueprint deployment definition
├── vercel.json                 # Vercel SPA routing rewrite rules
└── vite.config.ts              # Vite configuration with Tailwind plugin
```

---

## ⚙️ Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ / v22+ recommended)
- **npm** or **pnpm**
- **PostgreSQL**: A local PostgreSQL server or a free [Supabase](https://supabase.com) project

### 1. Clone the Repository
```bash
git clone https://github.com/Sujalkan07/PopCho.git
cd PopCho
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Configure Environment Variables

**Frontend (`.env` in repository root):**
```env
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-key
```

**Backend (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL="postgresql://postgres:password@localhost:5432/popcho?schema=public"
JWT_SECRET=generate_any_random_32_character_secret_string
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-publishable-key
TMDB_READ_ACCESS_TOKEN=your_tmdb_v4_read_access_token
TMDB_API_KEY=your_tmdb_v3_api_key
ENABLE_DEV_AUTH_BYPASS=false
```

### 4. Initialize Database
```bash
cd server
npm run prisma:generate
npm run prisma:deploy
cd ..
```

### 5. Start Development Servers
Open two terminal windows:

**Terminal 1 (Backend API on port 5000):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend Client on port 5173):**
```bash
npm run dev
```

Visit [`http://localhost:5173`](http://localhost:5173) in your browser!

---

## 🚢 Deployment Guide

### Backend on Render
1. Create a **Web Service** on [Render](https://dashboard.render.com).
2. Connect `https://github.com/Sujalkan07/PopCho`.
3. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install --include=dev && npm run prisma:generate && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
4. Supply the backend environment variables listed in Section 3 above.

### Frontend on Vercel
1. Import repository `Sujalkan07/PopCho` into [Vercel](https://vercel.com/new).
2. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add environment variables:
   - `VITE_API_URL`: Your Render backend URL (`https://popcho-backend.onrender.com`)
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase publishable key
4. Deploy! SPA routing rewrites are automatically handled via [`vercel.json`](./vercel.json).

---

## 🛡️ Security & Reliability Features

- **No Secret Leakage**: Private credentials (`DATABASE_URL`, `TMDB_READ_ACCESS_TOKEN`, `JWT_SECRET`) remain exclusively on the server and are never bundled into client JavaScript.
- **Strict CORS & WebSocket Whitelisting**: The API dynamically validates origins, strictly allowing production domains, Vercel preview environments, and local development.
- **Cryptographic Token Verification**: All socket handshakes and API mutations authenticate against Supabase's live GoTrue authentication service.
- **Graceful Fault Tolerance**: Downstream TMDB and database timeouts are isolated with safe boundaries so that partial outages do not crash the server.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

*Crafted with ❤️ for movie and TV fans worldwide.*
