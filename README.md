## Ready-to-Run Setup

This repository already includes default environment files:

- `backend/.env`
- `frontend/.env.local`

So a new user only needs to install dependencies and run both apps.

## 1) Prerequisites

- Node.js `>= 18.17.0`
- npm

MongoDB is optional for first run because backend is configured with:

- `USE_IN_MEMORY_DB=true` (in-memory MongoDB via `mongodb-memory-server`)

## 2) Installation

From project root:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## 3) Useful Backend Scripts

From `backend/`:

```bash
# Build dataset subset from MoMA source
npm run build:subset -- --limit=10000

# Seed subset file
npm run seed:subset -- --file=moma_subset_10000.json --if-data=replace
```

## 4) Execute the Application

Open two terminals.

### Terminal A (Backend)

```bash
cd backend
npm run dev
```

Backend runs on:

- `http://localhost:3001`

### Terminal B (Frontend)

```bash
cd frontend
npm run dev
```

Frontend runs on:

- `http://localhost:3000`


## 5) Environment Files (Included Defaults)

### `backend/.env` (included)

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=moma_acquisition_platform
USE_IN_MEMORY_DB=true
AUTO_SEED_ON_START=true
AUTH_JWT_SECRET=dev-super-secret-change-this
AUTH_TOKEN_TTL=7d
```

### `frontend/.env.local` (included)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

For production or shared environments, change JWT secret and database settings.



