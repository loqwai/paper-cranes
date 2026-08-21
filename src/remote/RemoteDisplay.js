import { WebSocketClient } from './WebSocketClient.js'
import { loadShader } from '../shaderLoader.js'

/**
 * Initialize remote display mode
 * Receives commands from controller and applies them to the visualizer
 */
export const initRemoteDisplay = () => {
  console.log('[Remote Display] Initializing...')

  const handleMessage = (message) => {
    console.log('[Remote Display] Received:', message.type, message.data)

    switch (message.type) {
      case 'update-params':
        applyParams(message.data)
        break

      case 'status':
        // Connection status updates
        console.log('[Remote Display] Connected clients:', message.data?.connectedClients)
        break

      default:
        // Forward unknown messages via postMessage for extensibility
        window.postMessage(message, '*')
    }
  }

  const handleStatusChange = (status) => {
    console.log('[Remote Display] Status:', status)
    // Only show indicator for connection problems
    if (status !== 'connected') {
      updateStatusIndicator(status)
    }
  }

  const client = new WebSocketClient(handleMessage, handleStatusChange)
  client.connect()

  // Expose client for debugging
  window.cranes = window.cranes || {}
  window.cranes.remoteClient = client

  return client
}

// NOTE (2026-08-19): params are applied SYNCHRONOUSLY on arrival, deliberately. An earlier pass
// coalesced inbound messages to one apply per requestAnimationFrame; that was wrong. This is the
// knob -> uniform hot path, and deferring it to a rAF callback costs up to a full frame (~16 ms)
// whenever the renderer's rAF is queued ahead of the coalescing one — added lag on a control
// surface someone is playing in time with music. It also solved nothing: the per-message cost was
// never this loop (a few keys and a parseFloat), it was the URL re-serialisation and the DOM
// churn, both of which are handled below without touching latency. Keep this path immediate.
/**
 * Apply received parameters to the visualizer
 */
const applyParams = async (data) => {
  if (!data || typeof data !== 'object') return

  // Ensure cranes state exists
  window.cranes = window.cranes || {}
  window.cranes.messageParams = window.cranes.messageParams || {}

  // Handle raw shader code (from edit page remote mode)
  if (data.shaderCode) {
    console.log('[Remote Display] Received shader code update')
    window.cranes.shader = data.shaderCode

    // Check for fullscreen metadata in the shader code
    const fullscreen = data.shaderCode.includes('@fullscreen: true')
    const canvas = document.getElementById('visualizer')
    if (canvas) {
      canvas.classList.toggle('fullscreen', fullscreen)
    }
  }

  // Handle shader switching by path (from list page remote mode)
  if (data.shader) {
    console.log('[Remote Display] Switching shader to:', data.shader)
    try {
      await loadShader(data.shader, { updateUrl: true })
    } catch (e) {
      console.error('[Remote Display] Failed to load shader:', e)
    }
  }

  // Handle fullscreen param explicitly (overrides metadata-based fullscreen)
  if (data.fullscreen !== undefined) {
    const canvas = document.getElementById('visualizer')
    if (canvas) {
      canvas.classList.toggle('fullscreen', data.fullscreen === true || data.fullscreen === 'true')
    }
  }

  // Apply all other params to messageParams (highest precedence)
  // Parse numeric strings to floats so they work as shader uniforms
  for (const [key, value] of Object.entries(data)) {
    if (key === 'shader' || key === 'shaderCode' || key === 'fullscreen') continue
    // null = RELEASE this param. messageParams has the highest precedence in
    // getCranesState(), so a key left here would pin the uniform forever and the
    // controller/audio pipeline could never move it again. Deleting hands it back.
    if (value === null) {
      delete window.cranes.messageParams[key]
      continue
    }
    const num = parseFloat(value)
    window.cranes.messageParams[key] = !isNaN(num) ? num : value
  }

  // Mirror non-shaderCode params into the URL so a refresh preserves display state
  syncParamsToUrl(data)
}

// PERF (2026-08-19): this used to run on EVERY update-params message. vjpad coalesces to one
// send per animation frame, so that is up to 60/second — each one parsing and re-serialising a
// ~700-char URL carrying 30+ knobs and then touching session history, synchronously on the
// render thread. That was enough to visibly stutter the visual while a fader was moving.
// The URL mirror exists only so a REFRESH preserves display state, so it does not need to be
// synchronous with the knob stream: coalesce and write on a trailing edge.
let urlPending = null
let urlTimer = null
const URL_SYNC_MS = 750

const flushParamsToUrl = () => {
  urlTimer = null
  const data = urlPending
  urlPending = null
  if (!data) return
  try {
    const url = new URL(window.location.href)
    for (const [key, value] of Object.entries(data)) {
      if (key === 'shaderCode') continue
      if (value === null || value === undefined) {
        url.searchParams.delete(key)
      } else {
        url.searchParams.set(key, value)
      }
    }
    window.history.replaceState({}, '', url.toString())
  } catch (e) {
    console.warn('[Remote Display] URL sync failed:', e)
  }
}

const syncParamsToUrl = (data) => {
  urlPending = urlPending ? { ...urlPending, ...data } : { ...data }
  if (!urlTimer) urlTimer = setTimeout(flushParamsToUrl, URL_SYNC_MS)
}

// A refresh/close must not lose the last few hundred ms of knob movement.
window.addEventListener('pagehide', flushParamsToUrl)

/**
 * Create/update a visual status indicator
 */
const updateStatusIndicator = (status) => {
  let indicator = document.getElementById('remote-status-indicator')

  if (!indicator) {
    indicator = document.createElement('div')
    indicator.id = 'remote-status-indicator'
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 6px 12px;
      border-radius: 4px;
      font-family: system-ui, sans-serif;
      font-size: 12px;
      z-index: 10000;
      pointer-events: none;
      transition: opacity 0.3s, background-color 0.3s;
    `
    document.body.appendChild(indicator)
  }

  const statusConfig = {
    connected: { bg: '#22c55e', text: 'Remote', opacity: 0.8 },
    disconnected: { bg: '#ef4444', text: 'Disconnected', opacity: 1 },
    reconnecting: { bg: '#eab308', text: 'Reconnecting...', opacity: 1 },
    error: { bg: '#ef4444', text: 'Error', opacity: 1 },
  }

  const config = statusConfig[status] || statusConfig.disconnected
  indicator.style.backgroundColor = config.bg
  indicator.style.color = 'white'
  indicator.style.opacity = config.opacity
  indicator.textContent = config.text

  // Fade out connected indicator after 3 seconds
  if (status === 'connected') {
    setTimeout(() => {
      if (indicator.textContent === 'Remote') {
        indicator.style.opacity = 0.3
      }
    }, 3000)
  }
}
