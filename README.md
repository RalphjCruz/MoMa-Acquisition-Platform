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
- User profiles (no auth):
  - `GET /api/users`
  - `POST /api/users`
  - `GET /api/users/:id`
  - `PATCH /api/users/:id`
  - `DELETE /api/users/:id`
- Acquisition tracking:
  - `GET /api/acquisitions`
  - `POST /api/acquisitions`
  - `GET /api/acquisitions/:id`
  - `PATCH /api/acquisitions/:id`
  - `DELETE /api/acquisitions/:id`
  - `GET /api/users/:id/acquisitions`
- Next.js frontend viewer:
  - list view
  - search
  - sorting
  - pagination
  - quick create
  - inline edit
  - delete action
  - user profile creation/list/delete section (no auth)
  - acquisition creation/list/status update/delete section
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

Example user/acquisition flow:

```bash
curl -X POST "http://localhost:3001/api/users" -H "Content-Type: application/json" -d "{\"displayName\":\"Test Curator\",\"email\":\"test.curator@example.com\",\"role\":\"curator\"}"
curl "http://localhost:3001/api/users?limit=5"
curl -X POST "http://localhost:3001/api/acquisitions" -H "Content-Type: application/json" -d "{\"userId\":\"<USER_ID>\",\"artworkId\":2,\"status\":\"considering\",\"proposedPrice\":1200}"
curl "http://localhost:3001/api/users/<USER_ID>/acquisitions?limit=5"
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
