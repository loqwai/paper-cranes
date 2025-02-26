const self = /** @type {ServiceWorkerGlobalScope} */ (globalThis)

console.log(`Service worker ${CACHE_NAME} starting`)
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))


/**
 * Install event - The event returned by the install event is used to cache critical resources during install
 * @param {InstallEvent} event
 */
self.addEventListener("install", async (event) => {
    console.log("Service Worker: Installing...")
    await self.skipWaiting()
})

// Activate event - claim clients immediately and clean up old caches
self.addEventListener("activate", async (event) => {
    console.log("Service Worker: Activated")
    await self.clients.claim()
    console.log("Service Worker: Claimed clients")
})


/**
 * A set of requests that are waiting to be retried.
 * @type {Array<{request: Request, resolve: (response: Response) => void}>}
 */
const requestsToRetry = []

/**
 * Fetches a request with retry logic.
 * Retries **indefinitely** with a backoff delay.
 * @param {Request} request - The request object.
 * @returns {Promise<Response>} - The response object.
 */
async function fetchWithRetry(request) {
    let interval = 150 // Start with 150ms delay

    return new Promise(async (resolve) => {
        requestsToRetry.push({request, resolve})
        while (true) {
            if(requestsToRetry.length === 0) return
            const {request, resolve} = requestsToRetry.shift()
            if(!request) throw new Error("No request to retry")

            try {
                const response = await fetch(request)
                const nextRequest = requestsToRetry.shift()
                if (nextRequest) fetchWithRetry(nextRequest.request).then(nextRequest.resolve)

                if (response.ok) return resolve(response)
                if (response.status === 0 && response.type !== "error") return resolve(response)

                requestsToRetry.push({request, resolve})

                console.warn(
                    `Fetch failed for url ${request.url} (status: ${response.status}). Added to retry queue.`
                )
            } catch (error) {
                requestsToRetry.push({request, resolve})
                console.error(`Network error for url ${request.url}, retrying in ${interval}ms...`, error)
                if (interval > 15000) {
                    interval = 150;
                    await timeout(Math.random() * 30000 + 10000)
                }
            }
            await timeout(interval)
            console.log(`Back from sleeping when trying to fetch ${request.url}. There are ${requestsToRetry.length} requests to retry`)
            const jitter = Math.random()
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

    const networkPromise = fetchWithRetry(request).then(async (networkResponse) => {
        console.log(`${request.url} fetched`)
        const cachedResponse = await cache.match(request)
        const networkClone = networkResponse.clone()
        await cache.put(request, networkResponse)

        if(!cachedResponse) return

        const cachedClone = cachedResponse.clone()

        const oldData = await cachedClone.text()
        const newData = await networkClone.text()
        contentChanged ||= (oldData !== newData)
        console.log(`${request.url} has changed: ${contentChanged}`)
        if(!contentChanged) return


        // wait a bit to see if more requests come in
        await timeout(50)
        if(requestsToRetry.length > 0) {
            console.log(`${request.url} has changed, but I'm waiting for ${requestsToRetry.length} requests to complete`)
            return
        }

        console.log("All requests complete, triggering reload")
        contentChanged = false
        const clients = await self.clients.matchAll()
        clients.forEach((client) => client.postMessage("reload"))
        console.log("Reloaded", clients.length, "clients")
    })
    const found = await cache.match(request)
    return found || networkPromise
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
    // if (!e.request.url.includes(location.origin)) return // actually I want to get and cache monaco.
    e.respondWith(fetchWithCache(e.request))
})
