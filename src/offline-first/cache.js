export const add = async (request,response) =>{
  const cache = caches.open(VERSION)
  await cache.put(request, response.clone())
}

export const get = async (request) => {
  const cache = await caches.open(VERSION)
  return cache.match(request)
}
