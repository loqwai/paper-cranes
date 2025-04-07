// Add service worker registration
window.addEventListener('load', async () => {
  const { serviceWorker } = navigator
  if (!serviceWorker) {
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
  if (event.data === 'reload') {
      window.stop()
      return window.location.reload()
  }
}

export const receive = async (event) => {
  if(!window.cranes) return
  const {data, type} = event.data ?? {}
  if (!data || type !== 'update-params') {
      // console.log('Ignoring message: Invalid structure or type not update-params', event.data)
      return
  }
  const { shader } = data
  if (shader) {
    // get the shader code
    const shaderCode = await fetch(`/shaders/${shader}.frag`, {mode: 'no-cors'}).then(res => res.text())
    // update the shader code
    window.cranes.shader = shaderCode
  }

  // Update shader code if provided
  if (shader) window.cranes.shader = shader
  if(data.shaderCode) window.cranes.shader = data.shaderCode

  // Store all params
  Object.entries(data).forEach(([key, value]) => {
    window.cranes.messageParams[key] = value
  })
}
// Add listener for messages from parent window
window.addEventListener('message', receive)

// Add listener for esbuild reload events
if (process.env.LIVE_RELOAD) {
  try {
    const eventSource = new EventSource('/esbuild')
    eventSource.addEventListener('change', () => {
      window.stop()
      window.location.reload()
    })
    eventSource.addEventListener('error', (err) => {
      console.error('Error with esbuild EventSource:', err)
    })
  } catch (error) {
    console.error('Failed to set up esbuild live reload listener:', error)
  }
}
