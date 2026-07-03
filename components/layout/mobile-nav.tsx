'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  DollarSign,
  Home,
  MapPin,
  Menu,
  Settings,
  Users,
  UsersRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const ADMIN_TABS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/payouts', label: 'Payouts', icon: DollarSign },
]

const ADMIN_MORE = [
  { href: '/employees', label: 'Employees', icon: UsersRound },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/leads', label: 'Leads', icon: MapPin },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const EMPLOYEE_TABS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/calendar', label: 'Schedule', icon: CalendarDays },
  { href: '/payouts', label: 'Earnings', icon: DollarSign },
  { href: '/notifications', label: 'Alerts', icon: Bell },
]

function Tab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: typeof Home
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  )
}

export function MobileNav({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  if (role === 'EMPLOYEE') {
    return (
      <div className="flex items-stretch px-2">
        {EMPLOYEE_TABS.map((t) => (
          <Tab key={t.href} {...t} active={isActive(t.href)} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-stretch px-2">
      {ADMIN_TABS.map((t) => (
        <Tab key={t.href} {...t} active={isActive(t.href)} />
      ))}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetTrigger
          render={
            <button
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors',
                ADMIN_MORE.some((m) => isActive(m.href))
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            />
          }
        >
          <Menu className="h-5 w-5" />
          More
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 p-4">
            {ADMIN_MORE.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-xs font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
