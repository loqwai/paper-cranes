self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Return the cached response if found
            if (response) {
                return response
            }

            // Otherwise, fetch from the network and cache the response
            return fetch(event.request).then((response) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, response.clone())
                    return response
                })
            })
        }),
    )
})
