self.addEventListener('install', function (event) {
    // Perform install steps
})

self.addEventListener('fetch', function (event) {
    // Guard clauses for GET requests, excluding 'edit' in URL, and ensuring same-origin
    if (event.request.method !== 'GET' || event.request.url.includes('edit') || new URL(event.request.url).origin !== location.origin) {
        return
    }
    event.respondWith(
        (async function () {
            const cache = await caches.open(CACHE_NAME)
            const cacheResponse = await caches.match(event.request)
            let fetchPromise = fetch(event.request).then((networkResponse) => {
                // Validate response and cache it
                if (!networkResponse.ok) throw new Error('Network response was not ok')
                cache.put(event.request, networkResponse.clone())
                return networkResponse
            })

            let timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(cacheResponse), 200)) // 100ms to wait for the network

            try {
                // Attempt to fetch from network, fallback to cache if it errors or times out
                return await Promise.race([fetchPromise, timeoutPromise])
            } catch (error) {
                // Retry logic on network failure
                fetchPromise = fetch(event.request)
                    .then((networkResponse) => {
                        if (!networkResponse.ok) throw new Error('Network response was not ok')
                        cache.put(event.request, networkResponse.clone())
                        return networkResponse
                    })
                    .catch(async () => {
                        // After retries, if network fails, serve from cache if available
                        if (cacheResponse) return cacheResponse
                        throw new Error('Network error and no cache available')
                    })

                return await fetchPromise
            }
        })(),
    )
})
