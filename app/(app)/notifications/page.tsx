import Link from 'next/link'
import { Bell, BellOff } from 'lucide-react'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'
import type { NotificationDTO } from '@/lib/actions/notifications'
import {
  NotificationsList,
  MarkAllReadButton,
} from '@/components/notifications/notifications-list'

export const dynamic = 'force-dynamic'

type Filter = 'all' | 'unread'

function serialize(n: {
  id: string
  type: string
  title: string
  message: string
  href: string | null
  read: boolean
  createdAt: Date
}): NotificationDTO {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    href: n.href,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const user = await requireUser()
  const { filter: filterParam } = await searchParams
  const filter: Filter = filterParam === 'unread' ? 'unread' : 'all'

  let items: NotificationDTO[] = []
  let unreadCount = 0
  let failed = false

  try {
    const [rows, count] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: user.id,
          ...(filter === 'unread' ? { read: false } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.notification.count({ where: { userId: user.id, read: false } }),
    ])
    items = rows.map(serialize)
    unreadCount = count
  } catch (error) {
    console.error('notifications page load failed', error)
    failed = true
  }

  const tabs: { key: Filter; label: string; href: string }[] = [
    { key: 'all', label: 'All', href: '/notifications' },
    { key: 'unread', label: 'Unread', href: '/notifications?filter=unread' },
  ]

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `You have ${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}.`
              : 'You are all caught up.'}
          </p>
        </div>
        <MarkAllReadButton unreadCount={unreadCount} />
      </div>

      {/* Filter tabs */}
      <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => {
          const active = filter === tab.key
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {tab.key === 'unread' && unreadCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground tabular-nums">
                  {unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Content */}
      {failed ? (
        <EmptyState
          icon={BellOff}
          title="Couldn't load notifications"
          description="Something went wrong. Please try again in a moment."
        />
      ) : items.length === 0 ? (
        filter === 'unread' ? (
          <EmptyState
            icon={Bell}
            title="No unread notifications"
            description="You've read everything. Nice work."
            cta={{ href: '/notifications', label: 'View all notifications' }}
          />
        ) : (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="Updates about jobs, payouts and your account will show up here."
          />
        )
      ) : (
        <NotificationsList items={items} />
      )}
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
}: {
  icon: typeof Bell
  title: string
  description: string
  cta?: { href: string; label: string }
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {cta && (
        <Link
          href={cta.href}
          className="mt-1 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          {cta.label}
        </Link>
      )}
    </div>
  )
}
