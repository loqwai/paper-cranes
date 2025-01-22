const wait = async (ms) => new Promise((resolve) => setTimeout(resolve, ms))

self.skipWaiting()
self.addEventListener('install', function (event) {
    // Perform install steps
})

self.addEventListener('activate', function (event) {
    // Perform activate steps
    self.clients.claim()
})

async function fetchWithControlledRetry(request) {
    const cache = await caches.open(CACHE_NAME)

    async function attemptFetch() {
        console.log('attemptFetch', request.url)
        let cacheResponse = await caches.match(request)

        const timeoutPromise = new Promise((resolve) =>
            setTimeout(async () => {
                if (cacheResponse) return resolve(cacheResponse)
                await wait(500)
                resolve(fetch(request))
            }, 1000),
        )
        // Skip caching for esbuild live reload endpoint
        if (request.url.includes('/esbuild')) {
            return fetch(request)
        }

        const networkPromise = fetch(request)
            .then(async (response) => {
                if (response.ok) {
                    await cache.put(request, response.clone()) // Cache the successful response
                    return response
                }
                throw new Error('Network response was not ok')
            })
            .catch(async (error) => {
                // In case of network error (including being offline), return cached response if available
                if (cacheResponse) {
                    return cacheResponse
                }
                wait(500) // Wait 500ms before retrying
                return fetch(request)
            })

        return Promise.race([networkPromise, timeoutPromise])
    }

    return attemptFetch()
}

self.addEventListener('fetch', function (event) {
    // Guard clauses for GET requests, excluding 'edit' in URL, and ensuring same-origin
    if (event.request.method !== 'GET' || event.request.url.includes('edit')) {
        return
    }

    event.respondWith(fetchWithControlledRetry(event.request))
})
