const self = /** @type {ServiceWorkerGlobalScope} */ (globalThis)

console.log(`Service worker ${CACHE_NAME} starting`)
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

self.addEventListener("install", (event) => {
    console.log("Service Worker: Installing...")
    self.skipWaiting()
})

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim())
})

self.addEventListener("message", (event) => {
    if(event.data.type === "network-changed") retryDeadRequests()
})

const reloadAllClients = async () => {
    contentChanged = false
    const clients = await self.clients.matchAll()
    clients.forEach((client) => client.postMessage("reload"))
}

let requestsToRetry = []
let deadRequests = []

/**
 * @param {Request | undefined} request - The request object.
 */
async function fetchWithRetry(request) {
    let interval = 150 // Start with 150ms delay

    return new Promise(async (resolve, reject) => {
        if(request) requestsToRetry.push({request, resolve, reject}) // the first time, do this request first.

        while (true) {
            if(requestsToRetry.length === 0) {
                if(contentChanged) reloadAllClients()
                return
            }

            const retryItem = requestsToRetry.pop()
            if(!retryItem?.request) return console.error("No request to retry")

            try {
                const response = await fetch(retryItem.request)
                if(requestsToRetry.length > 0) fetchWithRetry() // I guess triple-check that there are requests to retry.
                if (response.ok) return retryItem.resolve(response)
                if (response.status === 0 && response.type !== "error") return retryItem.resolve(response)

                console.warn(
                    `Fetch failed for url ${retryItem.request.url} (status: ${response.status}). Added to retry queue.`
                )
            } catch (error) {
                console.error(`Network error for url ${retryItem.request.url}, retrying in ${interval}ms...`, error)
            }

            if (interval > 10000) return deadRequests.push(retryItem)

            requestsToRetry.unshift(retryItem)
            await timeout(interval)
            const jitter = Math.random()
            interval *= (2 + jitter)
        }
    })
}

// I guess double-check that there are requests to retry every 10 seconds.
setInterval(fetchWithRetry, 10000)

const retryDeadRequests = () => {
    console.log("Retrying dead requests", deadRequests.length)

    // increase dead count
    deadRequests.forEach(item => item.timesDead = (item.timesDead ?? 0) + 1)

    // filter out requests that have been retried too many times
    deadRequests = deadRequests.filter(item => (item.timesDead ?? 0) < 5)
    // filter out duplicate requests
    const seenUrls = new Set()
    deadRequests = deadRequests.filter((item) => {
        if (seenUrls.has(item.request.url)) return false
        return seenUrls.add(item.request.url)
    })

    // this is a hack because fetchWithRetry is dumb and doesn't accept the data format it creates.
    while (deadRequests.length > 0) {
        requestsToRetry.push(deadRequests.pop())
        fetchWithRetry()
    }
}

let contentChanged = false

/**
 * Gets a response from cache, checking both exact matches and URLs without query params
 * @param {Request} request - The request to find in cache
 * @returns {Promise<Response|undefined>} The cached response if found, undefined otherwise
 */
async function getFromCache(request) {
    const cache = await caches.open(CACHE_NAME)

    // Check for exact match first
    const exactMatch = await cache.match(request)
    if (exactMatch) return exactMatch.clone()

    // Try matching without query params
    const url = new URL(request.url)
    url.search = '' // Remove query params
    return (await cache.match(url))?.clone()
}
/**
 * Adds a request to the cache, storing both with and without query params
 * @param {Request} req - The request to cache
 * @param {Response} res - The response to cache
 * @returns {Promise<Request>} - The given request
 */
const addToCache = async (req, res) => {
    res = res.clone()
    const cleanRes = res.clone()
    const cache = await caches.open(CACHE_NAME)

    // Store original request
    cache.put(req,res)

    // Store version without query params
    const url = new URL(req.url)
    url.search = ''
    cache.put(url,cleanRes)
    return req
}

const didThingsChange = async (request, response) => {
    const safeResponse = response.clone()
    const cached = await getFromCache(request)
    const newData = await safeResponse.text()
    const oldData = await cached?.text()
    return oldData && oldData !== newData
}

/**
 * Fetches a request and caches the response. Always starts the fetch immediately.
 * @param {Request} request - The request object.
 * @returns {Promise<Response>} - The response object.
 */
async function fetchWithCache(request) {
    const networkPromise = fetchWithRetry(request).then(async (response) => {
        contentChanged ||= await didThingsChange(request, response)
        return addToCache(request, response)
    })

    return (await getFromCache(request)) ?? networkPromise
}

/**
 * Possibly intercepts a fetch event and caches the response.
 * @param {FetchEvent} event
 */
self.addEventListener("fetch", (e) => {
    if (e.request.url.includes("localhost")) return //don't cache dev.
    if (!e.request.url.includes("http")) return
    if (e.request.method !== "GET") return
    if (e.request.url.includes("service-worker.js")) return
    if (e.request.url.includes("esbuild")) return
    e.respondWith(fetchWithCache(e.request)) // including cdns, etc.
})
