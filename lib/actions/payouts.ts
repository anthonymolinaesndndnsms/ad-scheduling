'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { notify } from '@/lib/notify'
import { employeeShareCents } from '@/lib/money'

export type MarkJobsPaidResult = {
  ok: boolean
  payoutId?: string
  error?: string
}

const markJobsPaidSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  jobIds: z.array(z.string().min(1)).min(1, 'Select at least one job'),
  note: z.string().max(1000, 'Note must be under 1000 characters').optional(),
})

function revalidatePayoutPaths() {
  revalidatePath('/payouts')
  revalidatePath('/jobs')
  revalidatePath('/dashboard')
  revalidatePath('/employees')
}

/**
 * Create a single Payout batch for a set of an employee's completed, unpaid jobs.
 *
 * - amountCents = Σ employeeShareCents (split share only, tips excluded)
 * - tipCents    = Σ tips (100% employee's)
 * - each included job is flipped to payoutStatus PAID and linked via payoutId
 * - notifies the employee
 *
 * Admin-gated. Every job must belong to the employee, be COMPLETED and UNPAID.
 */
export async function markJobsPaid(input: {
  employeeId: string
  jobIds: string[]
  note?: string
}): Promise<MarkJobsPaidResult> {
  try {
    const actor = await getSessionUser()
    if (!actor || !actor.active || actor.role !== 'ADMIN') {
      return { ok: false, error: 'Not authorized' }
    }

    const parsed = markJobsPaidSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
    }
    const { employeeId, jobIds, note } = parsed.data

    // De-dupe job ids so a job can never be double-counted.
    const uniqueJobIds = Array.from(new Set(jobIds))

    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true },
    })
    if (!employee) return { ok: false, error: 'Employee not found' }

    // Only pull jobs that are eligible AND belong to this employee. This is the
    // authoritative filter — anything the client sent that does not match is
    // silently excluded and then validated against the requested count below.
    const jobs = await prisma.job.findMany({
      where: {
        id: { in: uniqueJobIds },
        employeeId,
        status: 'COMPLETED',
        payoutStatus: 'UNPAID',
      },
      select: {
        id: true,
        priceCents: true,
        tipCents: true,
        employeeSplitPercent: true,
      },
    })

    if (jobs.length !== uniqueJobIds.length) {
      return {
        ok: false,
        error:
          'Some selected jobs are no longer eligible (must be completed, unpaid, and assigned to this employee). Refresh and try again.',
      }
    }

    const amountCents = jobs.reduce(
      (sum, j) => sum + employeeShareCents(j.priceCents, j.employeeSplitPercent),
      0
    )
    const tipCents = jobs.reduce((sum, j) => sum + j.tipCents, 0)

    // Create the batch and flip the jobs atomically so a job can never end up
    // PAID without a payout, or double-linked.
    const payout = await prisma.$transaction(async (tx) => {
      const created = await tx.payout.create({
        data: {
          employeeId,
          amountCents,
          tipCents,
          note: note?.trim() || null,
        },
        select: { id: true },
      })

      const updated = await tx.job.updateMany({
        where: {
          id: { in: jobs.map((j) => j.id) },
          employeeId,
          status: 'COMPLETED',
          payoutStatus: 'UNPAID',
        },
        data: { payoutStatus: 'PAID', payoutId: created.id },
      })

      // Guard against a concurrent payout grabbing the same jobs between our
      // read and write — roll the whole thing back if the counts diverge.
      if (updated.count !== jobs.length) {
        throw new Error('CONCURRENT_MODIFICATION')
      }

      return created
    })

    await notify(employeeId, {
      type: 'payout',
      title: 'Payout marked as paid',
      message: `A payout of ${formatCents(amountCents + tipCents)} for ${jobs.length} ${
        jobs.length === 1 ? 'job' : 'jobs'
      } has been marked as paid.`,
      href: '/payouts',
    })

    revalidatePayoutPaths()
    return { ok: true, payoutId: payout.id }
  } catch (error) {
    if (error instanceof Error && error.message === 'CONCURRENT_MODIFICATION') {
      return {
        ok: false,
        error: 'Those jobs were just updated elsewhere. Refresh and try again.',
      }
    }
    console.error('markJobsPaid failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

/** Minimal money formatter for the notification message (avoids a client dep). */
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
