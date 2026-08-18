const SW_UPDATE_INTERVAL = 60_000

// Listen for reload messages immediately (before load event)
if (navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data === 'reload') {
      window.stop()
      window.location.reload()
    }
  })
}

window.addEventListener('load', async () => {
  const { serviceWorker } = navigator
  if (!serviceWorker) return

  const registration = await serviceWorker.register('/service-worker.js')

  // When a new SW takes control, re-fetch current page to trigger change detection
  serviceWorker.addEventListener('controllerchange', () => {
    fetch(window.location.href).catch(() => {})
  })

  // Periodic update checks when online
  const checkForUpdates = () => {
    if (!navigator.onLine) return
    registration.update().catch(() => {})
    // Also re-fetch current page to trigger SW's background change detection
    fetch(window.location.href).catch(() => {})
  }

  setInterval(checkForUpdates, SW_UPDATE_INTERVAL)

  // When coming back online, check for updates
  window.addEventListener('online', checkForUpdates)
})

export const receive = async (event) => {
  if(!window.cranes) return
  const {data, type} = event.data ?? {}
  if (!data || type !== 'update-params') {
      return
  }
  const { shader } = data
  if (shader) {
    const shaderCode = await fetch(`/shaders/${shader}.frag`, {mode: 'no-cors'}).then(res => res.text())
    window.cranes.shader = shaderCode
  }

  if (shader) window.cranes.shader = shader
  if(data.shaderCode) window.cranes.shader = data.shaderCode

  Object.entries(data).forEach(([key, value]) => {
    window.cranes.messageParams[key] = value
  })
}
window.addEventListener('message', receive)
