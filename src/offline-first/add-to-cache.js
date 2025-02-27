const addToCache = async ({request,response,cache}) =>{
  console.log("adding to cache", request, response)
  await cache.put(request, response.clone())
  console.log('done. response was', response)
}

/** @param {{request: Request, response: Response, cache: Cache}} args */
export default addToCache
