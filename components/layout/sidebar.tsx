'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Calendar,
  Users,
  BarChart3,
  Settings,
  LogOut,
  MapPin,
  Zap,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/appointments', label: 'Appointments', icon: Calendar },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/leads', label: 'Leads', icon: MapPin },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ user }: { user: any }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full p-6 bg-black border-r border-zinc-800">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">AD</h1>
        <p className="text-xs text-zinc-400 mt-1">Scheduling</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-zinc-800 pt-4">
        <div className="mb-4">
          <p className="text-xs text-zinc-400 mb-1">Logged in as</p>
          <p className="text-sm text-white truncate">{user?.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}
