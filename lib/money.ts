/**
 * All money in this app is stored as integer cents.
 *
 * Canonical split math (job.employeeSplitPercent is snapshotted at creation):
 * - employee share = round(price * split / 100)
 * - admin share    = price - employee share
 * - tips belong 100% to the employee and never reduce the admin share
 */

export function formatMoney(cents: number, currency = 'USD'): string {
  const hasSubunits = Math.abs(cents) % 100 !== 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: hasSubunits ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function dollarsToCents(value: string | number): number {
  const n = typeof value === 'string' ? parseFloat(value.replace(/[$,\s]/g, '')) : value
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

export function centsToDollars(cents: number): number {
  return cents / 100
}

export function employeeShareCents(priceCents: number, splitPercent: number): number {
  return Math.round((priceCents * splitPercent) / 100)
}

export function adminShareCents(priceCents: number, splitPercent: number): number {
  return priceCents - employeeShareCents(priceCents, splitPercent)
}

/** Employee's total take for a job: their split share plus the full tip. */
export function employeeTotalCents(job: {
  priceCents: number
  tipCents: number
  employeeSplitPercent: number
}): number {
  return employeeShareCents(job.priceCents, job.employeeSplitPercent) + job.tipCents
}
