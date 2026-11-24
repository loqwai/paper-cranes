// The only copy: Vite copies public/ into dist/ as-is, so this file is what every browser runs.
const self = /** @type {ServiceWorkerGlobalScope} */ (globalThis)
const CACHE_NAME = '2026-02-27T22:00:00.000Z'
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

self.addEventListener("install", () => {
    self.skipWaiting()
})

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim())
})

let lastReloadTime = 0
const RELOAD_COOLDOWN = 3000

const reloadAllClients = async () => {
    const now = Date.now()
    if (now - lastReloadTime < RELOAD_COOLDOWN) return
    lastReloadTime = now
    const clients = await self.clients.matchAll()
    clients.forEach((client) => client.postMessage("reload"))
}

const RETRY_BUDGET_MS = 10000

/**
 * Fetch, retrying network errors and 5xx with backoff for about 25s, then giving up.
 * A 4xx is the server's real answer (a missing shader), so it goes straight to the page:
 * retrying it only delays the error. It always settles, so a page never waits forever.
 * @param {Request} request
 * @returns {Promise<Response>}
 */
const fetchWithRetry = async (request) => {
    let interval = 150
    while (true) {
        let response
        try {
            response = await fetch(request)
            if (response.status < 500) return response
            console.warn(`Fetch failed for url ${request.url} (status: ${response.status}), retrying in ${interval}ms`)
        } catch (error) {
            if (interval > RETRY_BUDGET_MS) throw error
            console.error(`Network error for url ${request.url}, retrying in ${interval}ms...`, error)
        }
        if (interval > RETRY_BUDGET_MS) return response
        await timeout(interval)
        interval *= 2 + Math.random()
    }
}

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
    await cache.put(req, res)

    // Store version without query params
    const url = new URL(req.url)
    url.search = ''
    const cleanRequest = new Request(url.toString())
    await cache.put(cleanRequest, cleanRes)
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
 * Answers from the cache when it can and refreshes the cache from the network either way.
 * When the refresh brings new content, pages are told to reload, after the cache holds it,
 * so the reload sees the new content rather than the old copy (which would reload again).
 * @param {Request} request - The request object.
 * @returns {Promise<Response>} - The response object.
 */
async function fetchWithCache(request) {
    const networkPromise = fetchWithRetry(request).then(async (response) => {
        // Only keep real content: a 404 or 503 must never replace a good cached copy.
        if (!response.ok && response.type !== "opaque") return response
        const changed = await didThingsChange(request, response)
        await addToCache(request, response)
        if (changed) reloadAllClients()
        return response
    })

    const cached = await getFromCache(request)
    if (!cached) return networkPromise
    networkPromise.catch(() => {}) // offline with a cached copy: the copy is the answer
    return cached
}

/**
 * Possibly intercepts a fetch event and caches the response.
 * @param {FetchEvent} event
 */
self.addEventListener("fetch", (e) => {
    if (!e.request.url.includes("http")) return
    if (e.request.method !== "GET") return
    if (e.request.url.includes("service-worker.js")) return
    if (e.request.url.includes("esbuild")) return
    e.respondWith(fetchWithCache(e.request))
})
