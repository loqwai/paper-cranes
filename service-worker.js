const self = /** @type {ServiceWorkerGlobalScope} */ (globalThis)
const CACHE_NAME = '2025-04-03T06:39:26.341Z'
//console.debug(`Service worker starting`)
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

self.addEventListener("install", (event) => {
    //console.debug("Service Worker: Installing...")
    self.skipWaiting()
})


self.addEventListener("activate", (event) => {
    //console.debug("Service Worker: Activated")

    event.waitUntil(self.clients.claim().then(() => {
        //console.debug("Service Worker: Claimed clients")
    }))
})


self.addEventListener("message", (event) => {
    //console.debug("Service Worker: Message", event)
    if(event.data.type === "network-changed") retryDeadRequests()
})

const reloadAllClients = async () => {
    //console.debug("Reloading all clients")
    contentChanged = false
    const clients = await self.clients.matchAll()
    clients.forEach((client) => client.postMessage("reload"))
    //console.debug("Reloaded", clients.length, "clients")
}


let requestsToRetry = []
let deadRequests = []

/**
 * @param {Request | undefined} request - The request object.
 */
async function fetchWithRetry(request) {
    let interval = 150 // Start with 150ms delay

    return new Promise(async (resolve, reject) => {
        if(request) {
            const retryData = {request, resolve, reject}
            requestsToRetry.push(retryData) // the first time, do this request first.
        }
        while (true) {
            if(requestsToRetry.length === 0) {
                if(contentChanged) reloadAllClients()
                return
            }

            const retryItem = requestsToRetry.pop()
            if(!retryItem?.request) return console.error("No request to retry")

            try {
                const response = await fetch(retryItem.request)
                if(requestsToRetry.length > 0) fetchWithRetry()
                if (response.ok) return retryItem.resolve(response)
                if (response.status === 0 && response.type !== "error") return retryItem.resolve(response)

                console.warn(
                    `Fetch failed for url ${retryItem.request.url} (status: ${response.status}). Added to retry queue.`
                )
            } catch (error) {
                console.error(`Network error for url ${retryItem.request.url}, retrying in ${interval}ms...`, error)
            }

            if (interval > 10000) {
                //console.debug("Adding to dead requests", retryItem.request.url, retryItem.timesDead)
                deadRequests.push(retryItem)
                return
            }

            requestsToRetry.unshift(retryItem)
            await timeout(interval)
            //console.debug(`Back from sleeping when trying to fetch ${retryItem.request.url}. There are ${requestsToRetry.length} requests to retry`)
            const jitter = Math.random()
            interval *= (2 + jitter)
        }
    })
}

// restart the fetchWithRetry loop every 10 seconds
setInterval(fetchWithRetry, 10000)

const retryDeadRequests = () => {
    //console.debug("Retrying dead requests", deadRequests.length)

    // increase dead count
    deadRequests.forEach(item => item.timesDead = (item.timesDead ?? 0) + 1)

    // filter out requests that have been retried too many times
    deadRequests = deadRequests.filter(item => (item.timesDead ?? 0) < 3)
    // filter out duplicate requests
    const seenUrls = new Set()
    deadRequests = deadRequests.filter((item) => {
        if (seenUrls.has(item.request.url)) return false
        seenUrls.add(item.request.url)
        return true
    })


    // requestsToRetry.push(...deadRequests)
    while (deadRequests.length > 0) {
        requestsToRetry.push(deadRequests.pop())
        fetchWithRetry()
    }

    //console.debug('total requests to retry', requestsToRetry.length)
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
    const cleanRequest = new Request(url.toString())
    return (await cache.match(cleanRequest))?.clone()
}
/**
 * Adds a request to the cache, storing both with and without query params
 * @param {Request} req - The request to cache
 * @param {Response} res - The response to cache
 * @returns {Promise<void>}
 */
const addToCache = async (req, res) => {

    res = res.clone()
    const cleanRes = res.clone()
    const cache = await caches.open(CACHE_NAME)

    // Store original request
    await cache.put(req,res)

    // Store version without query params
    const url = new URL(req.url)
    url.search = ''
    const cleanRequest = new Request(url.toString())
    //console.debug("Adding to cache", cleanRequest.url)
    await cache.put(cleanRequest,cleanRes)
}

const didThingsChange = async (request, response) => {
    const safeResponse = response.clone()
    const cached = await getFromCache(request)
    // if the url is outside of our domain, don't check for changes
    // I don't know what's causing the frequent reloads, but I'm guessing there's a timestamp or something on an external request.
    if (!request.url.includes(location.origin)) return false
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
        if (await didThingsChange(request, response)) {
            contentChanged = true
            // Trigger reload right away when changes are detected
            reloadAllClients()
        }
        await addToCache(request, response)
        return response
    })

    return (await getFromCache(request)) ?? networkPromise
}

/**
 * Possibly intercepts a fetch event and caches the response.
 * @param {FetchEvent} event
 */
self.addEventListener("fetch", (e) => {
    //console.debug("Fetch event", e.request.url)
    if (!e.request.url.includes("http")) return
    // if (e.request.url.includes("localhost")) return
    if (e.request.method !== "GET") return
    if (e.request.url.includes("service-worker.js")) return
    if (e.request.url.includes("esbuild")) return
    // if the url is not in our domain, continue
    // if (!e.request.url.includes(location.origin)) return // actually I want to get and cache monaco.
    e.respondWith(fetchWithCache(e.request))
})
