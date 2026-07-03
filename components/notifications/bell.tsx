'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCheck } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { notificationVisual } from '@/components/notifications/notification-icon'
import {
  getUnreadCount,
  getMyNotifications,
  markRead,
  markAllRead,
  type NotificationDTO,
} from '@/lib/actions/notifications'

const DROPDOWN_LIMIT = 8

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [unread, setUnread] = React.useState(0)
  const [items, setItems] = React.useState<NotificationDTO[]>([])
  const [loading, setLoading] = React.useState(false)
  // If any server call fails (DB down / signed out), degrade to a plain link.
  const [degraded, setDegraded] = React.useState(false)

  const refreshCount = React.useCallback(async () => {
    try {
      const n = await getUnreadCount()
      setUnread(n)
      setDegraded(false)
    } catch {
      setDegraded(true)
    }
  }, [])

  // Poll on mount + whenever the window regains focus.
  React.useEffect(() => {
    refreshCount()
    const onFocus = () => refreshCount()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshCount])

  const loadItems = React.useCallback(async () => {
    setLoading(true)
    try {
      // Refresh the authoritative unread count alongside the list. We can't
      // derive it from the (limited) list, so fetch both.
      const [rows, count] = await Promise.all([
        getMyNotifications(DROPDOWN_LIMIT),
        getUnreadCount(),
      ])
      setItems(rows)
      setUnread(count)
      setDegraded(false)
    } catch {
      setDegraded(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) loadItems()
  }

  const handleItemClick = async (n: NotificationDTO) => {
    setOpen(false)
    if (!n.read) {
      setUnread((c) => Math.max(0, c - 1))
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)))
      try {
        await markRead(n.id)
      } catch {
        /* best-effort */
      }
    }
    router.push(n.href || '/notifications')
  }

  const handleMarkAll = async () => {
    setUnread(0)
    setItems((prev) => prev.map((i) => ({ ...i, read: true })))
    try {
      await markAllRead()
    } catch {
      /* best-effort */
    }
  }

  // Degraded mode: no working server actions — behave like the old placeholder.
  if (degraded) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        render={<Link href="/notifications" />}
      >
        <Bell className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            className="relative"
          />
        }
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 max-w-[calc(100vw-1rem)] p-0"
      >
        <div className="flex items-center justify-between px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{unread} unread</span>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />

        <div className="max-h-[22rem] overflow-y-auto py-1">
          {loading && items.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-3 py-8 text-center">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-medium">You&apos;re all caught up</p>
              <p className="text-xs text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            items.map((n) => {
              const { Icon, className: iconColor } = notificationVisual(n.type)
              return (
                <DropdownMenuItem
                  key={n.id}
                  closeOnClick={false}
                  onClick={() => handleItemClick(n)}
                  className={cn(
                    'items-start gap-2.5 px-3 py-2',
                    !n.read && 'bg-primary/5'
                  )}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className={cn('h-3.5 w-3.5', iconColor)} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      {!n.read && (
                        <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{n.message}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </DropdownMenuItem>
              )
            })
          )}
        </div>

        <DropdownMenuSeparator className="my-0" />
        <div className="flex items-center justify-between p-1">
          <DropdownMenuItem
            closeOnClick={false}
            onClick={handleMarkAll}
            disabled={unread === 0}
            className="flex-1 justify-center gap-1.5 text-xs text-muted-foreground"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setOpen(false)
              router.push('/notifications')
            }}
            className="flex-1 justify-center text-xs font-medium text-primary"
          >
            View all
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
