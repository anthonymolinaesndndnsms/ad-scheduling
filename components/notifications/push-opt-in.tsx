'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { subscribeToPush, unsubscribeFromPush } from '@/lib/actions/push'

type Status = 'checking' | 'unsupported' | 'denied' | 'off' | 'on'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

/**
 * Lets the user turn on real OS-level push notifications for this device.
 * Renders nothing if the browser doesn't support push (e.g. some in-app
 * browsers) or the app isn't configured with VAPID keys.
 */
export function PushOptIn() {
  const [status, setStatus] = React.useState<Status>('checking')
  const [busy, setBusy] = React.useState(false)
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  React.useEffect(() => {
    let cancelled = false

    async function check() {
      if (!publicKey || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (!cancelled) setStatus('unsupported')
        return
      }
      if (Notification.permission === 'denied') {
        if (!cancelled) setStatus('denied')
        return
      }
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        const existing = await registration.pushManager.getSubscription()
        if (!cancelled) setStatus(existing ? 'on' : 'off')
      } catch {
        if (!cancelled) setStatus('unsupported')
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [publicKey])

  async function enable() {
    if (!publicKey || busy) return
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off')
        if (permission === 'denied') {
          toast.error('Notifications were blocked. Enable them in your browser/site settings.')
        }
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const json = subscription.toJSON() as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }
      const res = await subscribeToPush(json)
      if (!res.ok) {
        toast.error(res.error ?? 'Could not enable notifications')
        return
      }
      setStatus('on')
      toast.success('Notifications enabled on this device')
    } catch (error) {
      console.error('enable push failed', error)
      toast.error('Could not enable notifications on this device')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    if (busy) return
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint)
        await subscription.unsubscribe()
      }
      setStatus('off')
      toast.success('Notifications turned off for this device')
    } catch (error) {
      console.error('disable push failed', error)
      toast.error('Could not turn off notifications')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'checking' || status === 'unsupported') return null

  if (status === 'denied') {
    return (
      <Card className="border-amber-500/30">
        <CardContent className="flex items-center gap-3 py-3">
          <BellOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-muted-foreground">
            Notifications are blocked for this site. Allow them in your browser or device
            settings to get alerts for new jobs, payouts, and updates.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (status === 'on') {
    return (
      <Card className="border-emerald-500/30">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <BellRing className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm">Notifications are on for this device.</p>
          </div>
          <Button variant="outline" size="sm" onClick={disable} disabled={busy}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Turn off
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-3">
          <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm">Get notified on this device for new jobs and updates.</p>
        </div>
        <Button size="sm" onClick={enable} disabled={busy}>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Enable notifications
        </Button>
      </CardContent>
    </Card>
  )
}
