import addToCache from "./add-to-cache"
import reloadPage from "./reload-page"
/** @param {Request} request */
export const offlineFirstFetch = async (request) => {
    const cache = await caches.open(VERSION)
    const cachedResponse = await cache.match(request)
    fetch(request).then(async (response) => {
        const shouldReload = await addToCache({request,response,cache})
        if(shouldReload) reloadPage()
    })
    if(cachedResponse) return cachedResponse

    const networkResponse = await fetch(request)
    return networkResponse

}
