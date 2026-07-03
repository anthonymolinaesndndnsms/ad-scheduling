import type { JobStatus, CashStatus, PayoutStatus, LeadStatus, Role } from '@prisma/client'

/**
 * Shared labels and badge classes so every page renders statuses the same way.
 * Badge classes are designed for <Badge variant="outline" className={...}>.
 */

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
}

export const JOB_STATUS_CLASSES: Record<JobStatus, string> = {
  PENDING: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  COMPLETED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

export const CASH_STATUS_LABELS: Record<CashStatus, string> = {
  OUTSTANDING: 'Cash outstanding',
  COLLECTED: 'Cash collected',
}

export const CASH_STATUS_CLASSES: Record<CashStatus, string> = {
  OUTSTANDING: 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400',
  COLLECTED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  UNPAID: 'Unpaid',
  PAID: 'Paid',
}

export const PAYOUT_STATUS_CLASSES: Record<PayoutStatus, string> = {
  UNPAID: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  PAID: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NOT_HOME: 'Not home',
  INTERESTED: 'Interested',
  FOLLOW_UP: 'Follow up',
  BOOKED: 'Booked',
  NOT_INTERESTED: 'Not interested',
}

export const LEAD_STATUS_CLASSES: Record<LeadStatus, string> = {
  NOT_HOME: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  INTERESTED: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  FOLLOW_UP: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  BOOKED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  NOT_INTERESTED: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Owner',
  EMPLOYEE: 'Employee',
}
