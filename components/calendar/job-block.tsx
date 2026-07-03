'use client'

import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PositionedJob } from './layout'

/**
 * A single absolutely-positioned job block on a day/week timeline.
 * Colored by serviceType.color (left border + tinted background).
 * Conflicting same-employee jobs get a red ring.
 */
export function JobBlock({
  positioned,
  compact = false,
}: {
  positioned: PositionedJob
  compact?: boolean
}) {
  const { job, top, height, conflict } = positioned
  const start = parseISO(job.startTime)

  return (
    <Link
      href={`/jobs/${job.id}`}
      title={`${format(start, 'p')} · ${job.title}${
        job.employeeName ? ` · ${job.employeeName}` : ''
      }`}
      style={{
        top,
        height,
        borderLeftColor: job.serviceColor,
        backgroundColor: `color-mix(in oklch, ${job.serviceColor} 14%, var(--card))`,
      }}
      className={cn(
        'group absolute inset-x-1 z-10 flex flex-col overflow-hidden rounded-md border border-border border-l-4 px-2 py-1 text-left shadow-sm ring-1 ring-foreground/5 transition-colors hover:z-20 hover:ring-foreground/20',
        conflict && 'ring-2 ring-red-500/70 hover:ring-red-500'
      )}
    >
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-semibold tabular-nums leading-tight">
          {format(start, 'h:mm a')}
        </span>
        {conflict && (
          <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
        )}
      </div>
      <span className="truncate text-xs font-medium leading-tight">
        {job.title}
      </span>
      {!compact && job.employeeName && height > 44 && (
        <span className="truncate text-[11px] text-muted-foreground leading-tight">
          {job.employeeName}
        </span>
      )}
    </Link>
  )
}
