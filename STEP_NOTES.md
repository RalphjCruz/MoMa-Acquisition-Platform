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

## Step 5.3 - Artwork Update Endpoint

Date: 2026-04-23

### What was implemented
- Added update endpoint:
  - `PATCH /api/artworks/:id`
- Supports id lookup by:
  - Mongo `_id`
  - numeric `objectId`
- Added update validation rules:
  - body must be non-empty JSON object
  - unknown fields rejected
  - `objectId` is immutable and cannot be updated
  - typed validation for `title`, `dateAcquired`, `isPublicDomain`, `tags`
- Returns:
  - `200` on success with updated record
  - `400` for invalid id/payload
  - `404` when target record is missing

### How to test
1. Start backend:
   - `cd backend`
   - `npm run dev`
2. Successful patch:
   - `curl -i -X PATCH http://localhost:3001/api/artworks/810287 -H "Content-Type: application/json" -d "{\"title\":\"API Test Artwork Updated\",\"isPublicDomain\":true,\"tags\":[\"api\",\"updated\"]}"`
3. Read-back:
   - `curl -i http://localhost:3001/api/artworks/810287`
4. Failure cases:
   - immutable field: `{"objectId":123}`
   - unknown field: `{"foo":"bar"}`
   - missing record id
   - invalid id format (`not-valid-id`)

### Success criteria
- Valid patch returns `200` with updated data.
- Illegal/unknown fields return `400 VALIDATION_ERROR`.
- Non-existing id returns `404 ARTWORK_NOT_FOUND`.

### Theory: why it works
- Service resolves flexible id query (objectId or _id), validates patch payload, then runs `findOneAndUpdate`.
- Validation logic controls allowed fields and type safety before DB write.
- Error middleware returns consistent response schema for all failure paths.

## Step 5.4 - Artwork Delete Endpoint

Date: 2026-04-23

### What was implemented
- Added delete endpoint:
  - `DELETE /api/artworks/:id`
- Supports id lookup by:
  - Mongo `_id`
  - numeric `objectId`
- Returns:
  - `200` with deleted record payload when found
  - `404 ARTWORK_NOT_FOUND` when no record exists
  - `400 VALIDATION_ERROR` for invalid id format

### How to test
1. Start backend:
   - `cd backend`
   - `npm run dev`
2. Create temp artwork:
   - `curl -i -X POST http://localhost:3001/api/artworks -H "Content-Type: application/json" -d "{\"objectId\":970001,\"title\":\"Delete Me\"}"`
3. Delete it:
   - `curl -i -X DELETE http://localhost:3001/api/artworks/970001`
4. Verify it is gone:
   - `curl -i http://localhost:3001/api/artworks/970001`
5. Error checks:
   - delete missing id
   - delete with invalid id format

### Success criteria
- Existing id delete returns `200` and deleted record.
- Re-fetch after delete returns `404`.
- Invalid id delete returns `400`.

### Theory: why it works
- Service resolves id format into a Mongo query, then executes `findOneAndDelete`.
- If query finds a record, it is removed and returned.
- If no record matches, typed not-found error is raised and returned consistently by middleware.

## Step 6 - Frontend CRUD (Unpolished)

Date: 2026-04-23

### What was implemented
- Extended frontend viewer page to support backend CRUD actions:
  - create artwork (`POST /api/artworks`)
  - edit artwork inline (`PATCH /api/artworks/:id`)
  - delete artwork (`DELETE /api/artworks/:id`)
- Kept existing read/search/sort/pagination flow intact.
- Added action feedback messaging for success/failure states.
- Added minimal rough styling for create/edit/delete controls.

### How to test
1. Backend terminal:
   - `cd backend`
   - `npm run dev`
2. Frontend terminal:
   - `cd frontend`
   - `npm run dev`
3. In browser (`http://localhost:3000`):
   - create a new artwork in `Quick Create`
   - edit any card using `Edit` -> `Save`
   - delete a card with `Delete`
   - use search/sort/pagination to verify list refreshes correctly

### Success criteria
- Create form adds a new record and shows success message.
- Edit updates fields and persists when reloaded.
- Delete removes the record and follow-up read/search confirms absence.
- Errors (duplicate objectId, bad input) appear as readable messages.

### Theory: why it works
- React state controls form values and list query params.
- UI actions send HTTP requests directly to REST endpoints.
- Backend validation enforces data quality; frontend surfaces backend errors to user.
- After each mutation, frontend re-fetches current list for consistency.

