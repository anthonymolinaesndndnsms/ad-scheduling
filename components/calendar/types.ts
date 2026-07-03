import type { JobStatus, CashStatus, PayoutStatus } from '@prisma/client'

/** A calendar-friendly, fully-serialized job (dates as ISO strings for client props). */
export type CalendarJob = {
  id: string
  title: string
  startTime: string // ISO string
  durationMins: number
  neighborhood: string
  address: string
  status: JobStatus
  cashStatus: CashStatus
  payoutStatus: PayoutStatus
  priceCents: number
  employeeId: string | null
  employeeName: string | null
  serviceTypeId: string
  serviceTypeName: string
  serviceColor: string
}

export type CalendarEmployee = {
  id: string
  name: string
}

export type CalendarServiceType = {
  id: string
  name: string
  color: string
}

export type CalendarView = 'day' | 'week' | 'month' | 'agenda'

export const CALENDAR_VIEWS: CalendarView[] = ['day', 'week', 'month', 'agenda']

export const VIEW_LABELS: Record<CalendarView, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  agenda: 'Agenda',
}

/** Visible timeline window for day/week views. */
export const DAY_START_HOUR = 6
export const DAY_END_HOUR = 21
export const HOUR_ROW_PX = 56 // pixel height of a single hour row
