# NOTESLITE (Next.js + Prisma + PostgreSQL)

NOTESLITE runs as a single Next.js app with:

- Next.js (App Router)
- React + TypeScript
- Prisma ORM
- PostgreSQL
- Clerk authentication

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL running locally or remotely
- Clerk project keys

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create your local environment file:

```bash
cp .env.example .env
```

3. Fill `.env` with valid values:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard`

## Database Setup

Apply existing migrations:

```bash
npm run prisma:migrate
```

Generate Prisma Client (optional, usually auto-generated during migrate):

```bash
npm run prisma:generate
```

Open Prisma Studio (optional):

```bash
npm run prisma:studio
```

## Run the App

Start development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Available Scripts

- `npm run dev` - start Next.js in development mode
- `npm run build` - create production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm run prisma:migrate` - apply dev migrations with Prisma
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:studio` - open Prisma Studio

## Project Structure

- `app/` - Next.js routes, pages, and API handlers
- `components/` - UI and page shell components
- `lib/` - shared server utilities (auth, Prisma helpers)
- `prisma/schema.prisma` - database models
- `middleware.ts` - auth route protection

## Authentication Routes

- Sign in: `/auth/sign-in`
- Sign up: `/auth/sign-up`
- `/auth` redirects to `/auth/sign-in`

## Important Note About Migrations

Do not run `npm run prisma:migrate -- --name init` on an existing project setup unless you are intentionally creating a brand-new migration. For normal setup, use:

```bash
npm run prisma:migrate
```

## Legacy Folders

`frontend/` and `backend/` are legacy reference folders from the older split architecture and are not used by the current runtime.
