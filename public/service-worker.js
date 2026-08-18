const self = /** @type {ServiceWorkerGlobalScope} */ (globalThis)
// Build: __BUILD_TIMESTAMP__
const CACHE_NAME = 'paper-cranes'

self.addEventListener("install", () => self.skipWaiting())

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
            ))
            .then(() => self.clients.claim())
    )
})

// --- Cache helpers ---

const getFromCache = async (request) => {
    const cache = await caches.open(CACHE_NAME)
    const match = await cache.match(request)
    if (match) return match

    // Try without query params
    const url = new URL(request.url)
    url.search = ''
    return cache.match(new Request(url.toString()))
}

const addToCache = async (request, response) => {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(request, response.clone())

    // Also store without query params
    const url = new URL(request.url)
    url.search = ''
    await cache.put(new Request(url.toString()), response.clone())
}

// --- Change detection ---

const didContentChange = async (request, response) => {
    // Only check same-origin resources
    if (!request.url.startsWith(self.location.origin)) return false
    const cached = await getFromCache(request)
    if (!cached) return false

    const [newText, oldText] = await Promise.all([
        response.clone().text(),
        cached.text(),
    ])
    return newText !== oldText
}

// --- Reload management (debounced to avoid multiple reloads) ---

let reloadTimer = null

const scheduleReload = () => {
    if (reloadTimer) return
    reloadTimer = setTimeout(async () => {
        reloadTimer = null
        const clients = await self.clients.matchAll()
        clients.forEach(client => client.postMessage("reload"))
    }, 1000)
}

// --- Fetch handler: stale-while-revalidate with change detection ---

const handleFetch = async (request) => {
    const cached = await getFromCache(request)

    // Start background network fetch
    fetch(request).then(async response => {
        if (!response.ok && !(response.status === 0 && response.type !== 'error')) return
        const changed = await didContentChange(request, response)
        await addToCache(request, response)
        if (changed) scheduleReload()
    }).catch(() => {})

    // Return cached version immediately if available
    if (cached) return cached

    // No cache: must wait for network
    try {
        const response = await fetch(request)
        if (response.ok || (response.status === 0 && response.type !== 'error')) {
            await addToCache(request, response)
            return response.clone()
        }
        return response
    } catch {
        return new Response('Offline - content not yet cached', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
        })
    }
}

self.addEventListener("fetch", (event) => {
    const { request } = event
    if (!request.url.startsWith('http')) return
    if (request.method !== 'GET') return
    if (request.url.includes('service-worker.js')) return
    event.respondWith(handleFetch(request))
})
