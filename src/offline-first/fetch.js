import addToCache from "./add-to-cache"
import reloadPage from "./reload-page"
/** @param {Request} request */
export const offlineFirstFetch = async (request) => {
    const cache = await caches.open(VERSION)
    const cachedResponse = await cache.match(request)
    const netPromise = fetch(request).then(async (response) => {
        console.log('adding to cache')
        const shouldReload = await addToCache({request,response,cache})
        if(shouldReload) reloadPage()
        return response
    })
    if(cachedResponse) return cachedResponse
    return netPromise
}
