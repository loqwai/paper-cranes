// Service worker registration - Vite migration
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
let reloadTimeout = null
const RELOAD_GRACE = 5000

const processServiceWorkerMessage = (event) => {
  if (event.data === 'reload') {
      if (reloadTimeout) return
      const lastReload = parseInt(sessionStorage.getItem('sw-last-reload') || '0')
      if (Date.now() - lastReload < RELOAD_GRACE) return
      reloadTimeout = setTimeout(() => {
          sessionStorage.setItem('sw-last-reload', String(Date.now()))
          window.stop()
          window.location.reload()
      }, 100)
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
