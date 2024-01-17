const CACHE_NAME = 'v4'

self.addEventListener('install', (event) => {
    // Clear all old caches during installation
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        console.log(`Deleting cache: ${cacheName}`)
                        return caches.delete(cacheName)
                    }),
                )
            })
            .then(() => self.skipWaiting()), // Activate new service worker immediately
    )
})

self.addEventListener('activate', (event) => {
    // Ensure the updated service worker takes control immediately
    event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Cache the new response
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone())
                })
                return networkResponse
            })

            // Return the cached response immediately, if available, while updating the cache in the background
            return cachedResponse || fetchPromise
        }),
    )
})
