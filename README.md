# AD Scheduling

Professional scheduling and business management for Anthony Detailing.

## Features

- 📅 Appointment scheduling with multiple status tracking
- 👥 Customer profiles with vehicle information
- 💰 Revenue dashboard with weekly/monthly analytics  
- 📍 Lead tracker for door-knock outreach
- 🔔 In-app notifications and reminders
- 🌙 Dark mode & light mode
- 📱 Mobile-first responsive design
- 🔐 Google OAuth authentication

## Tech Stack

- **Framework**: Next.js 15 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth v5
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon or Vercel Postgres)
- Google OAuth credentials

### Setup

1. **Clone the repository**
\`\`\`bash
git clone https://github.com/yourusername/ad-scheduling.git
cd ad-scheduling
\`\`\`

2. **Install dependencies**
\`\`\`bash
npm install
\`\`\`

3. **Set up environment variables**
\`\`\`bash
cp .env.local.example .env.local
\`\`\`

Then edit `.env.local` and add:
- \`DATABASE_URL\` - Your PostgreSQL connection string
- \`GOOGLE_CLIENT_ID\` - From Google Cloud Console
- \`GOOGLE_CLIENT_SECRET\` - From Google Cloud Console
- \`NEXTAUTH_SECRET\` - Generate with: \`openssl rand -base64 32\`
- \`NEXTAUTH_URL\` - http://localhost:3000 for development

4. **Set up database**
\`\`\`bash
npx prisma migrate dev --name init
\`\`\`

5. **Run development server**
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Database Setup

### Using Neon (Recommended)

1. Create a free Neon account at https://neon.tech
2. Create a new project
3. Copy the connection string to \`DATABASE_URL\` in \`.env.local\`
4. Run migrations

### Using Vercel Postgres

1. Link your project to Vercel
2. Add Postgres from the Vercel dashboard
3. Copy connection string to \`.env.local\`
4. Run migrations

## Deployment

### Deploy to Vercel

1. **Push to GitHub**
\`\`\`bash
git add .
git commit -m "Initial commit"
git push origin main
\`\`\`

2. **Connect to Vercel**
- Go to [https://vercel.com](https://vercel.com)
- Import your GitHub repository
- Add environment variables in Project Settings
- Deploy!

3. **Set up production database**
- Create a Neon or Vercel Postgres database
- Add \`DATABASE_URL\` to production environment variables
- Run migrations: \`npx prisma migrate deploy\`

## License

MIT
