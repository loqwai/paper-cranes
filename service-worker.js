// Note: CACHE_NAME is injected by esbuild as "cranes-cache-v10"

self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => self.clients.claim());

async function fetchWithRetry(request) {
    while (true) {
        console.log(`fetching with retry ${request.url}`);
        try {
            const response = await fetch(request);
            console.log(`${request.url}: fetch successful`);
            if (response.ok) return response;
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.error(`${request.url}: fetch failed: ${error}`);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
}

async function fetchWithCache(request) {
    // Skip caching for esbuild
    if (request.url.includes('esbuild')) return fetch(request);

    // send the request out asap, whether it's cached or not
    console.log(`${request.url}: initiate fetch`);
    const responsePromise = fetchWithRetry(request);
    responsePromise.then( response => {
        console.log(`${request.url}: caching`);
        cache.put(request, response.clone());
    }).catch(() => {});
    // check cache
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) return cached;

    // If no cache, look through the earlier caches
    console.log(`${event.request.url}: checking old caches`);
    const cacheNames = await caches.keys().sort();
    for (const cacheName of cacheNames) {
        console.log(`${request.url}: checking cache ${cacheName}`);
        const cache = await caches.open(cacheName);
        const cached = await cache.match(request);
        console.log(`${request.url}: cache ${cacheName} ${cached ? 'hit' : 'miss'}`);
        if (cached) return cached;
    }
    // if we never find any version of the file, I guess we'll just fetch it
    console.log(`${request.url}: waiting for fetch`);
    return await responsePromise;
}

let cacheEverything = false;
self.addEventListener('fetch', (event) => {
    // if we're not a GET request, don't cache
    if (event.request.method !== 'GET') return
    const url = new URL(event.request.url);
    const cacheParam = url.searchParams.get('cache');
    if (cacheParam === 'everything' || cacheEverything) {
        console.log(`${event.request.url}: caching set to 'everything'`);
        return event.respondWith(fetchWithCache(event.request));
    }
    // if we're on localhost, don't cache
    if (url.hostname === 'localhost') {
        console.log(`${event.request.url}: not caching localhost`);
        return
    }

    // otherwise, finally, use the cache
    console.log(`${event.request.url}: cache/fetch`);
    event.respondWith(fetchWithCache(event.request));
});
