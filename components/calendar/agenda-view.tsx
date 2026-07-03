'use client'

import Link from 'next/link'
import {
  addDays,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  parseISO,
} from 'date-fns'
import { ChevronRight, MapPin, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { JOB_STATUS_CLASSES, JOB_STATUS_LABELS } from '@/lib/labels'
import { CalendarEmptyState } from './empty-state'
import type { CalendarJob } from './types'

const AGENDA_DAYS = 14

export function AgendaView({
  jobs,
  anchor,
}: {
  jobs: CalendarJob[]
  anchor: Date
}) {
  if (jobs.length === 0) {
    return (
      <CalendarEmptyState
        message={`No jobs scheduled between ${format(anchor, 'MMM d')} and ${format(
          addDays(anchor, AGENDA_DAYS - 1),
          'MMM d'
        )}.`}
        newJobHref={`/jobs/new?date=${format(anchor, 'yyyy-MM-dd')}`}
      />
    )
  }

  // Group by day, keeping only days that have jobs, in chronological order.
  const days: { day: Date; jobs: CalendarJob[] }[] = []
  for (let i = 0; i < AGENDA_DAYS; i++) {
    const day = addDays(anchor, i)
    const dayJobs = jobs
      .filter((j) => isSameDay(parseISO(j.startTime), day))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
    if (dayJobs.length > 0) days.push({ day, jobs: dayJobs })
  }

  return (
    <div className="space-y-6">
      {days.map(({ day, jobs: dayJobs }) => (
        <section key={day.toISOString()} className="space-y-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold">
              {isToday(day)
                ? 'Today'
                : isTomorrow(day)
                  ? 'Tomorrow'
                  : format(day, 'EEEE')}
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {format(day, 'MMM d')}
            </span>
            <span className="text-xs text-muted-foreground">
              · {dayJobs.length} {dayJobs.length === 1 ? 'job' : 'jobs'}
            </span>
          </div>

          <div className="space-y-2">
            {dayJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-stretch gap-3 rounded-xl border border-border bg-card p-3 ring-1 ring-foreground/5 transition-colors hover:bg-muted/40 active:scale-[0.99]"
              >
                {/* Color rail */}
                <span
                  className="w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: job.serviceColor }}
                />

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {format(parseISO(job.startTime), 'h:mm a')}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn('shrink-0', JOB_STATUS_CLASSES[job.status])}
                    >
                      {JOB_STATUS_LABELS[job.status]}
                    </Badge>
                  </div>

                  <p className="truncate text-sm font-medium">{job.title}</p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: job.serviceColor }}
                      />
                      {job.serviceTypeName}
                    </span>
                    {job.employeeName && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {job.employeeName}
                      </span>
                    )}
                    {job.neighborhood && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.neighborhood}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
