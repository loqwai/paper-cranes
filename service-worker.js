const self = /** @type {ServiceWorkerGlobalScope} */ (globalThis)

console.log(`Service worker ${CACHE_NAME} starting`)
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

self.addEventListener("install", (event) => {
    console.log("Service Worker: Installing...");
    event.waitUntil(self.skipWaiting());
});


self.addEventListener("activate", (event) => {
    console.log("Service Worker: Activated");
    event.waitUntil(self.clients.claim().then(() => {
        console.log("Service Worker: Claimed clients");
    }));
});


self.addEventListener("message", (event) => {
    console.log("Service Worker: Message", event)
    if(event.data.type === "network-changed") retryDeadRequests()
})

const reloadAllClients = async () => {
    console.log("Reloading all clients")
    contentChanged = false
    const clients = await self.clients.matchAll()
    clients.forEach((client) => client.postMessage("reload"))
    console.log("Reloaded", clients.length, "clients")
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
                console.log("Adding to dead requests", retryItem.request.url, retryItem.timesDead)
                deadRequests.push(retryItem)
                return
            }

            requestsToRetry.unshift(retryItem)
            await timeout(interval)
            console.log(`Back from sleeping when trying to fetch ${retryItem.request.url}. There are ${requestsToRetry.length} requests to retry`)
            const jitter = Math.random()
            interval *= (1.5 + jitter)
        }
    })
}

// restart the fetchWithRetry loop every 10 seconds
setInterval(fetchWithRetry, 10000)

const retryDeadRequests = () => {
    console.log("Retrying dead requests", deadRequests.length)

    // increase dead count
    deadRequests.forEach(item => item.timesDead = (item.timesDead ?? 0) + 1)

    // filter out requests that have been retried too many times
    deadRequests = deadRequests.filter(item => (item.timesDead ?? 0) < 10)
    // filter out duplicate requests
    const seenUrls = new Set()
    deadRequests = deadRequests.filter((item) => {
        if (seenUrls.has(item.request.url)) return false
        seenUrls.add(item.request.url)
        return true
    })

    // shuffle deadRequests
    deadRequests = deadRequests.sort(() => Math.random() - 0.5)

    requestsToRetry.push(...deadRequests)
    deadRequests = []

    console.log('total requests to retry', requestsToRetry.length)
    fetchWithRetry()
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
        return networkClone
    })
    const found = await cache.match(request)
    if(found) return found
    return networkPromise
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
