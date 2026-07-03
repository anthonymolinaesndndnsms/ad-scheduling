import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const subject = process.env.VAPID_SUBJECT || 'mailto:support@example.com'

const configured = Boolean(publicKey && privateKey)
if (configured) {
  webpush.setVapidDetails(subject, publicKey!, privateKey!)
}

export type PushPayload = {
  title: string
  body: string
  href?: string
}

/**
 * Sends a real OS-level push notification to every device the given user has
 * subscribed on. Never throws — push delivery is best-effort and must never
 * block the in-app notification flow that calls it. Automatically prunes
 * subscriptions the browser/OS reports as gone (404/410).
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!configured) return

  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } })
    if (subs.length === 0) return

    const body = JSON.stringify(payload)

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body
          )
        } catch (error) {
          const statusCode = (error as { statusCode?: number })?.statusCode
          if (statusCode === 404 || statusCode === 410) {
            // Subscription expired or was revoked on the device — clean it up.
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
          } else {
            console.error('sendPushToUser: delivery failed', error)
          }
        }
      })
    )
  } catch (error) {
    console.error('sendPushToUser failed', error)
  }
}

/** Same as sendPushToUser, but fans out to every id in the list. */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  await Promise.all(userIds.map((id) => sendPushToUser(id, payload)))
}