## Step 6.1 - Pagination Jump Controls (First/Last)

Date: 2026-04-23

### What was implemented
- Added `First` and `Last` buttons to frontend pagination controls.
- Added page-boundary state helpers to disable controls safely:
  - disable `First/Previous` on first page
  - disable `Next/Last` on last page

### How to test
1. Run backend and frontend.
2. Open `http://localhost:3000`.
3. Click `Last` and verify page jumps to final page.
4. Click `First` and verify page jumps to page 1.
5. Confirm disabled states:
   - on page 1: `First`, `Previous` disabled
   - on final page: `Next`, `Last` disabled

### Success criteria
- Jump buttons move directly to first/last page.
- No page-underflow/overflow happens.
- Buttons disable correctly at boundaries.

### Theory: why it works
- Pagination state drives backend query (`page` param).
- `setPage(1)` and `setPage(totalPages)` trigger refetch with the new page value.
- Boundary booleans guard invalid navigation UI states.

## Step 7.1 - Users + Acquisition Tracking Backend Module

Date: 2026-04-23

### What was implemented
- Added new domain models:
  - `User`
  - `Acquisition`
- Added full REST CRUD for users:
  - `GET/POST /api/users`
  - `GET/PATCH/DELETE /api/users/:id`
- Added full REST CRUD for acquisition tracking:
  - `GET/POST /api/acquisitions`
  - `GET/PATCH/DELETE /api/acquisitions/:id`
  - `GET /api/users/:id/acquisitions`
- Added relation validation:
  - acquisition create requires existing user + existing artwork
  - supports artwork reference by numeric `objectId` or Mongo `_id`
- Added data integrity guards:
  - unique user email
  - unique user+artwork acquisition pair
  - prevent deleting users that still own acquisition records
- Added status history tracking on acquisition status changes.

### How to test
1. Start backend:
   - `cd backend`
   - `npm run dev`
2. Create user:
   - `curl -i -X POST http://localhost:3001/api/users -H "Content-Type: application/json" -d "{\"displayName\":\"Buyer A\",\"email\":\"buyer.a@example.com\",\"role\":\"buyer\"}"`
3. Create acquisition:
   - `curl -i -X POST http://localhost:3001/api/acquisitions -H "Content-Type: application/json" -d "{\"userId\":\"<USER_ID>\",\"artworkId\":2,\"status\":\"considering\",\"proposedPrice\":1000}"`
4. List:
   - `curl -i "http://localhost:3001/api/users?limit=5"`
   - `curl -i "http://localhost:3001/api/acquisitions?limit=5"`
   - `curl -i "http://localhost:3001/api/users/<USER_ID>/acquisitions?limit=5"`
5. Update acquisition status:
   - `curl -i -X PATCH http://localhost:3001/api/acquisitions/<ACQ_ID> -H "Content-Type: application/json" -d "{\"status\":\"approved\"}"`
6. Negative tests:
   - duplicate email -> `409`
   - duplicate user/artwork acquisition -> `409`
   - bad artwork/user refs -> `404`
   - delete user with acquisitions -> `409`

### Success criteria
- User endpoints return correct CRUD behavior and validation errors.
- Acquisition endpoints enforce relational integrity and track status history.
- Conflict and not-found paths return typed JSON errors.

### Theory: why it works
- Users and acquisitions are separate collections linked by Mongo references.
- Service-layer validation enforces schema + business rules before DB writes.
- Status history appends change events when acquisition status transitions.
- Referential checks ensure acquisition records cannot point to missing users/artworks.

## Step 7.2 - Frontend Exposure for Users + Acquisitions

Date: 2026-04-23

### What was implemented
- Extended the main frontend page with two new unpolished sections:
  - `User Profiles (No Login)`
  - `Acquisition Tracking`
- Added user UI flows:
  - create user
  - list users
  - delete user
- Added acquisition UI flows:
  - create acquisition (user + artwork reference)
  - list acquisitions
  - quick status updates (`approved`, `acquired`)
  - delete acquisition
- Kept all previous artwork CRUD and query UI intact.

### How to test
1. Start backend and frontend.
2. In browser (`http://localhost:3000`):
   - create a user in `User Profiles`
   - create an acquisition for that user
   - update acquisition status
   - delete acquisition
   - delete user after acquisition removal
3. Verify error handling:
   - try deleting user that still has acquisitions (should fail with error message).

