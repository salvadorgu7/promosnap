// PromoSnap Service Worker — Push Notifications + Offline Cache
// Registered from the app layout. Handles push events for price drop alerts.

const CACHE_NAME = 'promosnap-v1'
const STATIC_ASSETS = ['/', '/busca', '/ofertas', '/assistente']

// ── Install: pre-cache essential pages ─────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ── Activate: clean old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch: network-first, fallback to cache ────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only cache GET requests for pages (not API calls)
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// ── Push Notifications ─────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const options = {
      body: data.body || 'Nova oferta disponível!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      image: data.image,
      vibrate: [200, 100, 200],
      tag: data.tag || 'promosnap-alert',
      data: {
        url: data.url || '/',
      },
      actions: [
        { action: 'view', title: 'Ver oferta' },
        { action: 'dismiss', title: 'Fechar' },
      ],
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'PromoSnap', options)
    )
  } catch {
    // Invalid push data
  }
})

// ── Notification click handler ─────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new tab
      return self.clients.openWindow(url)
    })
  )
})
