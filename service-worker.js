self.addEventListener('activate', (event) => {
    // Ensure the updated service worker takes control immediately
    event.waitUntil(self.clients.claim())
})
let timesFailed = 0
self.addEventListener('fetch', (event) => {
    console.log('cache name', CACHE_NAME)

    const controller = new AbortController()
    const signal = controller.signal

    const fetchPromise = fetch(event.request, { signal })

    setTimeout(() => {
        controller.abort()
    }, 1500 / ++timesFailed) // Abort fetch after 100ms

    event.respondWith(
        fetchPromise
            .then((networkResponse) => {
                // Cache the new response
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone())
                })
                return networkResponse.clone()
            })
            .catch((error) => {
                if (error.name === 'AbortError' || error.name === 'NetworkError') {
                    // Network fetch timed out or failed
                    return caches.match(event.request).then((cachedResponse) => {
                        return cachedResponse // Return cached response if available
                    })
                } else {
                    // Other error handling
                    console.error('Fetch failed:', error)
                    return caches.match(event.request) // Fallback to cache for other errors
                }
            }),
    )
})