### Success criteria
- User and acquisition actions complete from UI with visible feedback.
- Backend relationship constraints surface readable messages in frontend.
- Page still renders artwork controls and data as before.

### Theory: why it works
- Each section has local form/list state and calls corresponding REST endpoints.
- After mutations, UI refetches affected datasets for consistency.
- Backend remains source of truth for validation and constraints.

## Step 7.3 - Enforce Approval Before Acquired Status

Date: 2026-04-23

### What was implemented
- Added backend transition rule in acquisition update service:
  - status cannot move directly to `acquired` unless current status is `approved`.
- Added typed error for invalid transition:
  - `409 INVALID_STATUS_TRANSITION`
- Updated frontend acquisition controls:
  - `Mark Acquired` button is disabled unless acquisition is currently `approved`
  - button tooltip explains why disabled

### How to test
1. Create acquisition with status `considering`.
2. Try patching status directly to `acquired`:
   - expect `409 INVALID_STATUS_TRANSITION`
3. Patch to `approved`, then patch to `acquired`:
   - both should succeed
4. In UI, confirm `Mark Acquired` is disabled before approval.

### Success criteria
- Direct transition `considering -> acquired` is blocked by API.
- `approved -> acquired` works.
- UI behavior mirrors backend rule.

### Theory: why it works
- Transition guard checks current status before applying patch update.
- Backend enforces the business rule regardless of frontend behavior.
- Frontend disable state prevents invalid action attempts proactively.

## Step 7.4 - Apply `Moma.jpg` as Frontend Background

Date: 2026-04-23

### What was implemented
- Moved `Moma.jpg` to Next.js static assets folder:
  - `frontend/public/Moma.jpg`
- Updated global styles to use image as page background:
  - `body` now uses layered background (`image + light gradient overlay`)
- Preserved readability by keeping translucent/light overlay above the image.

### How to test
1. Run frontend:
   - `cd frontend`
   - `npm run dev`
2. Open `http://localhost:3000`
3. Confirm the background image is visible behind app panels.
4. Resize browser/mobile width to ensure layout remains readable.

### Success criteria
- Background image loads from `/Moma.jpg`.
- No broken asset paths or CSS errors.
- UI text and controls remain readable.

### Theory: why it works
- Files in `frontend/public` are served from root URL path by Next.js.
- `url("/Moma.jpg")` resolves to that static asset.
- Gradient overlay softens contrast so content remains legible.

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

## Step 7.4 - Frontend Background Image (Moma.jpg)

Date: 2026-04-23

### What was implemented
- Set the global frontend background to `Moma.jpg`.
- Ensured image is served from Next.js static public directory:
  - `frontend/public/Moma.jpg`
- Applied a soft gradient overlay in CSS to keep text readable.

### Why this matters
- Improves first visual impression in demo and presentation.
- Keeps UI readable and professional instead of sacrificing usability for style.

### Dumbified explanation
- We put your picture behind the whole app.
- We added a light layer on top so words are still easy to read.

### How to test
1. Run frontend:
   - `cd frontend`
   - `npm run dev`
2. Open:
   - `http://localhost:3000`
3. Confirm:
   - Background image is visible.
   - Text and buttons are still readable.

### Success criteria
- No broken image icon or blank background.
- No CSS errors.
- App remains readable on desktop and laptop screens.

### Theory: why it works when successful
- Next.js exposes anything in `public/` at the app root URL.
- CSS `url("/Moma.jpg")` loads that file directly from the running frontend server.

## Step 7.5 - UX Polish Pass (Navigation, Feedback, Readability)

Date: 2026-04-23

### What was implemented
- Added quick section navigation links (`Artworks`, `Buyers`, `Acquisitions`) in the hero.
- Added dashboard summary cards for:
  - total artworks
  - total buyers
  - acquired count
  - pending approval count
- Improved search UX:
  - added `Reset` button for query/filter reset.
- Improved form UX and safety:
  - `required` fields on key create inputs
  - acquisition create disabled when there are no buyers
  - helper hints for empty user/acquisition states
- Improved loading and scanning:
  - skeleton cards while initial artwork list loads
  - status badges/pills for acquisition status
- Improved accessibility and polish:
  - stronger keyboard focus outlines
  - card hover states and better visual hierarchy.

### Why this matters
- Makes demo flow faster and clearer for markers.
- Reduces user confusion and accidental invalid actions.
- Looks and feels closer to an enterprise dashboard (distinction-level UX direction).

