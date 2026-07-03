import { prisma } from '@/lib/prisma'

type NotificationInput = {
  type: string
  title: string
  message: string
  href?: string
}

/** Create an in-app notification for a single user. Never throws. */
export async function notify(userId: string, input: NotificationInput) {
  try {
    await prisma.notification.create({ data: { userId, ...input } })
  } catch (error) {
    console.error('notify failed', error)
  }
}

/** Create an in-app notification for every active admin. Never throws. */
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
  } catch (error) {
    console.error('notifyAdmins failed', error)
  }
}
