const CACHE = 'onelink-employee-v1'
const OFFLINE_URL = '/employee'

// Install: cache the employee shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([OFFLINE_URL]))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first for API/auth, cache-first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Always go network for API, auth, and supabase
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('supabase')
  ) {
    event.respondWith(fetch(event.request))
    return
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(event.request, clone))
        }
        return response
      }).catch(() => caches.match(OFFLINE_URL))
    })
  )
})

// Push: show notification
self.addEventListener('push', event => {
  let data = { title: 'OneLink', body: 'Masz nowe powiadomienie', url: '/employee' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/company-logo.png',
      badge: '/company-logo.png',
      data: { url: data.url },
      vibrate: [100, 50, 100],
    })
  )
})

// Notification click: open or focus the app
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = event.notification.data?.url ?? '/employee'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(targetUrl))
      if (existing) return existing.focus()
      return clients.openWindow(targetUrl)
    })
  )
})
