// Install event - cache critical resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // Add critical resources to cache during install
            return cache.addAll([
                '/', // Add your critical resources here
                '/index.html',
                // Add other critical assets
            ]);
        })
    );
    return self.skipWaiting();
});

self.addEventListener('activate', event => self.clients.claim());

/**
 * Fetches a request with retry logic. Retries indefinitely until a successful response is received.
 * @param {Request} request - The request object.
 * @returns {Promise<Response>} - The response object.
 */
async function fetchWithRetry(request) {
    let interval = 100;

    while (true) {
        try {
            const response = await fetch(request);
            if (response.ok) return response;
        } catch (error) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, interval));
            // Increase interval more slowly than exponential, cap at 5000ms
            interval = Math.min(interval * 1.5, 5000);
        }
    }
}

/**
 * Fetches a request and caches the response. Initiates the fetch immediately and caches the response once received.
 * @param {Request} request - The request object.
 * @returns {Promise<Response>} - The response object.
 */
async function fetchWithCache(request) {
    // Try cache first
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    // Start network request in background
    const networkPromise = fetchWithRetry(request).then(networkResponse => {
        // Cache the new response
        cache.put(request, networkResponse.clone());
        return networkResponse;
    }).catch(error => {
        console.warn('Network request failed, using cache', error);
        return null;
    });

    // Return cached response immediately if we have it
    if (cachedResponse) return cachedResponse;

    // If no cache, wait for network
    const networkResponse = await networkPromise;
    if (networkResponse) return networkResponse;

    // If both cache and network fail, return error
    throw new Error('No cached or network response available');
}

/**
 * Possibly intercepts a fetch event and caches the response.
 * Returning without calling e.respondWith() will let the default fetch behavior occur.
 * @param {FetchEvent} event
 */
self.addEventListener('fetch', (e) => {
    if(!e.request.url.includes('http')) return;
    if (e.request.method !== 'GET') return;

    const url = new URL(e.request.url);
    if (url.pathname.includes('esbuild')) return;

    e.respondWith(fetchAndMaybeCache(e.request));
});

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
