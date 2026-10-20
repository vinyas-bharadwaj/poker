# Multiplayer Texas Hold'em Poker App — The Card Room

A production-ready real-time multiplayer Texas Hold'em web application designed for private clubs and friendly home games. Features server-authoritative poker logic, buttery-smooth card animations, audio cues, dynamic elliptical seating, live hand evaluations, side pots/split pots, arbitrary raises, and automatic post-game debt settlement.

---

## Architecture Overview (Full Phases 1–6 Implemented)

- **Monorepo Structure**: Uses standard `npm workspaces` separating client and server.
- **Frontend (`frontend/`)**: Next.js 14 (App Router), React 18, Tailwind CSS (classic ivory/parchment theme & green felt), Framer Motion, and Web Audio API synthesizer.
- **Backend (`backend/`)**: Node.js + Express, Socket.io bidirectional WebSocket engine, TypeScript, Prisma ORM, and PostgreSQL.
- **Game Engine (`backend/src/game/`)**: Server-authoritative Texas Hold'em engine with:
  - 52-card standard deck with Fisher-Yates cryptographically uniform shuffle.
  - Multi-round betting (Pre-flop, Flop, Turn, River, Showdown).
  - Accurate side pot and split pot calculation.
  - Arbitrary raises beyond the minimum bet.
  - Inactivity/turn countdown timer (25s) with auto-fold/check.
  - Real-time client-side best 5-card hand evaluator for instant feedback.
- **Post-Game Settlement (`backend/src/rooms/roomManager.ts`)**: Greedy min-cash-flow algorithm computing the exact minimum transactions needed to settle all debts in Indian Rupees (`₹`).
- **Database & ORM (`backend/prisma/`)**: PostgreSQL managed with Prisma ORM, tracking user accounts, lifetime winnings/losses, and completed session records.

---

## Production Deployment Structure

### 1. Database (PostgreSQL)
- **Recommended**: Managed PostgreSQL (e.g. Neon, Supabase, Railway, or AWS RDS).
- **Prisma Migration**: Run `npx prisma migrate deploy` on release.

### 2. Backend Service (Stateful WebSocket Server)
- **Recommended**: Render, Railway, Fly.io, or VPS (DigitalOcean/EC2).
- *Note*: Requires a persistent Node.js environment to maintain Socket.io state and table memory (cannot be deployed to serverless lambdas).
- **Build Command**: `npm --workspace=backend run build`
- **Start Command**: `npm --workspace=backend run start`

### 3. Frontend Service (Next.js 14)
- **Recommended**: Vercel or Render.
- **Build Command**: `npm --workspace=frontend run build`
- **Start Command**: `npm --workspace=frontend run start`

---

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
CORS_ORIGIN="https://your-frontend-domain.vercel.app"
```

### Frontend (`frontend/.env.production`)
```env
NEXT_PUBLIC_API_URL="https://your-backend-domain.onrender.com"
NEXT_PUBLIC_SOCKET_URL="https://your-backend-domain.onrender.com"
```

---

## Quickstart (Local Development)

### 1. Start the PostgreSQL Database
```bash
npm run db:up
```

### 2. Run Database Migrations & Seed Initial Data
```bash
npm run db:migrate
npm run db:seed
```

### 3. Start Both Services (Frontend & Backend)
```bash
npm run dev
```

* **Frontend**: [http://localhost:3000](http://localhost:3000)
* **Backend API**: [http://localhost:5000](http://localhost:5000)
* **Backend Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## App Routes

- `/` - Club Ledger & Standings (Filterable by Top Winners or Biggest Losers, past game archive)
- `/lobby` - Game Room Hub (Host a private table, enter invite code, browse open tables)
- `/lobby/[code]` - Live Poker Room & Table (Live Texas Hold'em gameplay, seating, cards, action controls, settlement modal)
- `/login` - Member sign-in with redirect handling
- `/register` - Member registration with email & username validation
- `/profile` - Player Profile dashboard displaying lifetime winnings, lifetime losses, and net ledger balance
