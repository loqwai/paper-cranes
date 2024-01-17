const CACHE_NAME = 'v2'
const urlsToCache = [
    'index.html',
    'index.css',
    'index.js',
    // Add other URLs and assets you want to cache
]
console.log({ urlsToCache })

self.addEventListener('install', (event) => {
    // Clear old caches during installation of the new service worker
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // You might choose to only delete caches that are not current
                        if (cacheName !== CACHE_NAME) {
                            console.log(`Deleting cache: ${cacheName}`)
                            return caches.delete(cacheName)
                        }
                    }),
                )
            })
            .then(() => self.skipWaiting()), // Activate the new service worker without waiting
    )

    // Cache new assets
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache).catch((error) => {
                console.error('Caching failed:', error)
                // Optionally, handle the failure case, like skipping caching
            })
        }),
    )
})

self.addEventListener('activate', (event) => {
    // Ensure the updated service worker takes control immediately
    event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Use fetch to get the latest version from the network
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone())
                })
                return networkResponse.clone()
            })

            // Return the cached response immediately, if available, while the fetch continues in the background
            return cachedResponse?.clone() || fetchPromise
        }),
    )
})
