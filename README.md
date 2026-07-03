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
2. Copy env template: `cp .env.local.example .env.local` and fill in (see **Connecting Supabase** below for where to find these):
   - `DATABASE_URL` — Supabase transaction pooler URI (port 6543)
   - `DIRECT_URL` — Supabase session pooler URI (port 5432) — used only for schema pushes
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `http://localhost:3000` for local dev
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional (username/password works without them)
3. Prisma's CLI (used by `db push`) reads `.env`, not `.env.local` — copy the same
   `DATABASE_URL`/`DIRECT_URL` values into a local `.env` file too (gitignored) before
   running schema commands, or run them with `dotenv -e .env.local -- npx prisma db push`.
4. Push the schema to your database: `npx prisma db push`
5. Run: `npm run dev` and open http://localhost:3000
6. Sign up at `/signup` — **your first account becomes the owner**; everyone after joins as an employee

Default services (trash can cleaning, car wash, lawn mowing, etc.) and the settings
row are seeded automatically the first time the app reads them — no seed script needed.
All services are editable in Settings.

## Connecting Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. On the project dashboard, click the **Connect** button (top of the page) →
   choose **ORMs → Prisma** (or just look for the raw **URI** tab). This gives you
   both connection strings needed:
   - **Transaction pooler** (port `6543`, `?pgbouncer=true`) → `DATABASE_URL`. This is
     what the running app uses at request time — safe for serverless/many short connections.
   - **Session pooler** (port `5432`, no `pgbouncer` flag) → `DIRECT_URL`. Only used by
     `prisma db push` / migrations, which need a non-pooled connection.
3. Replace `[YOUR-PASSWORD]` in both strings with your actual database password
   (set when the project was created, or reset from **Project Settings → Database**).
   **URL-encode special characters** in the password (e.g. `!` → `%21`, `?` → `%3F`).
4. Put both URLs in your env file, then run `npx prisma db push` to create the tables.

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel (framework auto-detects as Next.js).
2. In **Project Settings → Environment Variables**, add for the **Production** environment:
   - `DATABASE_URL` (Supabase transaction pooler URI)
   - `DIRECT_URL` (Supabase session pooler URI)
   - `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
   - `NEXTAUTH_URL` (your production URL, e.g. `https://your-app.vercel.app`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional)

   Or via CLI: `vercel env add DATABASE_URL production` (reads the value from stdin/prompt).
3. **Check deployment protection**: by default a new Vercel project may have
   *Deployment Protection* (SSO) enabled, which blocks public visitors from
   reaching the site. Turn it off at **Project Settings → Deployment Protection**
   (or `vercel api /v9/projects/<name> -X PATCH --input <(echo '{"ssoProtection":null}')`)
   if you want the app publicly reachable.
4. Deploy — the build runs `prisma generate` automatically (`postinstall` + `build` scripts).
5. Run `npx prisma db push` once against the production `DATABASE_URL`/`DIRECT_URL` to
   create the tables (only needed once, or again after a schema change).
6. Open the deployed URL and sign up — the first account is the owner.

> If you add Google login, set the OAuth redirect URI to
> `https://your-app.vercel.app/api/auth/callback/google` in the Google Cloud console.
