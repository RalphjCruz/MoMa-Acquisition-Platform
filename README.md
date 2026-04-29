# MoMA Acquisition Intelligence Platform

Enterprise Application Development assignment project using:

- Frontend: Next.js + React
- Backend: Node.js + Express (REST API)
- Database: MongoDB + Mongoose

## Architecture

- `frontend/` is the client application used to test REST services.
- `backend/` is the API server that serves data and business logic.
- `backend/src/views/about.html` is served by backend route `GET /about`.

## Assignment Mapping

- Required `index.html` equivalent frontend page: implemented as Next.js pages:
  - `http://localhost:3000/` (Artwork Catalogue)
  - `http://localhost:3000/users` (User Profiles)
  - `http://localhost:3000/acquisitions` (Acquisition Tracking)
- Backend About page button/link target:
  - `http://localhost:3001/about`

## Implemented Features

### Core Requirements

- Node.js + Express REST server
- MongoDB persistence with Mongoose
- MoMA subset loading and seed flow
- Full artwork CRUD:
  - `POST /api/artworks`
  - `GET /api/artworks`
  - `GET /api/artworks/:id`
  - `PATCH /api/artworks/:id`
  - `DELETE /api/artworks/:id`

### Distinction-Oriented Extensions

- Search/filter/sort/pagination for artworks
- User profiles module (no auth mode):
  - `GET/POST/PATCH/DELETE /api/users`
- Acquisition tracking module:
  - `GET/POST/PATCH/DELETE /api/acquisitions`
  - `GET /api/users/:id/acquisitions`
  - business rule: acquisition can be marked `acquired` only from `approved`
- Responsive UI with sticky top navigation and mobile layouts
- Backend served About page with architecture, limitations, and alternatives

## Prerequisites

- Node.js `>=18.17.0`
- npm
- MongoDB Community Server running locally (default `27017`)
  - optional: MongoDB Compass for inspecting collections

## Environment Setup

Create these files from examples:

- `backend/.env` from `backend/.env.example`
- `frontend/.env.local` from `frontend/.env.example`

Default backend `.env.example` values:

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=moma_acquisition_platform
USE_IN_MEMORY_DB=false
AUTO_SEED_ON_START=true
```

## Run the Project

### 1) Start backend

```bash
cd backend
npm install
npm run dev
```

Expected log includes:

- `Backend listening on port 3001`

### 2) Start frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

- `http://localhost:3000`

## Frontend Routes

- Artwork Catalogue: `http://localhost:3000/`
- User Profiles: `http://localhost:3000/users`
- Acquisition Tracking: `http://localhost:3000/acquisitions`

## Backend Quick Checks

```bash
curl http://localhost:3001/api/health
curl "http://localhost:3001/api/artworks?page=1&limit=5&sortBy=title&order=asc"
curl "http://localhost:3001/api/artworks?q=Wright&limit=3"
curl "http://localhost:3001/api/users?limit=5"
curl "http://localhost:3001/api/acquisitions?limit=5"
curl http://localhost:3001/about
```

## Optional: Rebuild MoMA Subset

```bash
cd backend
npm run build:subset -- --limit=200
```

## 10k Dataset Import (Final Scale Test)

Build and import a 10,000 item subset:

```bash
cd backend
npm run build:subset -- --limit=10000
npm run seed:subset -- --file=moma_subset_10000.json --if-data=merge
```

Seed mode options:

- `--if-data=skip` (default): skip if artworks already exist
- `--if-data=merge`: upsert into existing data (non-destructive)
- `--if-data=replace`: wipe artwork collection then import file

Quick verification:

```bash
curl "http://localhost:3001/api/artworks?limit=1"
```

Check `pagination.totalItems` in response (should be around `10000+` depending on merge mode and existing custom records).

## Database Collections

Main MongoDB collections used:

- `artworks`
- `users`
- `acquisitions`

## Final QA Evidence

Use the project QA checklist before recording/submitting:

- `FINAL_QA_CHECKLIST.md`