### Dumbified explanation
- We made the app easier to understand at a glance.
- You can jump to sections faster, see useful totals, and get clearer visual feedback.

### How to test
1. Run frontend:
   - `cd frontend`
   - `npm run dev`
2. Open:
   - `http://localhost:3000`
3. Verify:
   - quick nav links jump to correct section
   - summary cards show live totals
   - `Reset` clears search and resets page
   - if no buyers exist, acquisition create is disabled with helpful hint
   - artwork grid shows skeleton placeholders during initial loading
   - acquisition statuses display color-coded pills
   - keyboard tabbing shows clear focus ring.

### Success criteria
- UI is more structured and easier to use on desktop and laptop.
- No runtime errors from new UX logic.
- Build still passes.

### Theory: why it works when successful
- React state already held all required counts/data, so summary cards are direct derived values.
- Required/disabled inputs prevent invalid requests before hitting backend.
- Skeletons and empty hints reduce uncertainty while waiting for API calls.

## Step 7.6 - Responsive Full-Image Backdrop + Floating Cards

Date: 2026-04-23

### What was implemented
- Reworked the page styling so `Moma.jpg` behaves like a full-screen responsive backdrop.
- Strengthened floating-layer effect for panels/cards:
  - translucent surfaces
  - blur/glass backdrop
  - stronger shadow depth
  - lift-on-hover transitions
- Improved visual contrast for readability while preserving image visibility.
- Added mobile behavior:
  - background switches to scroll attachment on small screens
  - background position adjusted for better crop on phones.

### Why this matters
- Directly improves perceived UI quality for grading.
- Makes the app look intentional and polished rather than default/plain.
- Supports your demo story: "enterprise dashboard layered over acquisition context image."

### Dumbified explanation
- The image is now the "wallpaper" of the whole app.
- Cards are like glass tiles sitting on top of that wallpaper and lifting when hovered.

### How to test
1. Run frontend:
   - `cd frontend`
   - `npm run dev`
2. Open:
   - `http://localhost:3000`
3. Verify on desktop:
   - image fills page behind all content
   - cards/panels visibly float above image
   - hovering cards lifts them with stronger shadow
4. Verify on mobile viewport (browser dev tools):
   - image remains properly framed (no weird repeat/stretch)
   - cards still readable and layered.

### Success criteria
- Background image remains visible across full page.
- Cards/panels are clearly foreground layers with depth.
- UX remains readable and responsive.
- Frontend build passes.

### Theory: why it works when successful
- `background-size: cover` keeps the image responsive while filling the viewport.
- Translucent backgrounds + blur + shadow create depth separation from backdrop.
- Mobile media query adjusts attachment/position to avoid common fixed-background issues on small devices.

## Step 7.7 - Promote Title to Real Header

Date: 2026-04-23

### What was implemented
- Changed page title structure so project name is the real `h1` header:
  - `MoMA Acquisition Intelligence Platform`
- Moved `Artwork Viewer` into a supporting subtitle line.
- Added subtitle styling for clear hierarchy.

### Why this matters
- Improves semantic HTML structure.
- Better accessibility and clearer page hierarchy for markers.

### Dumbified explanation
- The main project name is now the official big heading.
- The old title became a smaller subtitle under it.

### How to test
1. Run frontend: `cd frontend && npm run dev`
2. Open `http://localhost:3000`
3. Confirm top section shows:
   - big main heading = project name
   - smaller subtitle = `Artwork Viewer`

### Success criteria
- Header hierarchy is visually clear.
- Build succeeds with no errors.

### Theory: why it works when successful
- `h1` represents the page’s primary heading in semantic HTML.
- Subtitle text provides context without competing with the main title.

## Step 7.8 - Remove Perceived Background Blur

Date: 2026-04-23

### What was implemented
- Removed glass blur filters (`backdrop-filter`) from hero/cards/panels.
- Reduced dark overlay intensity so the background image is clearer.
- Kept floating card shadows and hover lift so depth effect remains.

### Why this matters
- Preserves the "cards above background" look without making the image look soft.
- Improves visual clarity for demo and grading screenshots.

### Dumbified explanation
- We removed the intentional blur layer from the boxes.
- So the image behind them now looks clearer.

### How to test
1. Run frontend: `cd frontend && npm run dev`
2. Open `http://localhost:3000`
3. Check:
   - background looks sharper than before
   - cards still hover/lift with shadow
   - text remains readable.

