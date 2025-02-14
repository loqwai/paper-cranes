// Note: CACHE_NAME is injected by esbuild as "cranes-cache-v10"

const startTime = performance.now();

function log(request, message) {
    const url = typeof request === 'string' ? request : request.url;
    const timeElapsed = performance.now() - startTime;
    console.log(`[${timeElapsed.toFixed(6)}ms] ${url}: ${message}`);
}

self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => self.clients.claim());

async function fetchWithRetry(request) {
    while (true) {
        log(request, 'fetching with retry');
        try {
            const response = await fetch(request);
            log(request, 'fetch successful');
            if (response.ok) return response;
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            log(request, `fetch failed: ${error}`);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
}

async function fetchWithCache(request) {
    // Skip caching for esbuild
    if (request.url.includes('esbuild')) return fetch(request);

    // send the request out asap, whether it's cached or not
    log(request, 'initiate fetch');
    const responsePromise = fetchWithRetry(request);
    responsePromise.then(response => {
        log(request, 'caching');
        cache.put(request, response.clone());
    }).catch(() => {});
    // check cache
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) return cached;

    // If no cache, look through the earlier caches
    log(request, 'checking old caches');
    const cacheNames = await caches.keys().sort();
    for (const cacheName of cacheNames) {
        log(request, `checking cache ${cacheName}`);
        const cache = await caches.open(cacheName);
        const cached = await cache.match(request);
        log(request, `cache ${cacheName} ${cached ? 'hit' : 'miss'}`);
        if (cached) return cached;
    }
    // if we never find any version of the file, I guess we'll just fetch it
    log(request, 'waiting for fetch');
    return await responsePromise;
}

let cacheEverything = false;
self.addEventListener('fetch', (event) => {
    // if we're not a GET request, don't cache
    if (event.request.method !== 'GET') return
    const url = new URL(event.request.url);
    const cacheParam = url.searchParams.get('cache');
    log(event.request, `caching set to ${cacheParam}`);
    if (cacheParam === 'everything' || cacheEverything) {
        log(event.request, "caching set to 'everything'");
        return event.respondWith(fetchWithCache(event.request));
    }
    // if we're on localhost, don't cache
    if (url.hostname === 'localhost') {
        log(event.request, 'not caching localhost');
        return
    }

    // otherwise, finally, use the cache
    log(event.request, 'cache/fetch');
    event.respondWith(fetchWithCache(event.request));
});
