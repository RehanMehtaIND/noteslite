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

3. Update `.env` with your PostgreSQL and Clerk values:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (use `/auth/sign-in`)
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` (use `/auth/sign-up`)
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` (use `/dashboard`)
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` (use `/dashboard`)

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
- `lib/` - shared server utilities (Clerk auth/prisma)
- `prisma/schema.prisma` - database schema

## Authentication

- Clerk is configured in `app/layout.tsx` with `ClerkProvider`.
- Protected routes are enforced in `middleware.ts`.
- Sign in: `/auth/sign-in`
- Sign up: `/auth/sign-up`
- `/auth` redirects to `/auth/sign-in`.

## Notes

- Legacy `frontend/` and `backend/` folders are still present for reference but are no longer used by the app runtime.
