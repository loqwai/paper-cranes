const startTime = performance.now();
/**
 * Logs a message with the request details and time elapsed since the service worker started.
 * @param {Request|string} request - The request object or URL string.
 * @param {string} message - The message to log.
 * @param {...any} rest - Additional parameters to log.
 */
function log(request, message, ...rest) {
    const id = request.id || 'unknown';

    const url = typeof request === 'string' ? request : request.url;
    const timeElapsed = performance.now() - startTime;
    console.log(`[${id}] ${message}`, ...rest, `[${timeElapsed.toFixed(6)}ms] ${url}`);
}

/**
 * Event listener for the 'install' event. Forces the waiting service worker to become the active service worker.
 * @param {Event} event - The install event.
 */
self.addEventListener('install', event => self.skipWaiting());

/**
 * Event listener for the 'activate' event. Claims control of all clients immediately.
 * @param {Event} event - The activate event.
 */
self.addEventListener('activate', event => self.clients.claim());

/**
 * Fetches a request with retry logic. Retries indefinitely until a successful response is received.
 * @param {Request} request - The request object.
 * @returns {Promise<Response>} - The response object.
 */
async function fetchWithRetry(request) {
    let interval = 0;
    while (true) {
        if(interval < 2000) interval += random(0,300);

        log(request, 'fetching with retry');
        try {
            const response = await fetch(request);
            log(request, 'fetch response', response);
            if (response.ok) return response;
        } catch (error) {
            log(request, `fetch failed: ${error}`);
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
    log('where am I?');
}

/**
 * Fetches a request and caches the response. Initiates the fetch immediately and caches the response once received.
 * @param {Request} request - The request object.
 * @returns {Promise<Response>} - The response object.
 */
async function fetchWithCache(request) {
    // send the request out asap, whether it's cached or not
    log(request, 'initiate fetch');
    const responsePromise = fetchWithRetry(request);

    // Create a promise that will handle the caching
    responsePromise.then(async response => {
        log(request, 'caching');
        response = response.clone()
        try {
            const cache = await caches.open(CACHE_NAME);
            log(request, 'got cache');
            await cache.put(request, response.clone());
            log(request, 'cached');
        } catch (error) {
            log(request, 'error caching', error);
        }
    }).catch(() => {});

    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        log(request, 'returning cached response');
        return cachedResponse;
    }
    log(request, 'waiting for fetch');
    return responsePromise;
}


self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => self.clients.claim());

const checkCacheParam = async () => {
    log('early return checkCacheParam');
    return false;

    const clients = await self.clients.matchAll();
    for(const client of clients) {
        const url = new URL(client.url);
        let cacheParam = url.searchParams.get('cache');
        if (cacheParam === 'everything') {
            log(client.url, 'found a client with cache param set to everything');
            return true;
        }
    }
    return false;
}
/**
 * @param {FetchEvent} event
 */
self.addEventListener('fetch', (e) => {
    self.id ??= 1
    self.id++
    if(e.request.id) {
        log(e.request, 'already has an id');
        throw new Error('already has an id');
    }
    let id = self.id.toString();
    while(id.length < 5) {
        id = '0' + id;
    }
    e.request.id = id;
    // if we're not a GET request, don't cache
    try {
    if(!e.request.url.includes('http')) {
        log(e.request, 'not a http request');
        return;
    }
    if (e.request.method !== 'GET') {
        log(e.request, 'not a GET request');
        return
    }

    const url = new URL(e.request.url);

    if (url.pathname.includes('esbuild')) {
        log(e.request, 'skipping esbuild');
        return
    }

    return e.respondWith(maybeFetchWithCache(e.request));
    } catch (error) {
        log(e.request, 'error', error);
        log(e.request, 'stack', error.stack);
    }
});

/**
 * @param {Request} request
 */
const maybeFetchWithCache = async (request) => {
    const url = new URL(request.url);


    log(request, 'url', url);
    // if the window has the cache param set to 'everything', cache everything
    log(request, 'checking if we should cache by looking at the cache param');
    const shouldCache = await checkCacheParam();
    log(request, 'should cache', shouldCache);
    if (shouldCache) {
        log(request, 'forced fetch/cache');
        return fetchWithCache(request);
    }

    log(request, 'not forcing cache');
    // if we're on localhost, don't cache
    if (url.hostname === 'localhost') {
        log(request, 'not caching localhost');
        const res = await fetch(request);
        log(request, 'returning response', res);
        return res;
    }

    // otherwise, finally, use the cache
    log(request, 'finally, cache/fetch');
    return fetchWithCache(request);
}

const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
