# PopCho 🍿

> A Netflix-inspired cinematic fan community and media discovery platform where users can discover movies and TV shows, join dedicated fandom communities, chat in real time, and publish critical deep dives.

---

## 🚀 Overview

PopCho combines modern streaming-platform aesthetics with community-driven fandom engagement. Powered by real-time data from **The Movie Database (TMDB)** and a dedicated **PostgreSQL** backend, PopCho offers high-signal discussion, live watchrooms, and authentic user reviews.

---

## ✨ Features (In Progress)

- **Cinematic Top 5 Trending Hero Slider**: Dynamic showcase of trending titles featuring multi-stop scrim gradients, autoplay with pause-on-hover, keyboard accessibility, and an interactive thumbnail selector.
- **Live TMDB Media Discovery**: Search and inspect official movie and TV series metadata, credits, artwork, and international reviews via a secure backend proxy.
- **Community Reviews & Critique Corps**: 
  - Publish rich essays, thematic breakdowns, and season finale verdicts.
  - Star ratings, spoiler warnings, and instant live title lookup.
  - Interactive community engagement: helpful voting, fan commentary threads, and bookmarking.
  - Live aggregated **Top Critics Leaderboard**.
- **Fandom Communities & Real-Time Chat**: Dedicated show hubs with multi-channel discussions and live emoji reactions powered by **Socket.IO**.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, Socket.IO
- **Database & ORM**: PostgreSQL, Prisma ORM
- **External Data**: TMDB (The Movie Database) API

---

## 🏁 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **npm** (or pnpm / yarn)
- **PostgreSQL** instance running locally or hosted

---

### 2. Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/PopCho.git
   cd PopCho
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Install backend dependencies**:
   ```bash
   cd server
   npm install
   cd ..
   ```

---

### 3. Environment Configuration

1. **Backend Environment** (`server/.env`):
   Copy `server/.env.example` to `server/.env` and supply your database URL and TMDB credentials:
   ```env
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   DATABASE_URL=postgresql://user:password@localhost:5432/popcho
   JWT_SECRET=your_jwt_secret_here

   # TMDB Server Credentials (Bearer token preferred)
   TMDB_READ_ACCESS_TOKEN=your_tmdb_read_access_token
   TMDB_API_KEY=your_tmdb_api_key_optional
   ```

2. **Frontend Environment** (`.env`):
   ```env
   VITE_API_URL=http://localhost:5000
   ```

---

### 4. Database Setup

From the `server` directory, sync the Prisma schema with your database:
```bash
cd server
npm run prisma:push
npm run prisma:generate
cd ..
```

---

### 5. Running Locally

Start both the backend server and frontend development server:

- **Terminal 1 (Backend)**:
  ```bash
  cd server
  npm run dev
  # Server runs on http://localhost:5000
  ```

- **Terminal 2 (Frontend)**:
  ```bash
  npm run dev
  # Vite dev server runs on http://localhost:5173
  ```

---

## 📁 Project Structure

```text
PopCho/
├── src/                      # Frontend source
│   ├── components/           # UI components (Hero, Chat, Directory, Reviews)
│   ├── pages/                # Page views (HomePage, Discover, Reviews, Communities)
│   ├── services/             # API services (tmdb, community, review)
│   └── styles/               # CSS tokens and styling
├── server/                   # Backend Express server
│   ├── prisma/               # Prisma schema and migrations
│   └── src/
│       ├── db/               # Prisma client connection
│       ├── routes/           # REST endpoints (tmdb, community, review)
│       ├── services/         # Business logic & TMDB proxy
│       └── socket.ts         # Real-time WebSocket handlers
└── README.md
```

---

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
