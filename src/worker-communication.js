// Add service worker registration
window.addEventListener('load', async () => {
  console.log('Registering service worker...')
  const { serviceWorker } = navigator
  if (!serviceWorker) {
      console.log('Service worker not supported')
      return
  }
  serviceWorker.addEventListener('message', processServiceWorkerMessage)
  // Add cache version to URL to force update when version changes
  const registration = await serviceWorker.register(`/service-worker.js`)
  registration.addEventListener('message', processServiceWorkerMessage)

})

/**
 * Process messages from the service worker
 * @param {MessageEvent} event
 */
const processServiceWorkerMessage = (event) => {
  console.log('Received message from service worker', event)
  if (event.data === 'reload') {
      console.log('Received reload message from service worker')
      window.stop()
      return window.location.reload()
  }
  console.log('Received strange message from service worker', event.data)
}

// Add listener for messages from parent window
window.addEventListener('message', function(event) {
  if(!window.cranes) return
  if (!event.data || event.data.type !== 'update-params') return

  // Store incoming params
  const {data } = event.data

  // Update shader code if provided
  if (data.shaderCode) window.cranes.shader = data.shaderCode

  // Store all params
  Object.entries(data).forEach(([key, value]) => {
    window.cranes.messageParams[key] = value
  })
})

// Add listener for esbuild reload events
if (process.env.LIVE_RELOAD) {
  try {
    const eventSource = new EventSource('/esbuild')
    eventSource.addEventListener('change', () => {
      console.log('Received change event from esbuild, reloading page')
      window.stop()
      window.location.reload()
    })
    eventSource.addEventListener('error', (err) => {
      console.error('Error with esbuild EventSource:', err)
    })
    console.log('Listening for esbuild live reload events')
  } catch (error) {
    console.error('Failed to set up esbuild live reload listener:', error)
  }
}
