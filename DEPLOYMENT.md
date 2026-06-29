# AD Scheduling - Deployment & Setup Guide

## Project Status

✅ **Application Built**: Complete full-stack Next.js application
✅ **GitHub Repository**: https://github.com/anthonymolinaesndndnsms/ad-scheduling
✅ **Vercel Linked**: Project linked to Vercel
🔄 **Deployment**: Building on Vercel (latest deployment)

## Next Steps to Go Live

### 1. Set Up Database

Choose one:

**Option A: Neon (Recommended)**
- Go to https://neon.tech
- Create a free account
- Create a new project
- Copy the connection string

**Option B: Vercel Postgres**
- In Vercel Dashboard → Project Settings
- Go to Storage
- Create a Postgres database
- Connection string will be auto-added

### 2. Add Environment Variables to Vercel

1. Go to: https://vercel.com/anthony-molinas-projects/ad-scheduling/settings/environment-variables
2. Add these variables:

```
DATABASE_URL=<your-postgres-connection-string>
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=https://ad-scheduling-<your-domain>.vercel.app
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

### 3. Set Up Google OAuth

1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI:
   ```
   https://ad-scheduling-<your-domain>.vercel.app/api/auth/callback/google
   ```
6. Copy Client ID and Secret to Vercel env vars

### 4. Trigger Redeployment

Once env vars are set:
1. Go to Vercel Dashboard → ad-scheduling → Deployments
2. Click the three dots on latest deployment
3. Select "Redeploy"
4. Or push a new commit to auto-trigger

### 5. Run Migrations

After first successful deployment:
```bash
# Use Vercel CLI to run migrations in production
vercel env pull .env.local --environment=production
npx prisma migrate deploy
```

Or set up via Node.js at startup (see `lib/prisma.ts`).

## Project Structure

```
ad-scheduling/
├── app/
│   ├── (auth)/login          # Login page
│   ├── (app)/
│   │   ├── dashboard         # Main dashboard
│   │   ├── appointments      # Appointments management
│   │   ├── customers         # Customer profiles
│   │   ├── leads            # Lead tracker
│   │   └── settings         # Settings page
│   └── auth/route.ts        # NextAuth configuration
├── components/
│   ├── layout/              # Sidebar and mobile nav
│   ├── dashboard/           # Dashboard components
│   ├── providers/           # Theme and session providers
│   └── ui/                  # shadcn/ui components
├── prisma/
│   └── schema.prisma        # Database schema
├── lib/
│   ├── prisma.ts           # Prisma client
│   └── utils.ts            # Utility functions
└── README.md               # Full documentation
```

## Tech Stack Deployed

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: API routes, Server Actions, NextAuth v5
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: Google OAuth
- **Hosting**: Vercel

## Features Included

### ✅ Implemented
- Mobile-first responsive dashboard
- Dark/light mode
- Authentication with Google login
- Customer profiles with vehicles
- Appointment scheduling
- Lead tracker
- Revenue analytics
- Quick action buttons
- Navigation (desktop sidebar + mobile bottom nav)

### 🔄 Ready to Expand
- Appointment calendar views
- Customer history & notes
- Payment tracking
- Automated notifications
- Team management
- Custom reports

## Verification Checklist

- [ ] Database created and connection string added
- [ ] Google OAuth credentials configured
- [ ] All env vars set in Vercel
- [ ] Deployment shows "Ready" status
- [ ] Can access https://ad-scheduling-*.vercel.app
- [ ] Login page loads
- [ ] Google login redirects properly

## Troubleshooting

**Build Error: DATABASE_URL not set**
→ Expected during build. Set env vars and redeploy.

**Login redirect loop**
→ Verify NEXTAUTH_URL matches your deployment URL

**Google login not working**
→ Check redirect URI in Google Console matches Vercel domain

**Database migrations failed**
→ Ensure DATABASE_URL is correct and database is accessible

## Support Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth Docs](https://next-auth.js.org)
- [Vercel Docs](https://vercel.com/docs)

## Production Deployment URL

After setup, your live app will be at:
```
https://ad-scheduling-*.vercel.app
```

(Exact URL shown in Vercel Dashboard)

Good luck! 🚀
