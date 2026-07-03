import { differenceInMinutes, isSameDay, parseISO } from 'date-fns'
import type { CalendarJob } from './types'
import { DAY_END_HOUR, DAY_START_HOUR, HOUR_ROW_PX } from './types'

const TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60

/** Pixel height of the full timeline. */
export const TIMELINE_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_ROW_PX

export type PositionedJob = {
  job: CalendarJob
  top: number // px offset from timeline top
  height: number // px
  conflict: boolean // overlaps another job for the SAME employee
}

/** Minutes from the visible-window start (clamped to the window). */
function offsetMinutes(date: Date): number {
  const mins = (date.getHours() - DAY_START_HOUR) * 60 + date.getMinutes()
  return Math.max(0, Math.min(TOTAL_MINUTES, mins))
}

/**
 * Position every job that occurs on `day` inside the 6:00–21:00 timeline.
 * Jobs are clamped to the window and get a minimum tappable height.
 * Two jobs assigned to the same employee whose times overlap are flagged
 * as conflicts (red ring).
 */
export function positionJobsForDay(jobs: CalendarJob[], day: Date): PositionedJob[] {
  const dayJobs = jobs
    .filter((j) => isSameDay(parseISO(j.startTime), day))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  // Detect same-employee time overlaps.
  const conflictIds = new Set<string>()
  for (let i = 0; i < dayJobs.length; i++) {
    const a = dayJobs[i]
    if (!a.employeeId) continue
    const aStart = parseISO(a.startTime).getTime()
    const aEnd = aStart + a.durationMins * 60_000
    for (let k = i + 1; k < dayJobs.length; k++) {
      const b = dayJobs[k]
      if (b.employeeId !== a.employeeId) continue
      const bStart = parseISO(b.startTime).getTime()
      const bEnd = bStart + b.durationMins * 60_000
      if (aStart < bEnd && bStart < aEnd) {
        conflictIds.add(a.id)
        conflictIds.add(b.id)
      }
    }
  }

  return dayJobs.map((job) => {
    const start = parseISO(job.startTime)
    const end = new Date(start.getTime() + job.durationMins * 60_000)
    const topMin = offsetMinutes(start)
    const endMin = offsetMinutes(end)
    const top = (topMin / 60) * HOUR_ROW_PX
    const rawHeight = ((Math.max(0, endMin - topMin)) / 60) * HOUR_ROW_PX
    return {
      job,
      top,
      height: Math.max(rawHeight, 28), // min tap target
      conflict: conflictIds.has(job.id),
    }
  })
}

/** Hour labels for gridlines, e.g. ["6 AM", "7 AM", ...]. */
export function hourLabels(): { hour: number; label: string }[] {
  const out: { hour: number; label: string }[] = []
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
    const period = h < 12 ? 'AM' : 'PM'
    const display = h % 12 === 0 ? 12 : h % 12
    out.push({ hour: h, label: `${display} ${period}` })
  }
  return out
}

/** Convenience: total minutes a job represents (unused clamp), for tests/consumers. */
export function jobDurationMinutes(job: CalendarJob): number {
  const start = parseISO(job.startTime)
  const end = new Date(start.getTime() + job.durationMins * 60_000)
  return differenceInMinutes(end, start)
}
