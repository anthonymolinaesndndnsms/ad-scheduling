'use client'

import { format, isSameDay, isToday } from 'date-fns'
import { Card } from '@/components/ui/card'
import { JobBlock } from './job-block'
import { CalendarEmptyState } from './empty-state'
import { hourLabels, positionJobsForDay, TIMELINE_HEIGHT } from './layout'
import { HOUR_ROW_PX } from './types'
import type { CalendarJob } from './types'
import { parseISO } from 'date-fns'

export function DayView({
  jobs,
  anchor,
}: {
  jobs: CalendarJob[]
  anchor: Date
}) {
  const positioned = positionJobsForDay(jobs, anchor)
  const hours = hourLabels()
  const dayJobCount = jobs.filter((j) => isSameDay(parseISO(j.startTime), anchor))
    .length

  if (dayJobCount === 0) {
    return (
      <CalendarEmptyState
        message={`No jobs scheduled for ${format(anchor, 'EEEE, MMM d')}.`}
        newJobHref={`/jobs/new?date=${format(anchor, 'yyyy-MM-dd')}`}
      />
    )
  }

  return (
    <Card className="p-0">
      <div className="flex">
        {/* Hour gutter */}
        <div
          className="relative w-14 shrink-0 border-r border-border"
          style={{ height: TIMELINE_HEIGHT }}
        >
          {hours.map((h, i) => (
            <div
              key={h.hour}
              className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
              style={{ top: i * HOUR_ROW_PX }}
            >
              {i === 0 ? '' : h.label}
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div
          className="relative flex-1"
          style={{ height: TIMELINE_HEIGHT }}
        >
          {/* Hour gridlines */}
          {hours.map((h, i) => (
            <div
              key={h.hour}
              className="absolute inset-x-0 border-t border-border/60"
              style={{ top: i * HOUR_ROW_PX }}
            >
              {isToday(anchor) && (
                <span className="sr-only">{h.label}</span>
              )}
            </div>
          ))}

          {/* Job blocks */}
          {positioned.map((p) => (
            <JobBlock key={p.job.id} positioned={p} />
          ))}
        </div>
      </div>
    </Card>
  )
}
