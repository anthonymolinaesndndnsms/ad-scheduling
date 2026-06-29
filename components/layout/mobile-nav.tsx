'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  Users,
  BarChart3,
  Settings,
  MapPin,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: BarChart3 },
  { href: '/appointments', label: 'Jobs', icon: Calendar },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/leads', label: 'Leads', icon: MapPin },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function MobileNav({ user }: { user: any }) {
  const pathname = usePathname()

  return (
    <div className="flex items-center justify-around px-4 py-3">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              isActive ? 'text-blue-500' : 'text-zinc-400'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
