import { WebSocketClient } from './WebSocketClient.js'
import { loadShader } from '../shaderLoader.js'
import { inspectorAllowedOn, withoutPinned, displaySecretFrom, secretFor } from './relay.js'
import { nfcFlash } from '../vj/nfc-flash.js'

// The VJ MCP (docs/vj-mcp.md) reaches this display through a broker: the dev server's /ws, or on
// `?room=` the relay Worker's room, which drops any `inspect` a client sends. The inspector loads
// only where that broker is one we run (relay.js: a dev build with no room, or a room on
// relay.beadfamous.com or a loopback relay); a `?relay=` link to any other host relays as before
// but never answers inspect. Even where it loads, the inspector answers nothing until the broker
// itself has welcomed it (inspect.js), so a page on a relay that predates the broker does not
// answer a forged inspect (deploy the relay first).
//
// The socket's host is fixed at page load (WebSocketClient) and update-params can never set relay
// or room (withoutPinned). As a second layer, the host is judged again on the socket actually
// open, on every connect and on every welcome and inspect, not once at load.
const dev = import.meta.env.DEV
let inspector = null

/**
 * Initialize remote display mode
 * Receives commands from controller and applies them to the visualizer
 */
export const initRemoteDisplay = () => {
  console.log('[Remote Display] Initializing...')

  // Read when a message or connect arrives, so it always judges the socket that is open now.
  const onTrustedSocket = () => inspectorAllowedOn(client.socket?.url, { dev })
  // The room's display secret is read once, from the link the page loaded with, like relay and
  // room (relay.js PINNED): a later hash edit or update-params can neither change nor read it.
  const displaySecret = displaySecretFrom(window.location)

  const handleMessage = (message) => {
    if (message.type !== 'audio-features') console.log('[Remote Display] Received:', message.type, message.data)

    switch (message.type) {
      case 'update-params':
        applyParams(message.data)
        break

      case 'audio-features':
        break

      case 'inspect':
        if (onTrustedSocket()) inspector?.handle(message.data)
        break

      case 'display-rekey':
        inspector?.rekey()
        break

      case 'display-welcome':
        if (onTrustedSocket()) inspector?.welcome(message.data)
        break

      case 'display-refused':
        if (onTrustedSocket()) inspector?.refused(message.data)
        break

      case 'status':
        // Connection status updates
        console.log('[Remote Display] Connected clients:', message.data?.connectedClients)
        break

      default:
        // Forward unknown messages via postMessage for extensibility
        window.postMessage(message, '*')
    }
    // After the apply, never before it (CLAUDE.md hot-path rule): a sticker's own params land first.
    nfcFlash(message)
  }

  const handleStatusChange = (status) => {
    console.log('[Remote Display] Status:', status)
    if (status === 'connected' && onTrustedSocket()) inspector?.hello()
    else inspector?.unwelcome()
    // Show the badge only for connection problems, but once one is up, a reconnect must clear it:
    // skipping 'connected' left "Reconnecting..." lit on the wall after every drop.
    if (status !== 'connected' || document.getElementById('remote-status-indicator')) {
      updateStatusIndicator(status)
    }
  }

  const client = new WebSocketClient(handleMessage, handleStatusChange)
  if (inspectorAllowedOn(client.url, { dev })) {
    import('./inspect.js')
      .then(({ createInspector }) => {
        inspector = createInspector((type, data) => client.send(type, data), {
          secret: () => secretFor(client.socket?.url, displaySecret),
        })
        if (client.isConnected && onTrustedSocket()) inspector.hello()
      })
      .catch((e) => console.warn('[Remote Display] inspect unavailable:', e))
  }
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
const applyParams = async (incoming) => {
  if (!incoming || typeof incoming !== 'object') return
  // A room peer chooses these, so never relay, room, controller or any other boot-time key
  // (relay.js PINNED): what the socket and the next reload load is fixed at page load.
  const data = withoutPinned(incoming)

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

  // Shader switching by path (list page, VJ MCP set_shader) goes last, so the knobs in the same
  // message never wait on a fetch (the hot-path rule above).
  if (data.shader) await switchShader(data.shader)
}

// Switches run one at a time and only the newest one loads. Run concurrently, two quick picks
// raced: when the first fetch was slower (a first Vite transform), it landed second and the
// display ended on the shader that was NOT picked last.
let shaderLoads = Promise.resolve()
let latestShader = 0
const switchShader = (name) => {
  const mine = ++latestShader
  console.log('[Remote Display] Switching shader to:', name)
  shaderLoads = shaderLoads.then(async () => {
    if (mine !== latestShader) return
    try {
      await loadShader(name, { updateUrl: true })
      inspector?.hello() // the broker's display list shows the shader on screen
    } catch (e) {
      console.error('[Remote Display] Failed to load shader:', e)
    }
  })
  return shaderLoads
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
