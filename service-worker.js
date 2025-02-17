self.addEventListener('install', event => self.skipWaiting())
self.addEventListener('activate', event => self.clients.claim())

/**
 * Fetches a request with retry logic. Retries indefinitely until a successful response is received.
 * @param {Request} request - The request object.
 * @returns {Promise<Response>} - The response object.
 */
async function fetchWithRetry(request) {
    let interval = 100
    while (true) {
        if(interval < 5000) interval *= 2

        try {
            const response = await fetch(request)
            if (response.ok) return response
        } catch (error) {
            await new Promise(resolve => setTimeout(resolve, interval))
        }
    }
}

/**
 * Fetches a request and caches the response. Initiates the fetch immediately and caches the response once received.
 * @param {Request} request - The request object.
 * @returns {Promise<Response>} - The response object.
 */
async function fetchWithCache(request) {
    // send the request out asap, whether it's cached or not
    const responsePromise = fetchWithRetry(request)

    // Create a promise that will handle the caching
    responsePromise.then(async response => {
        response = response.clone()
        try {
            const cache = await caches.open(CACHE_NAME)
            await cache.put(request, response.clone())
        } catch (error) {
            console.error(request, 'error caching', error)
        }
    }).catch(() => {})

    const cache = await caches.open(CACHE_NAME)
    const cachedResponse = await cache.match(request)
    if (cachedResponse) return cachedResponse
    return responsePromise
}

/**
 * Possibly intercepts a fetch event and caches the response.
 * Returning without calling e.respondWith() will let the default fetch behavior occur.
 * @param {FetchEvent} event
 */
self.addEventListener('fetch', (e) => {
    if(!e.request.url.includes('http')) return // it happens. about:config, etc.
    if (e.request.method !== 'GET') return

    const url = new URL(e.request.url)

    if (url.pathname.includes('esbuild')) return

    return e.respondWith(fetchAndMaybeCache(e.request))
})

/**
 * @param {Request} request
 * @returns {Promise<Response>} - The response object.
 */
const fetchAndMaybeCache = async (request) => {
    const url = new URL(request.url)

    const forceCache = false // so we can force cache locally during development
    if (forceCache) return fetchWithCache(request)

    // if we're on localhost, don't cache
    if (url.hostname === 'localhost') return fetch(request)

    return fetchWithCache(request)
}
