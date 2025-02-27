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
        pendingRequests.unshift({request,resolve})
        while(pendingRequests.length > 0) {
            console.log("fetchLoop", pendingRequests.length)
            try {
                const {request,resolve} = pendingRequests.shift()
                if(!request || !resolve) continue
                const response = await fetch(request)
                console.log('fetched');
                shouldReload ||= await add(request,response)
                console.log('added to cache', shouldReload);
                resolve(response)
            } catch(e) {
                pendingRequests.push({request,resolve})
                await timeout(10)
            }
        }
        console.log("before timeout")
        await timeout(10)
        console.log("fetchLoop ended", {pendingRequests, shouldReload})
        if(pendingRequests.length === 0 && shouldReload) reloadPage()
    })
}
