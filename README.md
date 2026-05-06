# DD Qualify

A Next.js prototype hosted on Vercel with Neon Postgres.

## Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** HeroUI + Tailwind CSS v4
- **Database:** Neon Postgres (via Vercel Marketplace)
- **ORM:** Prisma 7 (multi-file schema)
- **Auth:** Auth.js v5 (email/password, extensible to OAuth)
- **Hosting:** Vercel

## Getting Started

```bash
yarn install
yarn prisma generate
yarn dev
```

## Environment Variables

Copy `.env.example` or set these in your Vercel project:

- `DATABASE_URL` — Pooled Neon Postgres connection string
- `DIRECT_URL` — Direct Neon connection (for migrations)
- `AUTH_SECRET` — Random secret for Auth.js sessions
- `AUTH_URL` — App URL (e.g. `http://localhost:3000`)

## Database

```bash
# Run migrations
yarn prisma migrate dev

# Generate client after schema changes
yarn prisma generate
```

Schema files are split by domain in `prisma/models/`.
