self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Cache the new response for future use
                if (event.request.method === 'GET' && networkResponse.ok) {
                    caches.open(CACHE_NAME).then((cache) => {
                        try {
                            cache.put(event.request, networkResponse.clone())
                        } catch (e) {
                            // don't worry about it
                        }
                    })
                }
                return networkResponse
            })
            .catch(() => {
                // If the network request fails, try to return a cached response
                return caches.match(event.request)
            }),
    )
})
