const wait = async (ms) => new Promise((resolve) => setTimeout(resolve, ms))

self.addEventListener('install', function (event) {
    // Perform install steps
})

async function fetchWithControlledRetry(request) {
    const cache = await caches.open(CACHE_NAME)

    async function attemptFetch() {
        let cacheResponse = await caches.match(request)

        const timeoutPromise = new Promise((resolve) =>
            setTimeout(async () => {
                if (cacheResponse) return resolve(cacheResponse)
                await wait(500)
                resolve(fetch(request))
            }, 200),
        ) // 200ms timeout

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
    if (event.request.method !== 'GET' || event.request.url.includes('edit') || new URL(event.request.url).origin !== location.origin) {
        return
    }

    event.respondWith(fetchWithControlledRetry(event.request))
})
