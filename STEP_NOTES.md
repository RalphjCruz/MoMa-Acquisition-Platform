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

## Step 3.2 - Switch Backend to External MongoDB Mode

Date: 2026-04-23

### What was implemented
- Updated backend environment template for real MongoDB mode:
  - `MONGODB_URI=mongodb://127.0.0.1:27017`
  - `USE_IN_MEMORY_DB=false`
- Created local `backend/.env` with external MongoDB configuration.
- Restarted backend and verified API calls while running against external MongoDB.

### How to test
1. Create `backend/.env`:
   - `PORT=3001`
   - `NODE_ENV=development`
   - `MONGODB_URI=mongodb://127.0.0.1:27017`
   - `MONGODB_DB_NAME=moma_acquisition_platform`
   - `USE_IN_MEMORY_DB=false`
   - `AUTO_SEED_ON_START=true`
2. Start backend:
   - `cd backend`
   - `npm run dev`
3. Validate:
   - `curl http://localhost:3001/api/health`
   - `curl "http://localhost:3001/api/artworks?page=1&limit=3"`
4. Check startup logs contain `MongoDB connected (external)`.

### Success criteria
- Backend starts and logs external DB connection mode.
- Endpoints return HTTP `200`.
- `api/artworks` returns seeded records with pagination.

### Theory: why it works
- `dotenv` loads `backend/.env` at process start.
- With `USE_IN_MEMORY_DB=false`, database connector bypasses memory server and uses `MONGODB_URI`.
- Mongoose creates a real TCP connection to local `mongod` (`127.0.0.1:27017`), so writes/reads persist between runs.

### Validation result on this machine
- Startup log: `MongoDB connected (external)`.
- Startup log: `Seed skipped: Artwork collection already contains data.`
- `GET /api/health` -> `200`
- `GET /api/artworks?page=1&limit=3` -> `200`

## Step 4 - Simple Next.js Frontend Viewer

Date: 2026-04-23

### What was implemented
- Added Next.js frontend app in `frontend/`.
- Implemented simple read-only catalogue interface:
  - list artworks from backend
  - search (`q`)
  - sort and order controls
  - pagination (`page`, fixed page size)
- Added quick links in UI to backend:
  - `GET /api/health`
  - backend `GET /about` page.
- Added frontend env config:
  - `.env.example` with `NEXT_PUBLIC_API_BASE_URL`.
- Updated docs for cross-device setup and run instructions.

### How to test
1. Backend terminal:
   - `cd backend`
   - `npm run dev`
2. Frontend terminal:
   - `cd frontend`
   - `npm install`
   - copy `.env.example` to `.env.local`
   - `npm run dev`
3. Open:
   - `http://localhost:3000`
4. Verify:
   - cards render from backend data
   - search changes results
   - sort/order changes ordering
   - next/previous pagination works
   - About/Health links open backend endpoints

### Success criteria
- Frontend starts without build/runtime errors.
- Data loads from backend and updates with query controls.
- UI is responsive on desktop/mobile widths.
- Frontend still works on another machine by only changing env files.

### Theory: why it works
- Next.js renders a client page that requests data from Express API using `fetch`.
- Query controls update component state, which rebuilds query string and triggers refetch.
- Backend handles filtering/sorting/pagination; frontend only displays returned page.
- API base URL is environment-driven, so deployment/machine changes do not require code edits.

## Step 5.1 - Artwork Read-by-ID Endpoint

Date: 2026-04-23

### What was implemented
- Added single-item artwork endpoint:
  - `GET /api/artworks/:id`
- Supports two identifier formats:
  - Mongo document `_id`
  - numeric MoMA `objectId`
- Added validation and error mapping:
  - invalid id format -> `400 VALIDATION_ERROR`
  - missing record -> `404 ARTWORK_NOT_FOUND`
  - found record -> `200` with `{ data: artwork }`

### How to test
1. Start backend:
   - `cd backend`
   - `npm run dev`
2. Fetch one id:
   - `curl "http://localhost:3001/api/artworks?page=1&limit=1"`
3. Use returned `_id`:
   - `curl "http://localhost:3001/api/artworks/<_id>"`
4. Use returned `objectId`:
   - `curl "http://localhost:3001/api/artworks/<objectId>"`
5. Test error paths:
   - `curl "http://localhost:3001/api/artworks/not-valid-id"`
   - `curl "http://localhost:3001/api/artworks/999999999"`

### Success criteria
- Valid `_id` and `objectId` return `200` and a single artwork object.
- Invalid id format returns `400` with `VALIDATION_ERROR`.
- Unknown numeric id returns `404` with `ARTWORK_NOT_FOUND`.

### Theory: why it works
- Route forwards `:id` param to service layer.
- Service detects id type:
  - digits => query by `objectId`
  - valid ObjectId => query by Mongo `_id`
- Service throws typed errors for invalid/not-found cases.
- Error middleware converts thrown errors into consistent JSON responses.

## Step 5.2 - Artwork Create Endpoint

Date: 2026-04-23

### What was implemented
- Added create endpoint:
  - `POST /api/artworks`
- Added payload validation for create:
  - required: `objectId`, `title`
  - optional normalized fields: `artistDisplayName`, `department`, `classification`, `medium`, `dateText`, `dateAcquired`, `creditLine`, `isPublicDomain`, `tags`
  - unknown fields rejected with `400 VALIDATION_ERROR`
- Added duplicate protection:
  - existing `objectId` returns `409 DUPLICATE_OBJECT_ID`
- Added malformed JSON handling in global error middleware:
  - returns `400 VALIDATION_ERROR` with `Malformed JSON request body.`

### How to test
1. Start backend:
   - `cd backend`
   - `npm run dev`
2. Create (success):
   - `curl -i -X POST http://localhost:3001/api/artworks -H "Content-Type: application/json" -d "{\"objectId\":880001,\"title\":\"New API Artwork\",\"artistDisplayName\":\"Tester\"}"`
3. Duplicate create (same objectId):
   - rerun previous command
4. Validation failure:
   - `curl -i -X POST http://localhost:3001/api/artworks -H "Content-Type: application/json" -d "{\"title\":\"Missing objectId\"}"`
5. Malformed JSON:
   - `curl -i -X POST http://localhost:3001/api/artworks -H "Content-Type: application/json" -d "{bad-json"`

### Success criteria
- Valid payload returns `201` and created artwork in `{ data }`.
- Duplicate `objectId` returns `409 DUPLICATE_OBJECT_ID`.
- Missing required fields returns `400 VALIDATION_ERROR`.
- Malformed JSON returns `400 VALIDATION_ERROR`.

### Theory: why it works
- Controller forwards request body to service.
- Service validates/normalizes incoming fields before DB write.
- Service checks uniqueness by `objectId` before create.
- Centralized error middleware ensures predictable API error contracts.

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

### 7) Port `3001` already in use during verification
- Symptom: `EADDRINUSE: address already in use :::3001`.
- Root cause: an old Node backend process was still running.
- Fix:
  - identified owner process via `Get-NetTCPConnection -LocalPort 3001`
  - stopped old process and reran verification cleanly.
- Prevention:
  - always check active listener before launching duplicate local servers.

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
