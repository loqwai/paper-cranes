
/** @param {Request} request */
export const offlineFirstFetch = async (request) => {
    const cache = await caches.open(VERSION)
    const cachedResponse = await cache.match(request)
    fetch(request).then((response) => addToCache({request,response,cache}))
    if(cachedResponse) return cachedResponse

    const networkResponse = await fetch(request)
    return networkResponse

}
/** @param {{request: Request, response: Response, cache: Cache}} args */
const addToCache = async ({request,response,cache}) =>{
    console.log("adding to cache", request, response)
    await cache.put(request, response.clone())
    console.log('done. response was', response)
}
