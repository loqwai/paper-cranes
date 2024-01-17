const CACHE_NAME = `cache__${WEBPACK_CACHE_NAME}`

self.addEventListener('activate', (event) => {
    // Ensure the updated service worker takes control immediately
    event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
    console.log('cache name', CACHE_NAME)
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
