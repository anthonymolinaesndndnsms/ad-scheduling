'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

export type PushActionResult = { ok: boolean; error?: string }

/** Save (or reassign) a device's push subscription to the signed-in user. */
export async function subscribeToPush(
  input: z.input<typeof subscribeSchema>
): Promise<PushActionResult> {
  try {
    const user = await requireUser()
    const parsed = subscribeSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Invalid subscription' }

    await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      update: {
        userId: user.id,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      },
      create: {
        userId: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      },
    })

    return { ok: true }
  } catch (error) {
    console.error('subscribeToPush failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

/** Remove a device's push subscription (e.g. user disabled notifications). */
export async function unsubscribeFromPush(endpoint: string): Promise<PushActionResult> {
  try {
    const user = await requireUser()
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: user.id },
    })
    return { ok: true }
  } catch (error) {
    console.error('unsubscribeFromPush failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

/** Whether the signed-in user currently has at least one push subscription. */
export async function hasActivePushSubscription(): Promise<boolean> {
  try {
    const user = await requireUser()
    const count = await prisma.pushSubscription.count({ where: { userId: user.id } })
    return count > 0
  } catch {
    return false
  }
}
