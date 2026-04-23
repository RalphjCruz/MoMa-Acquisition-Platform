# Step Notes (Public)

## Step 3 - MongoDB + First Artwork Read API

Date: 2026-04-23

### What was implemented
- Added MongoDB connection layer with two modes:
  - external MongoDB via `MONGODB_URI`
  - in-memory MongoDB fallback (`USE_IN_MEMORY_DB=true`) for easier development.
- Added artwork domain modules:
  - model: `src/models/artwork.model.js`
  - service: `src/services/artwork.service.js`
  - controller: `src/controllers/artwork.controller.js`
  - route: `src/routes/artworks.routes.js`
- Added server startup workflow:
  - DB connect on boot
  - optional seed on boot (`AUTO_SEED_ON_START=true`)
  - graceful shutdown on `SIGINT/SIGTERM`.
- Added dataset tooling:
  - subset builder script: `scripts/buildMomaSubset.js`
  - seed script: `scripts/seedArtworksFromSubset.js`
  - subset file: `backend/data/moma_subset_200.json`.
- Exposed first real catalogue endpoint:
  - `GET /api/artworks` with paging/search/filter/sort query support.

### How to test
1. Install and run backend:
   - `cd backend`
   - `npm install`
   - `npm run dev`
2. Verify health:
   - `curl http://localhost:3001/api/health`
3. Verify artworks list:
   - `curl "http://localhost:3001/api/artworks?page=1&limit=5&sortBy=title&order=asc"`
4. Verify search:
   - `curl "http://localhost:3001/api/artworks?q=Wright&limit=3"`

### Success criteria
- `/api/health` returns HTTP `200`.
- `/api/artworks` returns HTTP `200` with:
  - `data` array
  - `pagination` object with `page`, `limit`, `totalItems`, `totalPages`.
- Search/filter/sort query parameters alter results predictably.

### Theory: why it works
- Express route receives request and forwards query params to the service layer.
- Service layer builds MongoDB filter/sort/pagination options.
- Mongoose executes queries against seeded artwork collection.
- Controller returns normalized JSON response contract for frontend use.

