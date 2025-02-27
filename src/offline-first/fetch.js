import {add, get} from "./cache"
import reloadPage from "./reload-page"
const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms))
/** @param {Request} request */
export const offlineFirstFetch = async (request) => {
    // add request to list of pending requests
    const netPromise = fetchLoop(request)
    const cachedResponse = await get(request)
    if(cachedResponse) return cachedResponse
    return netPromise
}

const fetchLoop = async (request) => {
    let shouldReload = false
    return new Promise(async (resolve) => {
        pendingRequests.push({request,resolve})
        while(pendingRequests.length > 0) {
            const {request,resolve} = pendingRequests.shift()
            if(!request || !resolve) continue
            const response = await fetch(request)
            shouldReload ||= await add(request,response)
            resolve(response)
        }
        await timeout(10)
        if(pendingRequests.length === 0 && shouldReload) reloadPage()
    })
}
