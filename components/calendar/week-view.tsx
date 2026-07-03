'use client'

import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfWeek,
} from 'date-fns'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { JobBlock } from './job-block'
import { CalendarEmptyState } from './empty-state'
import { hourLabels, positionJobsForDay, TIMELINE_HEIGHT } from './layout'
import { HOUR_ROW_PX } from './types'
import type { CalendarJob } from './types'

export function WeekView({
  jobs,
  anchor,
  onSelectDay,
}: {
  jobs: CalendarJob[]
  anchor: Date
  onSelectDay: (day: Date) => void
}) {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const hours = hourLabels()

  const weekJobCount = jobs.filter((j) => {
    const d = parseISO(j.startTime)
    return d >= weekStart && d <= weekEnd
  }).length

  if (weekJobCount === 0) {
    return (
      <CalendarEmptyState
        message={`No jobs scheduled for the week of ${format(weekStart, 'MMM d')}.`}
        newJobHref={`/jobs/new?date=${format(anchor, 'yyyy-MM-dd')}`}
      />
    )
  }

  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Day headers */}
          <div className="flex border-b border-border">
            <div className="w-14 shrink-0 border-r border-border" />
            {days.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => onSelectDay(day)}
                className="flex-1 border-r border-border px-1 py-2 text-center transition-colors last:border-r-0 hover:bg-muted/50"
              >
                <div className="text-[11px] font-medium uppercase text-muted-foreground">
                  {format(day, 'EEE')}
                </div>
                <div
                  className={cn(
                    'mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                    isToday(day)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </button>
            ))}
          </div>

          {/* Timeline grid */}
          <div className="flex" style={{ height: TIMELINE_HEIGHT }}>
            {/* Hour gutter */}
            <div className="relative w-14 shrink-0 border-r border-border">
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

            {/* Day columns */}
            {days.map((day) => {
              const positioned = positionJobsForDay(jobs, day)
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'relative flex-1 border-r border-border last:border-r-0',
                    isToday(day) && 'bg-primary/[0.03]'
                  )}
                >
                  {/* Gridlines */}
                  {hours.map((h, i) => (
                    <div
                      key={h.hour}
                      className="absolute inset-x-0 border-t border-border/50"
                      style={{ top: i * HOUR_ROW_PX }}
                    />
                  ))}
                  {positioned.map((p) => (
                    <JobBlock key={p.job.id} positioned={p} compact />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}
