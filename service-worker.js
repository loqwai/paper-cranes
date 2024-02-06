self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Cache the new response for future use
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone())
                })
                return networkResponse
            })
            .catch(() => {
                // If the network request fails, try to return a cached response
                return caches.match(event.request)
            }),
    )
})
