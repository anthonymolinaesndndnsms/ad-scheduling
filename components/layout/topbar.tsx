import { GlobalSearch } from '@/components/search/global-search'
import { NotificationBell } from '@/components/notifications/bell'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { UserMenu } from '@/components/layout/user-menu'
import type { SessionUser } from '@/lib/session'

export function Topbar({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4">
      {/* Mobile brand */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-[10px] font-bold">
          KND
        </div>
        <span className="text-sm font-semibold">Kids Next Door</span>
      </div>

      <div className="flex-1" />

      {user.role === 'ADMIN' && <GlobalSearch />}
      <NotificationBell />
      <ThemeToggle />
      <UserMenu user={user} />
    </header>
  )
}
