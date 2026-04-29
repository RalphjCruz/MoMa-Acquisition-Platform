# Final QA Checklist (Pre-Submission)

Use this checklist before recording the 2-5 minute demo and final submission.

Date tested: `______________`
Tester: `______________`

## 1) Environment and Startup

- [ ] Node.js version is `>=18.17.0`
- [ ] MongoDB service is running
- [ ] `backend/.env` exists and values are correct
- [ ] `frontend/.env.local` exists and `NEXT_PUBLIC_API_BASE_URL` points to backend
- [ ] Backend starts without crash (`npm run dev` in `backend`)
- [ ] Frontend starts without crash (`npm run dev` in `frontend`)

## 2) Backend Health and About Page

- [ ] `GET /api/health` returns `200`
- [ ] `GET /about` returns backend-served HTML page
- [ ] About page includes:
- [ ] App explanation
- [ ] Technologies used
- [ ] Limitations/weaknesses
- [ ] Alternative approaches

## 3) Artwork Catalogue (Core CRUD)

- [ ] Create artwork works (`POST /api/artworks`)
- [ ] Read artwork list works (`GET /api/artworks`)
- [ ] Read single artwork works (`GET /api/artworks/:id`)
- [ ] Update artwork works (`PATCH /api/artworks/:id`)
- [ ] Delete artwork works (`DELETE /api/artworks/:id`)
- [ ] Search query `q` works
- [ ] Sorting works (`sortBy`, `order`)
- [ ] Pagination works (`page`, `limit`)

## 4) User Profiles

- [ ] Create user works (`POST /api/users`)
- [ ] List users works (`GET /api/users`)
- [ ] Update user works (`PATCH /api/users/:id`)
- [ ] Delete user works (`DELETE /api/users/:id`)
- [ ] Duplicate email is rejected with clear error

## 5) Acquisition Tracking

- [ ] Create acquisition works (`POST /api/acquisitions`)
- [ ] List acquisitions works (`GET /api/acquisitions`)
- [ ] Update acquisition status works (`PATCH /api/acquisitions/:id`)
- [ ] Delete acquisition works (`DELETE /api/acquisitions/:id`)
- [ ] Business rule enforced:
- [ ] cannot move directly to `acquired` unless current status is `approved`
- [ ] user acquisition lookup works (`GET /api/users/:id/acquisitions`)

## 6) Frontend Pages and Navigation

- [ ] `/` (Artwork Catalogue) renders correctly
- [ ] `/users` renders correctly
- [ ] `/acquisitions` renders correctly
- [ ] Sticky header nav links route to correct pages
- [ ] "About This Page" link opens backend `/about`

## 7) Responsive and UX

- [ ] Mobile view: artwork controls do not overlap
- [ ] Mobile view: KPI cards layout is clean
- [ ] Buttons/inputs remain readable and clickable on small screens
- [ ] Background and header readability are acceptable

## 8) Database Verification (MongoDB Compass)

- [ ] Connected to `mongodb://127.0.0.1:27017`
- [ ] Database `moma_acquisition_platform` exists
- [ ] `artworks` collection contains records
- [ ] `users` collection contains records
- [ ] `acquisitions` collection contains records

## 8.1) 10k Scale Verification

- [ ] Built `moma_subset_10000.json`
- [ ] Imported with seed script successfully
- [ ] `GET /api/artworks` reports `totalItems` around 10k (or exactly 10k in replace mode)
- [ ] Pagination still works at high item count

## 9) Demo Readiness (2-5 minutes)

- [ ] Can explain architecture (frontend -> REST API -> MongoDB)
- [ ] Can demonstrate all core CRUD quickly
- [ ] Can show at least one distinction feature from each module
- [ ] Can show About page requirements quickly
- [ ] Can explain one limitation and one alternative approach

## 10) Final Deliverable Check

- [ ] Full project code included
- [ ] README is up to date
- [ ] About page is backend-served
- [ ] Demo video recorded
- [ ] No broken startup steps on clean machine

## Notes / Issues Found

- `____________________________________________________________`
- `____________________________________________________________`
- `____________________________________________________________`
