'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

export type NotificationDTO = {
  id: string
  type: string
  title: string
  message: string
  href: string | null
  read: boolean
  /** ISO timestamp — serialized for client components. */
  createdAt: string
}

type MutationResult = { ok: boolean; error?: string }

function serialize(n: {
  id: string
  type: string
  title: string
  message: string
  href: string | null
  read: boolean
  createdAt: Date
}): NotificationDTO {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    href: n.href,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }
}

/** Latest notifications for the signed-in user, newest first. */
export async function getMyNotifications(limit?: number): Promise<NotificationDTO[]> {
  const user = await requireUser()

  const parsed = z.number().int().positive().max(200).optional().safeParse(limit)
  const take = parsed.success && parsed.data ? parsed.data : 50

  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take,
  })

  return rows.map(serialize)
}

/** Count of unread notifications for the signed-in user. */
export async function getUnreadCount(): Promise<number> {
  const user = await requireUser()
  return prisma.notification.count({
    where: { userId: user.id, read: false },
  })
}

/** Mark one of the signed-in user's notifications as read. */
export async function markRead(id: string): Promise<MutationResult> {
  const user = await requireUser()

  const parsed = z.string().min(1).safeParse(id)
  if (!parsed.success) {
    return { ok: false, error: 'Invalid notification id' }
  }

  try {
    await prisma.notification.updateMany({
      where: { id: parsed.data, userId: user.id },
      data: { read: true },
    })
    revalidatePath('/notifications')
    return { ok: true }
  } catch (error) {
    console.error('markRead failed', error)
    return { ok: false, error: 'Could not update notification' }
  }
}

/** Mark every unread notification for the signed-in user as read. */
export async function markAllRead(): Promise<MutationResult> {
  const user = await requireUser()

  try {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    })
    revalidatePath('/notifications')
    return { ok: true }
  } catch (error) {
    console.error('markAllRead failed', error)
    return { ok: false, error: 'Could not mark notifications as read' }
  }
}
