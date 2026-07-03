'use client'

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import type { CalendarJob } from './types'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_CHIPS = 3

export function MonthView({
  jobs,
  anchor,
  onSelectDay,
}: {
  jobs: CalendarJob[]
  anchor: Date
  onSelectDay: (day: Date) => void
}) {
  const monthStart = startOfMonth(anchor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const jobsByDay = new Map<string, CalendarJob[]>()
  for (const job of jobs) {
    const key = format(parseISO(job.startTime), 'yyyy-MM-dd')
    const arr = jobsByDay.get(key)
    if (arr) arr.push(job)
    else jobsByDay.set(key, [job])
  }

  return (
    <Card className="p-0">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAY_LABELS.map((w) => (
          <div
            key={w}
            className="px-2 py-2 text-center text-[11px] font-medium uppercase text-muted-foreground"
          >
            <span className="hidden sm:inline">{w}</span>
            <span className="sm:hidden">{w[0]}</span>
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayJobs = (jobsByDay.get(key) ?? []).sort((a, b) =>
            a.startTime.localeCompare(b.startTime)
          )
          const inMonth = isSameMonth(day, anchor)
          const visible = dayJobs.slice(0, MAX_CHIPS)
          const overflow = dayJobs.length - visible.length

          return (
            <button
              key={key}
              onClick={() => onSelectDay(day)}
              className={cn(
                'group flex min-h-24 flex-col gap-1 border-b border-r border-border p-1.5 text-left transition-colors last:border-r-0 hover:bg-muted/40 sm:min-h-28',
                !inMonth && 'bg-muted/20',
                '[&:nth-child(7n)]:border-r-0'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                    isToday(day)
                      ? 'bg-primary text-primary-foreground'
                      : inMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                {visible.map((job) => (
                  <div
                    key={job.id}
                    style={{
                      borderLeftColor: job.serviceColor,
                      backgroundColor: `color-mix(in oklch, ${job.serviceColor} 16%, var(--card))`,
                    }}
                    className="flex items-center gap-1 overflow-hidden rounded border-l-2 px-1 py-0.5"
                  >
                    <span className="hidden text-[10px] font-medium tabular-nums text-muted-foreground sm:inline">
                      {format(parseISO(job.startTime), 'h:mm a')}
                    </span>
                    <span className="truncate text-[10px] font-medium leading-tight">
                      {job.title}
                    </span>
                  </div>
                ))}
                {overflow > 0 && (
                  <span className="px-1 text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
                    +{overflow} more
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
