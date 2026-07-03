'use client'

import { useCallback, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { JOB_STATUS_LABELS } from '@/lib/labels'
import type { JobStatus } from '@prisma/client'
import { DayView } from './day-view'
import { WeekView } from './week-view'
import { MonthView } from './month-view'
import { AgendaView } from './agenda-view'
import { CALENDAR_VIEWS, VIEW_LABELS } from './types'
import type {
  CalendarEmployee,
  CalendarJob,
  CalendarServiceType,
  CalendarView,
} from './types'

const ALL = '__all__'

type Filters = {
  employee?: string
  service?: string
  status?: JobStatus
}

export function CalendarShell({
  view,
  anchorISO,
  isAdmin,
  jobs,
  employees,
  serviceTypes,
  filters,
}: {
  view: CalendarView
  anchorISO: string
  isAdmin: boolean
  jobs: CalendarJob[]
  employees: CalendarEmployee[]
  serviceTypes: CalendarServiceType[]
  filters: Filters
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const anchor = useMemo(() => parseISO(anchorISO), [anchorISO])

  /** Push a new URL preserving current state, overriding the given keys. */
  const pushState = useCallback(
    (next: Partial<{ view: CalendarView; date: string } & Filters>) => {
      const params = new URLSearchParams()
      const merged = {
        view,
        date: format(anchor, 'yyyy-MM-dd'),
        employee: filters.employee,
        service: filters.service,
        status: filters.status as string | undefined,
        ...next,
      }
      params.set('view', merged.view)
      params.set('date', merged.date)
      if (merged.employee) params.set('employee', merged.employee)
      if (merged.service) params.set('service', merged.service)
      if (merged.status) params.set('status', merged.status)
      startTransition(() => {
        router.push(`/calendar?${params.toString()}`)
      })
    },
    [router, view, anchor, filters]
  )

  const step = useCallback(
    (dir: -1 | 1) => {
      let nextDate: Date
      if (view === 'month') nextDate = addMonths(anchor, dir)
      else if (view === 'week') nextDate = addWeeks(anchor, dir)
      else if (view === 'agenda') nextDate = addDays(anchor, dir * 14)
      else nextDate = addDays(anchor, dir)
      pushState({ date: format(nextDate, 'yyyy-MM-dd') })
    },
    [view, anchor, pushState]
  )

  const goToday = useCallback(() => {
    pushState({ date: format(new Date(), 'yyyy-MM-dd') })
  }, [pushState])

  const goToDay = useCallback(
    (day: Date) => {
      pushState({ view: 'day', date: format(day, 'yyyy-MM-dd') })
    },
    [pushState]
  )

  const rangeLabel = useMemo(() => {
    switch (view) {
      case 'day':
        return format(anchor, 'EEEE, MMMM d, yyyy')
      case 'week': {
        const s = startOfWeek(anchor, { weekStartsOn: 1 })
        const e = endOfWeek(anchor, { weekStartsOn: 1 })
        const sameMonth = format(s, 'MMM') === format(e, 'MMM')
        return sameMonth
          ? `${format(s, 'MMM d')} – ${format(e, 'd, yyyy')}`
          : `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`
      }
      case 'month':
        return format(anchor, 'MMMM yyyy')
      case 'agenda':
        return `${format(anchor, 'MMM d')} – ${format(addDays(anchor, 13), 'MMM d, yyyy')}`
    }
  }, [view, anchor])

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header row */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Calendar
          </h1>

          {/* View switcher: Tabs on desktop, Select on mobile */}
          <div className="flex items-center gap-2">
            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <div className="hidden sm:block">
              <Tabs
                value={view}
                onValueChange={(v) => pushState({ view: v as CalendarView })}
              >
                <TabsList>
                  {CALENDAR_VIEWS.map((v) => (
                    <TabsTrigger key={v} value={v}>
                      {VIEW_LABELS[v]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div className="sm:hidden">
              <Select
                value={view}
                onValueChange={(v) => pushState({ view: v as CalendarView })}
              >
                <SelectTrigger className="h-10 w-32" aria-label="Calendar view">
                  <SelectValue>{VIEW_LABELS[view]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CALENDAR_VIEWS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {VIEW_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Navigation + range label */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 sm:h-8 sm:w-8"
              aria-label="Previous"
              onClick={() => step(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-10 sm:h-8"
              onClick={goToday}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 sm:h-8 sm:w-8"
              aria-label="Next"
              onClick={() => step(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm font-medium text-muted-foreground tabular-nums">
            {rangeLabel}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2">
          {isAdmin && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Employee</Label>
              <Select
                value={filters.employee ?? ALL}
                onValueChange={(v) =>
                  pushState({ employee: !v || v === ALL ? undefined : v })
                }
              >
                <SelectTrigger className="h-10 sm:h-8 min-w-40">
                  <SelectValue placeholder="All employees">
                    {employees.find((e) => e.id === filters.employee)?.name ?? 'All employees'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All employees</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Service</Label>
            <Select
              value={filters.service ?? ALL}
              onValueChange={(v) =>
                pushState({ service: !v || v === ALL ? undefined : v })
              }
            >
              <SelectTrigger className="h-10 sm:h-8 min-w-40">
                <SelectValue placeholder="All services">
                  {(() => {
                    const svc = serviceTypes.find((s) => s.id === filters.service)
                    return svc ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: svc.color }}
                        />
                        {svc.name}
                      </span>
                    ) : (
                      'All services'
                    )
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All services</SelectItem>
                {serviceTypes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={(filters.status as string | undefined) ?? ALL}
              onValueChange={(v) =>
                pushState({ status: v === ALL ? undefined : (v as JobStatus) })
              }
            >
              <SelectTrigger className="h-10 sm:h-8 min-w-36">
                <SelectValue placeholder="All statuses">
                  {filters.status ? JOB_STATUS_LABELS[filters.status] : 'All statuses'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {(Object.keys(JOB_STATUS_LABELS) as JobStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {JOB_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Service color legend */}
        {serviceTypes.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {serviceTypes.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active view */}
      {view === 'day' && <DayView jobs={jobs} anchor={anchor} />}
      {view === 'week' && (
        <WeekView jobs={jobs} anchor={anchor} onSelectDay={goToDay} />
      )}
      {view === 'month' && (
        <MonthView jobs={jobs} anchor={anchor} onSelectDay={goToDay} />
      )}
      {view === 'agenda' && <AgendaView jobs={jobs} anchor={anchor} />}
    </div>
  )
}
