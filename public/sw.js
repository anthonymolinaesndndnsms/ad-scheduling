// Kids Next Door service worker — receives Web Push events and shows real
// device/OS notifications, even when the app tab isn't open.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = { title: 'Kids Next Door', body: 'You have a new notification.', href: '/notifications' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // Non-JSON payload — fall back to defaults.
  }

  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/icon.png',
    data: { href: data.href || '/notifications' },
    tag: data.href || undefined,
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Tapping the notification focuses an open tab if one exists, otherwise opens
// a new one, and navigates to the relevant page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const href = (event.notification.data && event.notification.data.href) || '/notifications'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(href)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(href)
      }
    })
  )
})
