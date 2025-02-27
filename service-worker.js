const self = /** @type {ServiceWorkerGlobalScope} */ (globalThis)

console.log(`Service worker ${CACHE_NAME} starting`)
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
/**
 * A set of requests that are waiting to be retried.
 * @type {Array<{request: Request, resolve: (response: Response) => void, tries: number}>}
 */
const requestsToRetry = []

/**
 * Install event - The event returned by the install event is used to cache critical resources during install
 * @param {InstallEvent} event
 */
self.addEventListener("install", async (event) => {
    console.log("Service Worker: Installing...")
    requestsToRetry.length = 0
    await self.skipWaiting()
})

// Activate event - claim clients immediately and clean up old caches
self.addEventListener("activate", async (event) => {
    console.log("Service Worker: Activated")
    requestsToRetry.length = 0
    await self.clients.claim()
    console.log("Service Worker: Claimed clients")
})




const addToRetryQueue = async (request, resolve, tries) => {
    tries++
    const cache = await caches.open(CACHE_NAME)
    if (await cache.match(request)) {
        console.warn(`${request.url} is in the cache, putting it at the back of the queue.`)
        return requestsToRetry.push({request, resolve, tries})
    }
    if(Math.random() < 0.1) {
        console.warn(`no cache for ${request.url}, putting it in the back anyway`)
        return requestsToRetry.push({request, resolve, tries})
    }
    console.warn(`there is no cache for ${request.url}, putting it in the front of the queue.`)
    requestsToRetry.unshift({request, resolve, tries: tries + 1})
}

/**
 * Fetches a request with retry logic.
 * Retries **indefinitely** with a backoff delay.
 * @param {Request} request - The request object.
 * @returns {Promise<Response>} - The response object.
 */
async function fetchWithRetry(request) {
    let interval = 150 // Start with 150ms delay
    return new Promise(async (resolve) => {
        requestsToRetry.unshift({request, resolve, tries: 0})
        while (true) {
            if(requestsToRetry.length === 0) return
            const {request, resolve, tries} = requestsToRetry.shift() // the first time, do this request first.
            if(!request) {
                console.warn("No request to retry")
                return
            }
            console.log(`Fetching ${request.url} (tries: ${tries})`)

            try {
                const response = await fetch(request)

                for(let i = 0; i < 3; i++) {
                    const nextRequest = requestsToRetry.shift()
                    if (nextRequest) timeout(Math.random() * 1000).then(() => fetchWithRetry(nextRequest.request).then(nextRequest.resolve) )
                }

                if (response.ok) return resolve(response)
                if (response.status === 0 && response.type !== "error") return resolve(response)
                console.warn(`Fetch failed for url ${request.url} (status: ${response.status})`)
                if(tries > 10) {
                    console.warn(`failed 10x. Giving up.`)
                    return resolve(response)
                }

            } catch (error) {
                console.error(`Network error for url ${request.url}, retrying in ${interval}ms...`, error)
                if (interval > 15000) {
                    interval = 150;
                    await timeout(Math.random() * 30000 + 10000)
                }
            }
            addToRetryQueue(request, resolve, tries)
            await timeout(interval)
            console.log(`Back from sleeping when trying to fetch ${request.url}. There are ${requestsToRetry.length} requests to retry. interval: ${interval}`)
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

        if(!cachedResponse) return networkClone

        const cachedClone = cachedResponse.clone()

        const oldData = await cachedClone.text()
        const newData = await networkClone.text()
        contentChanged ||= (oldData !== newData)
        console.log(`${request.url} has changed: ${contentChanged}`)
        if(!contentChanged) return networkClone


        // wait a bit to see if more requests come in
        await timeout(50)
        if(requestsToRetry.length > 0) {
            console.log(`${request.url} has changed, but I'm waiting for ${requestsToRetry.length} requests to complete`)
            return networkClone
        }

        console.log("All requests complete, triggering reload")
        contentChanged = false
        const clients = await self.clients.matchAll()
        clients.forEach((client) => client.postMessage("reload"))
        console.log("Reloaded", clients.length, "clients")
    })
    const found = await cache.match(request)
    if(found) return found
    return networkPromise
}

/**
 * Intercepts a fetch event and caches the response.
 * @param {FetchEvent} event The fetch event containing request and respondWith
 */
self.addEventListener("fetch", (e) => {

    if (!e.request.url.includes("http")) return

    // if (e.request.url.includes("localhost")) return

    if (e.request.method !== "GET") return

    if (e.request.url.includes("service-worker.js")) return

    if (e.request.url.includes("esbuild")) return

    // if it's not our domain, cache and return.
    // if it's not a  navigation request, cache and return.
    if(!e.request.mode === "navigate") return e.respondWith(fetchWithCache(e.request))

    if(!e.request.url.startsWith(location.origin)) return e.respondWith(fetchWithCache(e.request))

    const strippedUrl = new URL(e.request.url)
    strippedUrl.search = ""
    const strippedRequest = new Request(strippedUrl.toString())

    for(const key in e.request.headers) {
        strippedRequest.headers.set(key, e.request.headers.get(key))
    }

    return e.respondWith(fetchWithCache(strippedRequest))

})
