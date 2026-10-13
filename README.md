git # PopCho

## About
PopCho is an entertainment-focused web application where users can discover movies and television shows, publish reviews, and participate in fan communities and discussions. The platform integrates metadata from The Movie Database (TMDB) with a dedicated backend service to support community-driven discussions and media exploration.

> **Note:** PopCho is an ongoing project under active development.

## Current Features
- **Media Discovery:** Browse trending and popular movies and TV series retrieved through a secure TMDB backend proxy.
- **Title Inspection:** Search titles and inspect verified metadata including release dates, genres, official ratings, and overviews.
- **Community Reviews:** Publish long-form reviews with custom star scores, spoiler tags, and review categories.
- **Review Interactions:** Engage with community reviews through helpful voting and fan commentary threads.
- **Fandom Hubs & Real-Time Chat:** Access show-specific communities with topic-based chat channels powered by WebSockets.

## Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript, Socket.IO
- **Database:** PostgreSQL, Prisma ORM
- **External API:** The Movie Database (TMDB) API

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database instance

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/PopCho.git
   cd PopCho
   ```

2. Install root and frontend dependencies:
   ```bash
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd server
   npm install
   cd ..
   ```

### Database Setup
Push the Prisma schema to your PostgreSQL database:
```bash
cd server
npm run prisma:push
npm run prisma:generate
cd ..
```

### Running Locally
Run the backend and frontend services in separate terminal windows:

- **Backend:**
  ```bash
  cd server
  npm run dev
  ```
  The API server runs on `http://localhost:5000`.

- **Frontend:**
  ```bash
  npm run dev
  ```
  The client application runs on `http://localhost:5173`.

## Environment Variables
PopCho uses environment variables for service endpoints, database connections, and API credentials. Copy the provided sample files and fill in your values.

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:5000
```

### Backend (`server/.env`)
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://username:password@localhost:5432/popcho
JWT_SECRET=your_jwt_secret_here

# TMDB Credentials (v4 Read Access Token or v3 API Key)
TMDB_READ_ACCESS_TOKEN=your_tmdb_read_access_token
TMDB_API_KEY=your_tmdb_api_key
```

*Note: Never commit your `.env` files or real credentials to version control.*

## Project Status
PopCho is currently under active development. Core browsing, review submission, and community chat functionality are implemented, with ongoing work focused on data consistency, state handling, and interface refinement.

## Future Plans
- Complete user registration and personal profile workflows
- Watchlist management and custom user lists
- Enhanced search filters and recommendation engines
- Expanded moderation and notification systems
