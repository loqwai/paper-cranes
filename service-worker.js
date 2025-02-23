console.log(`Service worker ${CACHE_NAME} starting`)

self.addEventListener('install', async event => {
    console.log('Service Worker: Installing...')
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // Add critical resources to cache during install
            return cache.addAll([
                '/',
                '/index.html',
                '/index.js',
                '/shaders/beat-trip.frag',
                '/shaders/default.frag',
                '/images/placeholder-image.png',
            ])
        })
    )
    return self.skipWaiting()
})

// Activate event - claim clients immediately and clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activated')
    event.waitUntil(self.clients.claim())
})

/**
 * Fetches a request with retry logic.
 * Retries **indefinitely** with a backoff delay.
 * @param {Request} request - The request object.
 * @returns {Promise<Response>} - The response object.
 */
async function fetchWithRetry(request) {
    let interval = 150 // Start with 250ms delay

    while (true) {
        try {
            const response = await fetch(request)
            if (response.ok) return response

            if(response.status === 0 && response.type !== 'error') return response

            console.warn(`Fetch failed for url ${request.url} (status: ${response.status}), retrying in ${interval}ms...`)
        } catch (error) {
            console.warn(`Network error for url ${request.url}, retrying in ${interval}ms...`, error)
        }

        await new Promise(resolve => setTimeout(resolve, interval))
        const jitter = Math.random() * 100
        interval = Math.min(interval * (1.5 + jitter), 10000 + (jitter * 10))
    }
}

let contentChanged = false
let inflightRequestCount = 0
/**
 * Fetches a request and caches the response. Always starts the fetch immediately.
 * @param {Request} request - The request object.
 * @returns {Promise<Response>} - The response object.
 */
async function fetchWithCache(request) {
    const cache = await caches.open(CACHE_NAME)
    const cachedResponse = await cache.match(request)

    // Always start a network request in the background
    inflightRequestCount++

    const networkPromise = fetchWithRetry(request).then(async networkResponse => {
        inflightRequestCount--
        if (!networkResponse) {
            throw new Error('No network response for:', request.url)
        }

        const cachedResponse = await cache.match(request)
        if(cachedResponse) {
            const networkClone = networkResponse.clone()
            const cachedClone = cachedResponse.clone()

            const oldData = await cachedClone.text()
            const newData = await networkClone.text()

            await cache.put(request, networkResponse.clone())  // Only put once
            console.log(`waiting for ${inflightRequestCount} requests to complete`)
            if(oldData !== newData) {
                contentChanged = true
                console.log(`Content changed: ${request.url}. Waiting for ${inflightRequestCount} requests to complete`)
            }
            new Promise(resolve => setTimeout(resolve, 10)).then(() => {
            if(inflightRequestCount <= 0 && contentChanged) {
                // wait a bit to see if more requests come in
                console.log('All requests complete, triggering reload', contentChanged)
                contentChanged = false
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => client.postMessage('reload'))
                })
                }
            })
        }
        await cache.put(request, networkResponse.clone())
        return networkResponse
    })

    // Return cached response immediately if available
    if (cachedResponse) return cachedResponse

    return networkPromise
}

/**
 * Possibly intercepts a fetch event and caches the response.
 * @param {FetchEvent} event
 */
self.addEventListener('fetch', (e) => {
    if (!e.request.url.includes('http')) return
    if(e.request.url.includes('localhost')) return
    if (e.request.method !== 'GET') return
    if(e.request.url.includes('service-worker.js')) return
    if(e.request.url.includes('esbuild')) return

    e.respondWith(fetchAndMaybeCache(e.request))
})

/**
 * @param {Request} request
 * @returns {Promise<Response>} - The response object.
 */
const fetchAndMaybeCache = async (request) => {
    const url = new URL(request.url)

    // Always use cache in production
   if (url.hostname.includes('localhost')) return fetch(request)
    return fetchWithCache(request)
}
