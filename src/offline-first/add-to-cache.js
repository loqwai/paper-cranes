const addToCache = async ({request,response,cache}) =>{
  const cachedResponse = await cache.match(request)
  await cache.put(request, response.clone())
}
export default addToCache
