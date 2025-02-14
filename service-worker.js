// Note: CACHE_NAME is injected by esbuild as "cranes-cache-v10"

const startTime = performance.now();

function log(request, message, ...rest) {
    const id = request.id || 'unknown';

    const url = typeof request === 'string' ? request : request.url;
    const timeElapsed = performance.now() - startTime;
    console.log(`[${id}] [${timeElapsed.toFixed(6)}ms] ${url}: ${message}`, ...rest);
}

self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => self.clients.claim());

async function fetchWithRetry(request) {
    while (true) {
        log(request, 'fetching with retry');
        try {
            const response = await fetch(request);
            log(request, 'fetch response', response);
            if (response.ok) return response;
        } catch (error) {
            log(request, `fetch failed: ${error}`);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    log('where am I?');
}

async function fetchWithCache(request) {
    // send the request out asap, whether it's cached or not
    log(request, 'initiate fetch');
    const responsePromise = fetchWithRetry(request);

    responsePromise.then(async response => {
        log(request, 'caching');
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
        log(request, 'cached');
    }).catch(() => {});
    // check cache
    log(request, 'checking old caches');
    const cacheNames = await caches.keys()
    log(request, 'cache names', cacheNames);
    for (const cacheName of cacheNames) {
        log(request, `checking cache ${cacheName}`);
        const cache = await caches.open(cacheName);
        const cached = await cache.match(request);
        if (cached) {
            log(request, 'returning cached response');
            return cached;
        }
        log(request, 'no cached response');
    }
    // if we never find any version of the file, I guess we'll just fetch it
    log(request, 'waiting for fetch');
    return await responsePromise;
}
const checkCacheParam = async () => {
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
self.addEventListener('fetch', async (event) => {
    self.id ??= 1
    self.id++
    event.request.id = self.id.toFixed(2)
    // if we're not a GET request, don't cache
    try {
    if(!event.request.url.includes('http')) {
        log(event.request, 'not a http request');
        return;
    }
    if (event.request.method !== 'GET') {
        log(event.request, 'not a GET request');
        return
    }

    log(event.request, 'checking if we should cache');
    const url = new URL(event.request.url);

    log(event.request, 'url', url);
    if (url.pathname.includes('esbuild')) {
        log(event.request, 'skipping esbuild');
        return
    }

    // if the window has the cache param set to 'everything', cache everything
    const shouldCache = await checkCacheParam();
    log(event.request, 'should cache', shouldCache);
    if (shouldCache) {
        log(event.request, 'forced fetch/cache');
        event.respondWith(fetchWithCache(event.request));
        return
    }
    log(event.request, 'not forcing cache');
    // if we're on localhost, don't cache
    if (url.hostname === 'localhost') {
        log(event.request, 'not caching localhost');
        return
    }

    // otherwise, finally, use the cache
    log(event.request, 'finally, cache/fetch');
    event.respondWith(fetchWithCache(event.request));
    } catch (error) {
        log(event.request, 'error', error);
        log(event.request, 'stack', error.stack);
    }
});
