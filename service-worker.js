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
        caches.open('v1').then((cache) => {
            return cache.addAll(urlsToCache).catch((error) => {
                console.error('Caching failed:', error)
                // Optionally, handle the failure case, like skipping caching
            })
        }),
    )
})
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
