import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns'

/** Two-letter initials from a display name (falls back to "?"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Week window (Sunday–Saturday) to match the schema's dayOfWeek convention
 * (0 = Sunday). Returns inclusive [start, end] Date bounds.
 */
export function weekRange(now = new Date()) {
  return {
    start: startOfWeek(now, { weekStartsOn: 0 }),
    end: endOfWeek(now, { weekStartsOn: 0 }),
  }
}

/** Today window [start, end]. */
export function dayRange(now = new Date()) {
  return { start: startOfDay(now), end: endOfDay(now) }
}
