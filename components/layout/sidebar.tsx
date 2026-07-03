'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  DollarSign,
  Home,
  LogOut,
  MapPin,
  Settings,
  Users,
  UsersRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/logo'
import type { SessionUser } from '@/lib/session'

const ADMIN_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/employees', label: 'Employees', icon: UsersRound },
  { href: '/payouts', label: 'Payouts', icon: DollarSign },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/leads', label: 'Leads', icon: MapPin },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const EMPLOYEE_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/jobs', label: 'My Jobs', icon: Briefcase },
  { href: '/calendar', label: 'Schedule', icon: CalendarDays },
  { href: '/payouts', label: 'Earnings', icon: DollarSign },
  { href: '/notifications', label: 'Notifications', icon: Bell },
]

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const nav = user.role === 'ADMIN' ? ADMIN_NAV : EMPLOYEE_NAV

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-5">
        <Logo size={36} />
        <div className="leading-tight">
          <p className="font-semibold">Kids Next Door</p>
          <p className="text-xs text-muted-foreground">
            {user.role === 'ADMIN' ? 'Owner' : 'Team member'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-4">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}