### Success criteria
- No blurry glass effect on content containers.
- Floating card style still works.
- Frontend build passes.

### Theory: why it works when successful
- `backdrop-filter: blur(...)` blurs whatever is behind each panel.
- Removing that blur keeps the background visually sharp.

### Important note
- The current image file itself is low resolution (`300x168`).
- For truly crisp full-screen background on large monitors, replace with a higher-res image (recommended 1920x1080 or higher).

## Step 7.9 - Stronger Card Hover Motion + Theme Palette

Date: 2026-04-23

### What was implemented
- Added a clear hover-float animation so cards visibly move over the background:
  - `summaryCard`
  - `createPanel`
  - `card`
  - `miniCard`
- Added a cohesive theme system using CSS variables:
  - refined card/background colors for contrast over the MoMA image
  - harmonized button/label/text colors
  - stronger readable surfaces and border tones
- Improved typography hierarchy:
  - body uses a clean sans stack
  - headings use a classic serif display stack
  - better visual separation between title and content text
- Added reduced-motion fallback for accessibility.

### Why this matters
- Makes interaction feel intentional and premium in demos.
- Improves readability and visual consistency against a photographic background.
- Helps push UI polish into distinction range.

### Dumbified explanation
- When you hover cards now, they actually float and drift a little.
- We also picked better text/card colors and fonts so everything is easier to read on the image.

### How to test
1. Run frontend:
   - `cd frontend`
   - `npm run dev`
2. Open:
   - `http://localhost:3000`
3. Verify:
   - hover any card: it lifts and gently moves
   - text stays readable on all card types
   - headings look more premium than default system text
   - colors look consistent across modules.

### Success criteria
- Hover movement is clearly visible.
- No readability issues on photo background.
- Frontend build succeeds.

### Theory: why it works when successful
- Keyframe animation on hover creates motion depth against a static background.
- Color variables keep contrast consistent and easier to tune globally.
- Separate body/display font stacks improve information hierarchy.

## Step 7.10 - Full-Width Sticky Acquisition Header

Date: 2026-04-23

### What was implemented
- Added a full-width sticky top header spanning the entire viewport.
- Header now includes `Acquisition Section` label and navigation links to:
  - `User Profiles`
  - `Acquisition Tracking`
  - backend-served `About This Page`
- Added anchor scroll offset (`scroll-margin-top`) for section targets so content is not hidden behind sticky header.
- Simplified hero area by removing duplicate nav buttons.

### Why this matters
- Improves information architecture and navigation clarity.
- Matches enterprise dashboard conventions (persistent top navigation).
- Better demo flow because key sections are always one click away.

### Dumbified explanation
- You now have a top bar that stays on screen while you scroll.
- It gives instant shortcuts to users, acquisitions, and the about page.

### How to test
1. Run frontend:
   - `cd frontend`
   - `npm run dev`
2. Open:
   - `http://localhost:3000`
3. Verify:
   - top header spans full width
   - header stays visible while scrolling
   - `User Profiles` jumps to users section
   - `Acquisition Tracking` jumps to acquisitions section
   - `About This Page` opens backend about page.

### Success criteria
- Header remains fixed at top during scroll.
- Navigation links jump/open the intended destinations.
- No overlap issues hiding section titles.

### Theory: why it works when successful
- `position: sticky; top: 0` keeps header pinned after scrolling begins.
- Section `scroll-margin-top` offsets anchor positions for sticky-header layouts.

## Step 7.11 - Fixed Background Scroll Effect

Date: 2026-04-23

### What was implemented
- Enabled fixed background behavior on desktop by setting:
  - `background-attachment: fixed` on `body`.
- Kept mobile fallback in media query (`scroll`) for better device compatibility.

### Why this matters
- Creates a parallax-like effect where content moves while background stays fixed.
- Improves visual polish and makes scrolling feel more dynamic in demo.

### Dumbified explanation
- The background image now stays in place.
- Cards and sections scroll over it, which gives that "cool" cinematic effect.

### How to test
1. Run frontend:
   - `cd frontend`
   - `npm run dev`
2. Open:
   - `http://localhost:3000`
3. Scroll down:
   - background should stay fixed on desktop
   - page content should move over it.

### Success criteria
- Desktop shows fixed background during scroll.
- No layout break with sticky header and sections.

### Theory: why it works when successful
- `background-attachment: fixed` pins the background to viewport coordinates instead of document flow.
