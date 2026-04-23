# Step Notes (Public)

## Step 3.1 - External MongoDB Verification

Date: 2026-04-23

### What was implemented
- Verified local MongoDB server installation and runtime status for transition away from in-memory mode.

### How to test
- `Get-Service *mongo*`
- `Test-NetConnection -ComputerName 127.0.0.1 -Port 27017`
- `Get-CimInstance Win32_Service -Filter "Name='MongoDB'" | Select Name,State,StartMode,PathName`

### Success criteria
- MongoDB service exists and is `Running`.
- TCP port `27017` is reachable on localhost.
- Service path points to `mongod.exe`.

### Theory: why it works
- If `mongod` runs as a Windows service and listens on `27017`, applications using
  `mongodb://127.0.0.1:27017` can establish driver connections and perform CRUD.
- Command-line tools (`mongod`, `mongosh`) not being in PATH does not block app connectivity.

### Validation result on this machine
- Service: `MongoDB` is `Running` and `StartMode=Auto`.
- Listening: `127.0.0.1:27017` reachable (`TcpTestSucceeded=True`).
- Binary path: `"C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --config ... --service`.

## Issues So Far + Fixes

### 1) Wrong repository/remote used initially
- Symptom: work was happening in a different repo (`FYP` / `AppDev`) than intended.
- Fix:
  - repointed `origin` to `https://github.com/RalphjCruz/MoMa-Acquisition-Platform.git`
  - fetched and tracked `origin/main`.
- Prevention:
  - always run `git remote -v` and `git branch -vv` before starting a new step.

### 2) Server failed to start after dependency updates
- Symptom: `Unable to connect to the remote server` from curl/browser.
- Root cause: startup crashed before listen.
- Fix:
  - run `node src/server.js` directly to reveal real startup error.
- Prevention:
  - when endpoint checks fail, inspect startup logs first (not network first).

### 3) MoMA download returned Git LFS pointer, not JSON
- Symptom: JSON parse failed with content like `version https://git-lfs.github.com/spec/v1`.
- Root cause: using `raw.githubusercontent.com` for an LFS-managed large file.
- Fix:
  - switched subset source to media URL:
    - `https://media.githubusercontent.com/media/MuseumofModernArt/collection/main/Artworks.json`
  - updated subset builder to stream first N objects.
- Prevention:
  - validate downloaded content shape before parsing full dataset.

### 4) BOM-related JSON parse error
- Symptom: `Unexpected token '﻿'` when parsing subset file.
- Fix:
  - strip UTF-8 BOM before `JSON.parse` in seed service.
- Prevention:
  - sanitize file input when reading JSON from generated files.

### 5) MoMA `Artist` field not always string
- Symptom: `item.Artist?.trim is not a function`.
- Root cause: mixed data types (string/array/null).
- Fix:
  - added normalization helper handling arrays, strings, nulls safely.
- Prevention:
  - never assume external dataset field types; normalize aggressively.

### 6) `package.json` script block duplication
- Symptom: invalid `package.json` after patching.
- Fix:
  - merged into one valid `scripts` object.
- Prevention:
  - validate file after edits (`npm install` is a quick structure check).

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
