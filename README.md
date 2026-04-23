# MoMa-Acquisition-Platform

MoMA Acquisition Intelligence Platform for the EAD assignment.

## Current Implemented Steps

- Backend scaffold using Node.js + Express
- Health endpoint at `GET /api/health`
- Backend-served About page at `GET /about`
- MongoDB integration with Mongoose
- Development fallback using `mongodb-memory-server`
- Artwork subset seed flow (`backend/data/moma_subset_200.json`)
- `GET /api/artworks` with query support:
  - `q`
  - `department`
  - `classification`
  - `artist`
  - `sortBy`
  - `order`
  - `page`
  - `limit`
- `GET /api/artworks/:id` (supports Mongo `_id` or numeric `objectId`)
- `POST /api/artworks` (validated create endpoint)
- `PATCH /api/artworks/:id` (validated partial update endpoint)
- `DELETE /api/artworks/:id`
- Next.js frontend viewer:
  - list view
  - search
  - sorting
  - pagination
  - quick create
  - inline edit
  - delete action
  - backend about/health quick links

## Run Backend

```bash
cd backend
npm install
npm run dev
```

Before running, create `backend/.env` from `backend/.env.example`.

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Before running frontend, create `frontend/.env.local` from `frontend/.env.example`.

Open in browser:

- `http://localhost:3000`

## Test Backend Endpoints

```bash
curl http://localhost:3001/api/health
curl "http://localhost:3001/api/artworks?page=1&limit=5&sortBy=title&order=asc"
curl "http://localhost:3001/api/artworks?q=Wright&limit=3"
```

## Rebuild MoMA Subset (Optional)

```bash
cd backend
npm run build:subset -- --limit=200
```

## Cross-Laptop Compatibility Checklist

- Install Node.js LTS (18.17+ recommended).
- Install MongoDB Community Server and ensure service is running on `27017`.
- Clone repo.
- Create:
  - `backend/.env` from `backend/.env.example`
  - `frontend/.env.local` from `frontend/.env.example`
- Run backend first, then frontend.
