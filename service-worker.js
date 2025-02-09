const wait = async (ms) => new Promise((resolve) => setTimeout(resolve, ms))

self.addEventListener('install', (event) => {
    // Immediately activate the new service worker
    event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', async(event) => {
    self.clients.claim()
})

async function fetchWithControlledRetry(request) {
    const cache = await caches.open(CACHE_NAME)

    // Implement stale-while-revalidate strategy for most resources
    async function attemptFetch() {
        // Skip caching for esbuild live reload endpoint
        if (request.url.includes('esbuild')) {
            return fetch(request)
        }

        // Check cache first
        const cached = await caches.match(request)

        // Start network fetch immediately
        const networkPromise = fetch(request)
            .then(async (response) => {
                if (response.ok) {
                    // Cache successful responses in the background
                    cache.put(request, response.clone())
                    return response
                }
                throw new Error('Network response was not ok')
            })
            .catch(async (error) => {
                const cached = await caches.match(request) // maybe cache was updated.
                if (cached) return cached
                await wait(500)
                return fetch(request)
            })

        // Return cached response immediately if available
        if (cached) {
            return cached
        }

        // If no cache, wait for network with timeout
        const timeoutPromise = new Promise((resolve) =>
            setTimeout(async () => {
                await wait(500)
                resolve(fetch(request))
            }, 5000)
        )

        return Promise.race([networkPromise, timeoutPromise])
    }

    return attemptFetch()
}

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return

    event.respondWith(fetchWithControlledRetry(event.request))
})
