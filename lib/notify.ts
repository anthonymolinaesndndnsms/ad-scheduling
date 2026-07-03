import { prisma } from '@/lib/prisma'
import { sendPushToUser, sendPushToUsers } from '@/lib/push'

type NotificationInput = {
  type: string
  title: string
  message: string
  href?: string
}

/**
 * Create an in-app notification for a single user, and also push a real
 * device notification if they have push enabled. Never throws.
 */
export async function notify(userId: string, input: NotificationInput) {
  try {
    await prisma.notification.create({ data: { userId, ...input } })
  } catch (error) {
    console.error('notify failed', error)
  }
  await sendPushToUser(userId, { title: input.title, body: input.message, href: input.href })
}

/**
 * Create an in-app notification for every active admin, and push real device
 * notifications to them too. Never throws.
 */
export async function notifyAdmins(input: NotificationInput) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', active: true },
      select: { id: true },
    })
    if (admins.length === 0) return
    await prisma.notification.createMany({
      data: admins.map((a) => ({ userId: a.id, ...input })),
    })
    await sendPushToUsers(
      admins.map((a) => a.id),
      { title: input.title, body: input.message, href: input.href }
    )
  } catch (error) {
    console.error('notifyAdmins failed', error)
  }
}
