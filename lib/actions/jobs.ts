'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionUser, type SessionUser } from '@/lib/session'
import { notify, notifyAdmins } from '@/lib/notify'
import { getSettings } from '@/lib/settings'
import { employeeTotalCents } from '@/lib/money'
import { markJobsPaid } from '@/lib/actions/payouts'

export type JobActionResult = {
  ok: boolean
  jobId?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getActor(): Promise<SessionUser | null> {
  const actor = await getSessionUser()
  if (!actor || !actor.active) return null
  return actor
}

function invalid(error: z.ZodError): JobActionResult {
  return { ok: false, error: error.issues[0]?.message ?? 'Invalid input' }
}

function refreshJobs(jobId?: string) {
  revalidatePath('/jobs')
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
  if (jobId) revalidatePath(`/jobs/${jobId}`)
}

/** "HH:mm" minutes-from-midnight for a Date, respecting the server local zone. */
function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

// ---------------------------------------------------------------------------
// Conflict / availability check (any signed-in user may call — read only)
// ---------------------------------------------------------------------------

export type EmployeeConflicts = {
  conflicts: { jobId: string; title: string; time: string }[]
  availability: 'available' | 'outside_hours' | 'unknown'
  bufferMins: number
}

const conflictSchema = z.object({
  employeeId: z.string().min(1),
  startISO: z.string().min(1),
  durationMins: z.number().int().positive().max(24 * 60),
  ignoreJobId: z.string().optional(),
})

/**
 * Reports scheduling conflicts and availability for an employee/slot.
 * - conflicts: existing jobs whose [start, end)+buffer overlaps the proposed slot.
 * - availability: whether the slot falls inside the employee's declared hours
 *   for that weekday ('unknown' when the employee has no availability rows).
 */
export async function checkEmployeeConflicts(
  employeeId: string,
  startISO: string,
  durationMins: number,
  ignoreJobId?: string
): Promise<EmployeeConflicts> {
  const settings = await getSettings()
  const bufferMins = settings.defaultBufferMins

  const empty: EmployeeConflicts = {
    conflicts: [],
    availability: 'unknown',
    bufferMins,
  }

  try {
    const actor = await getActor()
    if (!actor) return empty

    const parsed = conflictSchema.safeParse({
      employeeId,
      startISO,
      durationMins,
      ignoreJobId,
    })
    if (!parsed.success) return empty

    const start = new Date(parsed.data.startISO)
    if (Number.isNaN(start.getTime())) return empty
    const end = new Date(start.getTime() + parsed.data.durationMins * 60_000)

    // Overlap window widened by the buffer on both sides.
    const windowStart = new Date(start.getTime() - bufferMins * 60_000)
    const windowEnd = new Date(end.getTime() + bufferMins * 60_000)

    // Candidate jobs for this employee that could plausibly overlap. We fetch a
    // generous window around the day and filter precisely in memory (durations
    // vary so we cannot express the exact end-time overlap in a single query).
    const dayStart = new Date(start)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(start)
    dayEnd.setHours(23, 59, 59, 999)
    // Pull a slightly wider net so long earlier jobs are considered.
    const fetchFrom = new Date(dayStart.getTime() - 24 * 60 * 60_000)

    const candidates = await prisma.job.findMany({
      where: {
        employeeId: parsed.data.employeeId,
        startTime: { gte: fetchFrom, lte: dayEnd },
        ...(parsed.data.ignoreJobId ? { id: { not: parsed.data.ignoreJobId } } : {}),
      },
      select: { id: true, title: true, startTime: true, durationMins: true },
      orderBy: { startTime: 'asc' },
    })

    const conflicts = candidates
      .filter((job) => {
        const jobStart = job.startTime
        const jobEnd = new Date(jobStart.getTime() + job.durationMins * 60_000)
        // Overlap if the proposed buffered window intersects this job.
        return jobStart < windowEnd && jobEnd > windowStart
      })
      .map((job) => ({
        jobId: job.id,
        title: job.title,
        time: job.startTime.toISOString(),
      }))

    // Availability check against declared hours for the weekday.
    let availability: EmployeeConflicts['availability'] = 'unknown'
    const rows = await prisma.availability.findMany({
      where: { userId: parsed.data.employeeId },
      select: { dayOfWeek: true, startTime: true, endTime: true },
    })
    if (rows.length > 0) {
      const dow = start.getDay()
      const slotStartMin = minutesOfDay(start)
      const slotEndMin = minutesOfDay(start) + parsed.data.durationMins
      const inHours = rows.some((r) => {
        if (r.dayOfWeek !== dow) return false
        const [sh, sm] = r.startTime.split(':').map(Number)
        const [eh, em] = r.endTime.split(':').map(Number)
        const winStart = sh * 60 + sm
        const winEnd = eh * 60 + em
        return slotStartMin >= winStart && slotEndMin <= winEnd
      })
      availability = inHours ? 'available' : 'outside_hours'
    }

    return { conflicts, availability, bufferMins }
  } catch (error) {
    console.error('checkEmployeeConflicts failed', error)
    return empty
  }
}

// ---------------------------------------------------------------------------
// Shared job input schema (create / update)
// ---------------------------------------------------------------------------

const jobInputSchema = z
  .object({
    title: z.string().trim().max(200).optional().default(''),
    serviceTypeId: z.string().min(1, 'Choose a service'),
    employeeId: z.string().optional(),
    // Existing customer OR new-customer fields.
    customerId: z.string().optional(),
    newCustomerName: z.string().trim().max(200).optional(),
    newCustomerPhone: z.string().trim().max(40).optional(),
    address: z.string().trim().min(1, 'Address is required').max(300),
    neighborhood: z.string().trim().min(1, 'Neighborhood is required').max(120),
    startISO: z.string().min(1, 'Pick a date and time'),
    durationMins: z.coerce.number().int().min(5, 'Duration too short').max(24 * 60),
    priceCents: z.coerce.number().int().min(0, 'Price cannot be negative').max(100_000_00),
    tipCents: z.coerce.number().int().min(0).max(100_000_00).default(0),
    customerComments: z.string().trim().max(4000).optional(),
    specifications: z.string().trim().max(4000).optional(),
    adminNotes: z.string().trim().max(4000).optional(),
    leadId: z.string().optional(),
  })
  .refine((d) => Boolean(d.customerId) || Boolean(d.newCustomerName?.trim()), {
    message: 'Select a customer or enter a new customer name',
    path: ['customerId'],
  })

export type JobFormInput = z.input<typeof jobInputSchema>

/** Build the auto title "<Service> — <Customer>" when the given title is blank. */
async function resolveTitle(
  rawTitle: string,
  serviceTypeId: string,
  customerName: string | null
): Promise<string> {
  const title = rawTitle.trim()
  if (title) return title
  const service = await prisma.serviceType.findUnique({
    where: { id: serviceTypeId },
    select: { name: true },
  })
  const serviceName = service?.name ?? 'Job'
  return customerName ? `${serviceName} — ${customerName}` : serviceName
}

// ---------------------------------------------------------------------------
// Create job (admin only)
// ---------------------------------------------------------------------------

export async function createJob(input: JobFormInput): Promise<JobActionResult> {
  try {
    const actor = await getActor()
    if (!actor || actor.role !== 'ADMIN') return { ok: false, error: 'Not authorized' }

    const parsed = jobInputSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)
    const data = parsed.data

    const start = new Date(data.startISO)
    if (Number.isNaN(start.getTime())) {
      return { ok: false, error: 'Invalid date/time' }
    }

    // Validate service exists.
    const service = await prisma.serviceType.findUnique({
      where: { id: data.serviceTypeId },
      select: { id: true, name: true },
    })
    if (!service) return { ok: false, error: 'Service not found' }

    // Validate employee (if provided) is a real active user.
    if (data.employeeId) {
      const emp = await prisma.user.findUnique({
        where: { id: data.employeeId },
        select: { id: true },
      })
      if (!emp) return { ok: false, error: 'Assigned employee not found' }
    }

    // Resolve customer: existing, or create from the new-customer fields.
    let customerId: string | null = null
    let customerName: string | null = null
    if (data.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
        select: { id: true, name: true },
      })
      if (!customer) return { ok: false, error: 'Customer not found' }
      customerId = customer.id
      customerName = customer.name
    } else if (data.newCustomerName?.trim()) {
      const created = await prisma.customer.create({
        data: {
          name: data.newCustomerName.trim(),
          phone: data.newCustomerPhone?.trim() || null,
          address: data.address,
          neighborhood: data.neighborhood,
        },
        select: { id: true, name: true },
      })
      customerId = created.id
      customerName = created.name
    }

    // Snapshot the split from settings at creation time.
    const settings = await getSettings()

    const title = await resolveTitle(data.title, data.serviceTypeId, customerName)

    const job = await prisma.job.create({
      data: {
        title,
        serviceTypeId: data.serviceTypeId,
        employeeId: data.employeeId || null,
        customerId,
        address: data.address,
        neighborhood: data.neighborhood,
        startTime: start,
        durationMins: data.durationMins,
        priceCents: data.priceCents,
        tipCents: data.tipCents ?? 0,
        employeeSplitPercent: settings.employeeSplitPercent,
        customerComments: data.customerComments?.trim() || null,
        specifications: data.specifications?.trim() || null,
        adminNotes: data.adminNotes?.trim() || null,
      },
      select: { id: true, title: true, employeeId: true },
    })

    // Convert the lead if this job originated from one.
    if (data.leadId) {
      try {
        await prisma.lead.update({
          where: { id: data.leadId },
          data: { status: 'BOOKED', convertedCustomerId: customerId },
        })
        revalidatePath('/leads')
        revalidatePath(`/leads/${data.leadId}`)
      } catch (leadErr) {
        // A missing/invalid lead should not fail job creation.
        console.error('lead conversion failed', leadErr)
      }
    }

    if (job.employeeId) {
      await notify(job.employeeId, {
        type: 'job_assigned',
        title: 'New job assigned',
        message: `You've been assigned "${job.title}".`,
        href: `/jobs/${job.id}`,
      })
    }

    refreshJobs(job.id)
    return { ok: true, jobId: job.id }
  } catch (error) {
    console.error('createJob failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Update job (admin only)
// ---------------------------------------------------------------------------

const updateSchema = z.object({ id: z.string().min(1) })

export async function updateJob(
  input: JobFormInput & { id: string }
): Promise<JobActionResult> {
  try {
    const actor = await getActor()
    if (!actor || actor.role !== 'ADMIN') return { ok: false, error: 'Not authorized' }

    const idParsed = updateSchema.safeParse({ id: input.id })
    if (!idParsed.success) return invalid(idParsed.error)

    const parsed = jobInputSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)
    const data = parsed.data

    const existing = await prisma.job.findUnique({
      where: { id: input.id },
      select: { id: true, employeeId: true },
    })
    if (!existing) return { ok: false, error: 'Job not found' }

    const start = new Date(data.startISO)
    if (Number.isNaN(start.getTime())) {
      return { ok: false, error: 'Invalid date/time' }
    }

    const service = await prisma.serviceType.findUnique({
      where: { id: data.serviceTypeId },
      select: { id: true },
    })
    if (!service) return { ok: false, error: 'Service not found' }

    if (data.employeeId) {
      const emp = await prisma.user.findUnique({
        where: { id: data.employeeId },
        select: { id: true },
      })
      if (!emp) return { ok: false, error: 'Assigned employee not found' }
    }

    // Resolve customer (existing / new) same as create.
    let customerId: string | null = null
    let customerName: string | null = null
    if (data.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
        select: { id: true, name: true },
      })
      if (!customer) return { ok: false, error: 'Customer not found' }
      customerId = customer.id
      customerName = customer.name
    } else if (data.newCustomerName?.trim()) {
      const created = await prisma.customer.create({
        data: {
          name: data.newCustomerName.trim(),
          phone: data.newCustomerPhone?.trim() || null,
          address: data.address,
          neighborhood: data.neighborhood,
        },
        select: { id: true, name: true },
      })
      customerId = created.id
      customerName = created.name
    }

    const title = await resolveTitle(data.title, data.serviceTypeId, customerName)

    const job = await prisma.job.update({
      where: { id: input.id },
      data: {
        title,
        serviceTypeId: data.serviceTypeId,
        employeeId: data.employeeId || null,
        customerId,
        address: data.address,
        neighborhood: data.neighborhood,
        startTime: start,
        durationMins: data.durationMins,
        priceCents: data.priceCents,
        tipCents: data.tipCents ?? 0,
        customerComments: data.customerComments?.trim() || null,
        specifications: data.specifications?.trim() || null,
        adminNotes: data.adminNotes?.trim() || null,
      },
      select: { id: true, title: true, employeeId: true },
    })

    // Notify the (new) assigned employee about the change.
    if (job.employeeId) {
      await notify(job.employeeId, {
        type: 'job_updated',
        title: 'Job updated',
        message: `"${job.title}" was updated by the owner.`,
        href: `/jobs/${job.id}`,
      })
    }
    // If the assignment moved away from someone, let them know too.
    if (existing.employeeId && existing.employeeId !== job.employeeId) {
      await notify(existing.employeeId, {
        type: 'job_unassigned',
        title: 'Job reassigned',
        message: `"${job.title}" is no longer assigned to you.`,
        href: '/jobs',
      })
    }

    refreshJobs(job.id)
    return { ok: true, jobId: job.id }
  } catch (error) {
    console.error('updateJob failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Delete job (admin only)
// ---------------------------------------------------------------------------

export async function deleteJob(input: { id: string }): Promise<JobActionResult> {
  try {
    const actor = await getActor()
    if (!actor || actor.role !== 'ADMIN') return { ok: false, error: 'Not authorized' }

    const parsed = z.string().min(1).safeParse(input.id)
    if (!parsed.success) return { ok: false, error: 'Invalid job id' }

    const existing = await prisma.job.findUnique({
      where: { id: parsed.data },
      select: { id: true },
    })
    if (!existing) return { ok: false, error: 'Job not found' }

    await prisma.job.delete({ where: { id: parsed.data } })

    refreshJobs()
    return { ok: true }
  } catch (error) {
    console.error('deleteJob failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Set job status (employee on own job / admin on any)
// ---------------------------------------------------------------------------

const setStatusSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(['PENDING', 'COMPLETED']),
  completionNote: z.string().trim().max(4000).optional(),
})

export async function setJobStatus(input: {
  jobId: string
  status: 'PENDING' | 'COMPLETED'
  completionNote?: string
}): Promise<JobActionResult> {
  try {
    const actor = await getActor()
    if (!actor) return { ok: false, error: 'Not authorized' }

    const parsed = setStatusSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)
    const { jobId, status, completionNote } = parsed.data

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        employeeId: true,
        completionNotes: true,
        status: true,
      },
    })
    if (!job) return { ok: false, error: 'Job not found' }

    // Employees may only touch their own jobs.
    if (actor.role !== 'ADMIN' && job.employeeId !== actor.id) {
      return { ok: false, error: 'Not authorized' }
    }

    if (status === 'COMPLETED') {
      const note = completionNote?.trim()
      const appended = note
        ? job.completionNotes
          ? `${job.completionNotes}\n\n${note}`
          : note
        : job.completionNotes

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completionNotes: appended ?? null,
        },
      })

      // Notify admins that the job was completed.
      await notifyAdmins({
        type: 'job_completed',
        title: 'Job completed',
        message: `${actor.name ?? 'An employee'} completed "${job.title}".`,
        href: `/jobs/${job.id}`,
      })
      // Separate note callout when a completion note was supplied.
      if (note) {
        await notifyAdmins({
          type: 'job_completion_note',
          title: 'Completion note added',
          message: `${actor.name ?? 'An employee'} on "${job.title}": ${note}`,
          href: `/jobs/${job.id}`,
        })
      }
    } else {
      // Reopen: back to PENDING, clear completedAt (keep the notes history).
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'PENDING', completedAt: null },
      })
    }

    refreshJobs(jobId)
    return { ok: true, jobId }
  } catch (error) {
    console.error('setJobStatus failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Set cash status (admin only)
// ---------------------------------------------------------------------------

const setCashSchema = z.object({
  jobId: z.string().min(1),
  cashStatus: z.enum(['OUTSTANDING', 'COLLECTED']),
})

export async function setCashStatus(input: {
  jobId: string
  cashStatus: 'OUTSTANDING' | 'COLLECTED'
}): Promise<JobActionResult> {
  try {
    const actor = await getActor()
    if (!actor || actor.role !== 'ADMIN') return { ok: false, error: 'Not authorized' }

    const parsed = setCashSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)

    const existing = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
      select: { id: true },
    })
    if (!existing) return { ok: false, error: 'Job not found' }

    await prisma.job.update({
      where: { id: parsed.data.jobId },
      data: { cashStatus: parsed.data.cashStatus },
    })

    refreshJobs(parsed.data.jobId)
    return { ok: true, jobId: parsed.data.jobId }
  } catch (error) {
    console.error('setCashStatus failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Set tip (admin only)
// ---------------------------------------------------------------------------

const setTipSchema = z.object({
  jobId: z.string().min(1),
  tipCents: z.coerce.number().int().min(0).max(100_000_00),
})

export async function setJobTip(input: {
  jobId: string
  tipCents: number
}): Promise<JobActionResult> {
  try {
    const actor = await getActor()
    if (!actor || actor.role !== 'ADMIN') return { ok: false, error: 'Not authorized' }

    const parsed = setTipSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)

    const existing = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
      select: { id: true },
    })
    if (!existing) return { ok: false, error: 'Job not found' }

    await prisma.job.update({
      where: { id: parsed.data.jobId },
      data: { tipCents: parsed.data.tipCents },
    })

    refreshJobs(parsed.data.jobId)
    return { ok: true, jobId: parsed.data.jobId }
  } catch (error) {
    console.error('setJobTip failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Mark a single job's payout paid (admin only) — thin wrapper over markJobsPaid
// ---------------------------------------------------------------------------

export async function markJobPaid(input: {
  jobId: string
  note?: string
}): Promise<JobActionResult> {
  try {
    const actor = await getActor()
    if (!actor || actor.role !== 'ADMIN') return { ok: false, error: 'Not authorized' }

    const parsed = z
      .object({ jobId: z.string().min(1), note: z.string().trim().max(500).optional() })
      .safeParse(input)
    if (!parsed.success) return invalid(parsed.error)

    const job = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
      select: {
        id: true,
        employeeId: true,
        status: true,
        payoutStatus: true,
        priceCents: true,
        tipCents: true,
        employeeSplitPercent: true,
      },
    })
    if (!job) return { ok: false, error: 'Job not found' }
    if (!job.employeeId) return { ok: false, error: 'Job has no assigned employee' }
    if (job.status !== 'COMPLETED') {
      return { ok: false, error: 'Only completed jobs can be paid' }
    }
    if (job.payoutStatus === 'PAID') {
      return { ok: false, error: 'This job is already paid' }
    }

    // Precompute for reference; the batch action recomputes canonically.
    void employeeTotalCents(job)

    const result = await markJobsPaid({
      employeeId: job.employeeId,
      jobIds: [job.id],
      note: parsed.data.note,
    })
    if (!result.ok) return { ok: false, error: result.error ?? 'Payout failed' }

    refreshJobs(job.id)
    revalidatePath('/payouts')
    return { ok: true, jobId: job.id }
  } catch (error) {
    console.error('markJobPaid failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}
