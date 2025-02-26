console.log(`Service worker ${CACHE_NAME} starting`)
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let inflightRequestCount = 0
/**
 * Install event - The event returned by the install event is used to cache critical resources during install
 * @param {InstallEvent} event
 */
self.addEventListener("install", async (event) => {
    console.log("Service Worker: Installing...")
    await self.skipWaiting()
    inflightRequestCount = 0
})

// Activate event - claim clients immediately and clean up old caches
self.addEventListener("activate", async (event) => {
    console.log("Service Worker: Activated")
    await self.clients.claim()
    console.log("Service Worker: Claimed clients")
    inflightRequestCount = 0
})

/**
 * Fetches a request with retry logic.
 * Retries **indefinitely** with a backoff delay.
 * WARNING: this may both reject and later resolve. This can cause code to unexpectedly execute when you thought it was done.
 * @param {Request} request - The request object.
 * @returns {Promise<Response>} - The response object.
 */
async function fetchWithRetry(request) {
    let responded = false
    let interval = 150 // Start with 250ms delay
    return new Promise(async (resolve, reject) => {
        while (true) {
        try {
            const response = await fetch(request)
            if (response.ok && !responded) {
                responded = true
                return resolve(response)
            }

            if (response.status === 0 && response.type !== "error") return resolve(response)

            console.warn(
                `Fetch failed for url ${request.url} (status: ${response.status}), retrying in ${interval}ms...`
            )
        } catch (error) {
            if (interval > 15000 && !responded) {
                responded = true
                console.error(`retry's about to lie`)
                inflightRequestCount = Math.max(0, inflightRequestCount - 1)
                reject(new Error("Failed to fetch")) // but keep going.
            }
            console.warn(`Network error for url ${request.url}, retrying in ${interval}ms...`, error)
        }

        await timeout(interval)
            const jitter = Math.random() * 100
            interval *= (1.5 + jitter)
        }
    })
}

let contentChanged = false

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

    const networkPromise = fetchWithRetry(request).then(async (networkResponse) => {
        inflightRequestCount--

        const cachedResponse = await cache.match(request)
        if (cachedResponse) {
            const networkClone = networkResponse.clone()
            const cachedClone = cachedResponse.clone()

            const oldData = await cachedClone.text()
            const newData = await networkClone.text()

            await cache.put(request, networkResponse.clone()) // Only put once
            console.log(`waiting for ${inflightRequestCount} requests to complete`)
            contentChanged ||= oldData !== newData
            await timeout(50)

            if (inflightRequestCount <= 0 && contentChanged) {
                // wait a bit to see if more requests come in
                console.log("All requests complete, triggering reload", contentChanged)
                contentChanged = false
                self.clients.matchAll().then((clients) => clients.forEach((client) => client.postMessage("reload")))
            }
        }
        await cache.put(request, networkResponse.clone())
        return networkResponse
    })

    return cachedResponse || networkPromise
}

/**
 * Possibly intercepts a fetch event and caches the response.
 * @param {FetchEvent} event
 */
self.addEventListener("fetch", (e) => {
    if (!e.request.url.includes("http")) return
    if (e.request.url.includes("localhost")) return
    if (e.request.method !== "GET") return
    if (e.request.url.includes("service-worker.js")) return
    if (e.request.url.includes("esbuild")) return
    // if the url is not in our domain, continue
    if (!e.request.url.includes(location.origin)) return
    console.log(`fetching ${e.request.url} as it is ours`)
    e.respondWith(fetchWithCache(e.request))
})
