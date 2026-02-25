# NOTESLITE (Next.js + Prisma + PostgreSQL)

This project has been migrated from a split `Vite + Express` setup to a single:

- Next.js (App Router)
- React + TypeScript
- Prisma ORM
- PostgreSQL

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Update `.env` with your PostgreSQL connection and JWT secret.

4. Run Prisma migration:

```bash
npm run prisma:migrate -- --name init
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Key Paths

- `app/` - Next.js pages and API routes
- `components/` - client UI components
- `lib/` - shared server utilities (auth/session/prisma)
- `prisma/schema.prisma` - database schema

## Notes

- Legacy `frontend/` and `backend/` folders are still present for reference but are no longer used by the app runtime.
