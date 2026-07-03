import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { getSessionUser } from '@/lib/session'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Topbar } from '@/components/layout/topbar'
import { DisabledAccount } from '@/components/layout/disabled-account'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  if (!user.active) {
    return <DisabledAccount />
  }

  return (
    <div className="flex h-dvh bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 shrink-0 border-r border-border flex-col">
        <Sidebar user={user} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} />

        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">{children}</main>

        {/* Sticky new-job button (admin, mobile) */}
        {user.role === 'ADMIN' && (
          <Link
            href="/jobs/new"
            aria-label="New job"
            className="lg:hidden fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" />
          </Link>
        )}

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
          <MobileNav role={user.role} />
        </nav>
      </div>
    </div>
  )
}
