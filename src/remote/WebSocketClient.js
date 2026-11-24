import { wsUrlFor } from './relay.js'

/**
 * Get the WebSocket URL for remote control: the Cloudflare relay when a `room` param is
 * present, otherwise the local dev server. See relay.js.
 */
const getWsUrl = () => wsUrlFor(window.location)

/**
 * Robust WebSocket client with auto-reconnect
 */
export class WebSocketClient {
  constructor(onMessage, onStatusChange) {
    this.onMessage = onMessage
    this.onStatusChange = onStatusChange
    this.reconnectDelay = 1000
    this.maxReconnectDelay = 30000
    this.socket = null
    this.isIntentionallyClosed = false
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return

    this.isIntentionallyClosed = false

    const wsUrl = getWsUrl()
    console.log('[Remote] Connecting to', wsUrl)

    try {
      this.socket = new WebSocket(wsUrl)
    } catch (e) {
      console.error('[Remote] WebSocket creation failed:', e)
      this.scheduleReconnect()
      return
    }

    this.socket.onopen = () => {
      console.log('[Remote] Connected')
      this.reconnectDelay = 1000 // Reset reconnect delay on success
      this.onStatusChange?.('connected')
    }

    this.socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        this.onMessage?.(data)
      } catch (err) {
        console.error('[Remote] Invalid message:', err)
      }
    }

    this.socket.onclose = (e) => {
      console.log('[Remote] Disconnected', e.code, e.reason)
      this.onStatusChange?.('disconnected')

      if (!this.isIntentionallyClosed) {
        this.scheduleReconnect()
      }
    }

    this.socket.onerror = (err) => {
      console.error('[Remote] Error:', err)
      this.onStatusChange?.('error')
    }
  }

  scheduleReconnect() {
    if (this.isIntentionallyClosed) return

    this.onStatusChange?.('reconnecting')
    console.log(`[Remote] Reconnecting in ${this.reconnectDelay}ms...`)

    setTimeout(() => {
      if (!this.isIntentionallyClosed) {
        this.connect()
      }
    }, this.reconnectDelay)

    // Exponential backoff with max cap
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
  }

  send(type, data) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn('[Remote] Cannot send - not connected')
      return false
    }

    try {
      this.socket.send(JSON.stringify({ type, data }))
      return true
    } catch (e) {
      console.error('[Remote] Send failed:', e)
      return false
    }
  }

  disconnect() {
    this.isIntentionallyClosed = true
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  get isConnected() {
    return this.socket?.readyState === WebSocket.OPEN
  }
}
