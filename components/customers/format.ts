import { format, isValid, parseISO } from 'date-fns'

/** "Jun 28, 2026" from an ISO string. Returns "—" for invalid input. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = parseISO(iso)
  return isValid(d) ? format(d, 'MMM d, yyyy') : '—'
}

/** Short "Jun 28" from an ISO string. Returns "—" for invalid input. */
export function formatDayMonth(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = parseISO(iso)
  return isValid(d) ? format(d, 'MMM d') : '—'
}
