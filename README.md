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

## Run Backend

```bash
cd backend
npm install
npm run dev
```

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
