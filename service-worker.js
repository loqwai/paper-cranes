const CACHE_NAME = 'v1'
const urlsToCache = [
    'index.html',
    'index.css',
    'index.js',
    // Add other URLs and assets you want to cache
]
console.log({ urlsToCache })

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache).catch((error) => {
                console.error('Caching failed:', error)
                // Optionally, handle the failure case, like skipping caching
            })
        }),
    )
})

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Use fetch to get the latest version from the network
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone())
                })
                return networkResponse
            })

            // Return the cached response immediately, if available, while the fetch continues in the background
            return cachedResponse || fetchPromise
        }),
    )
})
