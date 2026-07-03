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
   - `DATABASE_URL` — your Supabase Postgres connection string (see below)
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `http://localhost:3000` for local dev
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional (email/password works without them)
3. Push the schema to your database: `npx prisma db push`
4. Run: `npm run dev` and open http://localhost:3000
5. Sign up at `/signup` — **your first account becomes the owner**; everyone after joins as an employee

Default services (trash can cleaning, car wash, lawn mowing, etc.) and the settings
row are seeded automatically the first time the app reads them — no seed script needed.
All services are editable in Settings.

## Connecting Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Project Settings → Database → Connection string** and copy the **URI**.
3. Two connection styles work — either is fine for a solo app:
   - **Direct** (`...supabase.co:5432/postgres`) — simplest; use this for both
     `prisma db push` and the app.
   - **Connection pooler** (`...pooler.supabase.com:6543/...?pgbouncer=true`) —
     recommended for serverless/Vercel runtime. If you use the pooler for the app,
     still run `prisma db push` against the **direct** URL.
4. Put the chosen URL in `DATABASE_URL`, then run `npx prisma db push` to create the tables.

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel (framework auto-detects as Next.js).
2. In **Project Settings → Environment Variables**, add:
   - `DATABASE_URL` (Supabase — pooler URL recommended for production runtime)
   - `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
   - `NEXTAUTH_URL` (your production URL, e.g. `https://your-app.vercel.app`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional)
3. Deploy — the build runs `prisma generate` automatically (`postinstall` + `build` scripts).
4. Run `npx prisma db push` once against the production `DATABASE_URL` to create the tables.
5. Open the deployed URL and sign up — the first account is the owner.

> If you add Google login, set the OAuth redirect URI to
> `https://your-app.vercel.app/api/auth/callback/google` in the Google Cloud console.
