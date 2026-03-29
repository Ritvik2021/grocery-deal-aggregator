# 🛒 Grocery Deal Aggregator

A full-stack web app that aggregates weekly grocery deals from major Canadian retailers — **Walmart CA, Real Canadian Superstore, No Frills, Save-on-Foods, and Costco CA** — all in one place.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + TypeScript + TailwindCSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Supabase) |
| Data Source | Flipp API (primary) |
| Scheduling | node-cron (weekly Thursday fetch) |

## Monorepo Structure

```
grocery-deal-aggregator/
├── backend/    # Express API + Flipp fetcher + cron job
└── frontend/   # React + Vite SPA
```

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier)

### Backend

```bash
cd backend
cp .env.example .env
# Fill in your DATABASE_URL and other vars
npm install
npm run db:migrate     # Apply schema to Supabase
npm run dev            # Start on port 3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # Start on port 5173
```

### Seed Data

Once the backend is running, trigger a manual Flipp fetch:

```bash
curl -X POST http://localhost:3001/api/admin/refresh \
  -H "x-admin-secret: your_admin_secret"
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stores` | List all stores |
| GET | `/api/deals` | List deals (supports `?store=`, `?category=`, `?minSavings=`, `?search=`, `?limit=`, `?offset=`) |
| GET | `/api/deals/:id` | Single deal |
| POST | `/api/admin/refresh` | Manually trigger Flipp data fetch |

## Roadmap

- **Phase 1** ✅ Flipp API integration + full-stack scaffold
- **Phase 2** PC Express API (RCS/No Frills) + Save-on-Foods API
- **Phase 3** Shopping lists, meal planning, price history, push notifications
