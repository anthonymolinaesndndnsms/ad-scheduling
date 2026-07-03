import {
  Bell,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  MapPin,
  ShieldCheck,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Maps a notification `type` string to an icon + accent color.
 * Types are free-form strings created by other features via lib/notify.ts,
 * so we match on sensible prefixes/keywords and fall back to a bell.
 */
const TYPE_ICONS: { test: (t: string) => boolean; icon: LucideIcon; className: string }[] = [
  { test: (t) => t.includes('payout') || t.includes('paid'), icon: DollarSign, className: 'text-emerald-600 dark:text-emerald-400' },
  { test: (t) => t.includes('cash'), icon: DollarSign, className: 'text-emerald-600 dark:text-emerald-400' },
  { test: (t) => t.includes('complete') || t.includes('done'), icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
  { test: (t) => t.includes('job') || t.includes('assign'), icon: Briefcase, className: 'text-blue-600 dark:text-blue-400' },
  { test: (t) => t.includes('schedule') || t.includes('reminder') || t.includes('upcoming'), icon: CalendarClock, className: 'text-amber-600 dark:text-amber-400' },
  { test: (t) => t.includes('lead'), icon: MapPin, className: 'text-blue-600 dark:text-blue-400' },
  { test: (t) => t.includes('role'), icon: UserCog, className: 'text-violet-600 dark:text-violet-400' },
  { test: (t) => t.includes('account') || t.includes('status'), icon: ShieldCheck, className: 'text-violet-600 dark:text-violet-400' },
]

export function notificationVisual(type: string): { Icon: LucideIcon; className: string } {
  const t = (type || '').toLowerCase()
  const match = TYPE_ICONS.find((m) => m.test(t))
  return { Icon: match?.icon ?? Bell, className: match?.className ?? 'text-muted-foreground' }
}

/** Rounded icon chip used in the bell dropdown and the notifications page. */
export function NotificationIcon({
  type,
  className,
}: {
  type: string
  className?: string
}) {
  const { Icon, className: color } = notificationVisual(type)
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted',
        className
      )}
    >
      <Icon className={cn('h-4 w-4', color)} />
    </span>
  )
}
