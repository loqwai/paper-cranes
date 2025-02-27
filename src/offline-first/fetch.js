import addToCache from "./add-to-cache"
/** @param {Request} request */
export const offlineFirstFetch = async (request) => {
    const clients = await self.clients.matchAll()
    clients.forEach((client) => client.postMessage("reload"))

    const cache = await caches.open(VERSION)
    const cachedResponse = await cache.match(request)
    fetch(request).then((response) => addToCache({request,response,cache}))
    if(cachedResponse) return cachedResponse

    const networkResponse = await fetch(request)
    return networkResponse

}
