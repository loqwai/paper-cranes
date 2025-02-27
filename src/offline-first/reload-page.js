const reloadPage = async () => {
  const clients = await self.clients.matchAll()
  clients.forEach((client) => client.postMessage("reload"))
}
export default reloadPage
