'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NotificationIcon } from '@/components/notifications/notification-icon'
import { markRead, markAllRead, type NotificationDTO } from '@/lib/actions/notifications'

/** "Mark all read" header button — optimistic + refreshes the page data. */
export function MarkAllReadButton({ unreadCount }: { unreadCount: number }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  if (unreadCount === 0) return null

  const onClick = async () => {
    setPending(true)
    try {
      await markAllRead()
    } catch {
      /* best-effort */
    } finally {
      setPending(false)
      router.refresh()
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={pending} className="gap-1.5">
      <CheckCheck className="h-4 w-4" />
      Mark all read
    </Button>
  )
}

/** Interactive list of notification rows. Marks read on click + navigates. */
export function NotificationsList({ items }: { items: NotificationDTO[] }) {
  const router = useRouter()
  const [rows, setRows] = React.useState(items)

  // Keep local state in sync when the server re-renders with fresh data.
  React.useEffect(() => {
    setRows(items)
  }, [items])

  const onOpen = async (n: NotificationDTO) => {
    if (!n.read) {
      setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, read: true } : r)))
      try {
        await markRead(n.id)
      } catch {
        /* best-effort */
      }
    }
    if (n.href) {
      router.push(n.href)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      {rows.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => onOpen(n)}
          className={cn(
            'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50',
            !n.read && 'bg-primary/5'
          )}
        >
          <NotificationIcon type={n.type} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <p className={cn('flex-1 text-sm', !n.read ? 'font-semibold' : 'font-medium')}>
                {n.title}
              </p>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
            <p className="mt-1 text-xs text-muted-foreground/80">
              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}
