import type { JobStatus, CashStatus, PayoutStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_CLASSES,
  CASH_STATUS_LABELS,
  CASH_STATUS_CLASSES,
  PAYOUT_STATUS_LABELS,
  PAYOUT_STATUS_CLASSES,
} from '@/lib/labels'
import { cn } from '@/lib/utils'

/** A small colored dot for a service type. Falls back to muted when no color. */
export function ServiceDot({ color, className }: { color?: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', className)}
      style={{ backgroundColor: color || 'var(--muted-foreground)' }}
    />
  )
}

/** Service badge: outline pill with a colored dot + service name. */
export function ServiceBadge({
  name,
  color,
  className,
}: {
  name: string
  color?: string | null
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn('gap-1.5', className)}>
      <ServiceDot color={color} />
      {name}
    </Badge>
  )
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant="outline" className={JOB_STATUS_CLASSES[status]}>
      {JOB_STATUS_LABELS[status]}
    </Badge>
  )
}

export function CashStatusBadge({ status }: { status: CashStatus }) {
  return (
    <Badge variant="outline" className={CASH_STATUS_CLASSES[status]}>
      {CASH_STATUS_LABELS[status]}
    </Badge>
  )
}

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  return (
    <Badge variant="outline" className={PAYOUT_STATUS_CLASSES[status]}>
      {PAYOUT_STATUS_LABELS[status]}
    </Badge>
  )
}
