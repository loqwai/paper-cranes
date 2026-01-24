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
        showCommandReceived()
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
  for (const [key, value] of Object.entries(data)) {
    // Skip already handled keys
    if (key === 'shader' || key === 'shaderCode' || key === 'fullscreen') continue
    window.cranes.messageParams[key] = value
  }
}

/**
 * Show a brief flash when a command is received
 */
const showCommandReceived = () => {
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
      transition: opacity 0.3s;
      opacity: 0;
    `
    document.body.appendChild(indicator)
  }

  indicator.style.backgroundColor = '#22c55e'
  indicator.style.color = 'white'
  indicator.textContent = 'Remote'
  indicator.style.opacity = '0.8'

  // Fade out after 1 second
  setTimeout(() => {
    indicator.style.opacity = '0'
  }, 1000)
}

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
