# Frontend (Next.js)

Simple viewer UI for testing backend REST services.

## Setup

```bash
cd frontend
npm install
```

Create `.env.local` from `.env.example`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## Run

```bash
npm run dev
```

Open:

- `http://localhost:3000`

## What this frontend currently supports

- View artworks list from backend
- Search (`q`)
- Sort and order controls
- Pagination
- Quick links to backend:
  - `/api/health`
  - `/about`
