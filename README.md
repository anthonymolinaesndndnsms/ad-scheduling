# Kids Next Door

Team job management for neighborhood services — trash can cleaning, car washes, lawn mowing, pressure washing, and more. Manage employees, assign jobs, track cash collection, calculate 80/20 payouts, and see revenue analytics.

## Roles

- **Owner (admin)** — sees everything: all jobs, employees, payouts, customers, leads, analytics, settings. The **first account created becomes the owner**.
- **Employee** — sees only their own assigned jobs, schedule, and earnings. Employees sign up at `/signup`.

## How money works

- Employee split: **80%** of the job price (configurable in Settings)
- Owner split: **20%**
- **Tips go 100% to the employee** and never reduce the owner's cut
- Cash collection (from the customer) and payouts (to the employee) are tracked separately

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Prisma · PostgreSQL (Supabase) · NextAuth · Recharts · Vercel

## Setup

1. Install dependencies: `npm install`
2. Copy env template: `cp .env.local.example .env.local` and fill in:
   - `DATABASE_URL` — Supabase → Project Settings → Database → connection string
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `http://localhost:3000` for local dev
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional
3. Push the schema to your database: `npx prisma db push`
4. Run: `npm run dev` and open http://localhost:3000
5. Sign up at `/signup` — your first account becomes the owner

Default services (trash can cleaning, car wash, lawn mowing, etc.) are seeded automatically on first use and are fully editable in Settings.

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel
2. Add the same environment variables in Project Settings (set `NEXTAUTH_URL` to your production URL)
3. Deploy — the build runs `prisma generate` automatically
4. Run `npx prisma db push` once against the production `DATABASE_URL`
