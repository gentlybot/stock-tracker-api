# AGENTS.md - Stock Tracker API

## Project Overview

Stock Tracker API is a demo/example Node.js backend for a stock tracking app. It provides REST endpoints for user authentication, stock search/detail, and portfolio management. All stock data is fake and randomized -- no external APIs are used.

## Tech Stack

- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express
- **Database:** PostgreSQL via `pg` (node-postgres)
- **ORM:** Drizzle ORM (`drizzle-orm` + `drizzle-kit`)
- **Validation:** Zod
- **Auth:** JWT (`jsonwebtoken`) + bcryptjs
- **Dev tools:** tsx (for running TS directly)

## Project Structure

```
stock-tracker-api/
  drizzle.config.ts          # Drizzle Kit config (schema path, DB credentials)
  drizzle/                   # Generated migration SQL files
  src/
    index.ts                 # Express app entry point, route mounting, CORS
    db/
      pool.ts                # pg Pool + Drizzle db instance (both exported)
      schema.ts              # Drizzle table definitions (users, stocks, portfolio_stocks, stock_price_history)
      seed.ts                # Idempotent seed script (tables + demo data)
    middleware/
      auth.ts                # JWT verify middleware, signToken helper
    routes/
      auth.ts                # POST /api/auth/login
      stocks.ts              # GET /api/stocks/search, GET /api/stocks/:symbol
      portfolio.ts           # GET /api/portfolio, POST/DELETE /api/portfolio/stocks
```

## Key Patterns

- **Database access:** All routes import `db` from `src/db/pool.ts` and use Drizzle query builder (e.g., `db.select().from(stocks).where(...)`). No raw SQL in route handlers.
- **Schema:** Defined in `src/db/schema.ts` using `pgTable()`. Column names use camelCase in TypeScript (e.g., `currentPrice`) mapped to snake_case in the DB (e.g., `current_price`).
- **Validation:** Request bodies validated with Zod schemas before processing.
- **Auth:** JWT token in `Authorization: Bearer <token>` header. Middleware at `src/middleware/auth.ts` adds `userId` to the request.
- **Seed idempotency:** The seed script uses `CREATE TABLE IF NOT EXISTS`, checks for existing records before inserting, and uses `onConflictDoNothing()` for bulk inserts. Safe to run multiple times.

## Setup & Running

```bash
npm install
cp .env.example .env          # Edit DATABASE_URL if needed
npm run db:setup               # Idempotent: creates database + tables + seeds data
npm run dev                    # Start dev server on port 3001
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (default: `postgresql://postgres:postgres@localhost:5432/stock_tracker`)
- `JWT_SECRET` - Secret for signing JWT tokens
- `PORT` - Server port (default: 3001)

## Demo Credentials

- Email: `demo@example.com`
- Password: `D3m0$tock!2025`

## Common Tasks

- **Add a new table:** Define it in `src/db/schema.ts` with `pgTable()`, then run `npx drizzle-kit generate` and `npx drizzle-kit push`.
- **Add a new endpoint:** Create or edit a route file in `src/routes/`, mount it in `src/index.ts`.
- **Re-seed data:** Run `npm run db:seed`. It's idempotent -- existing data won't be duplicated.
- **Reset database completely:** Drop the DB (`dropdb stock_tracker`), then `npm run db:setup` (it recreates everything).
- **View DB visually:** Run `npx drizzle-kit studio`.
