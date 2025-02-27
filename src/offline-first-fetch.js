
/** @param {Request} request */
export const offlineFirstFetch = async (request) => {
    const cache = await caches.open(VERSION)
    const cachedResponse = await cache.match(request)
    return cachedResponse

}
