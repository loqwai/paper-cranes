import { wsUrlFor } from './relay.js'

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
    // The socket URL (the relay for a `room`, else the dev server; relay.js) is read once, here,
    // and every reconnect reuses it. Reading location on each connect let a room peer move the
    // page: update-params {relay} reached the URL mirror, and the next reconnect followed it.
    this.url = wsUrlFor(window.location)
  }

  connect() {
    // CONNECTING counts too: a second socket here gets every broadcast twice, and on close each
    // one schedules its own reconnect, so the duplicates multiply.
    if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return

    this.isIntentionallyClosed = false
    clearTimeout(this.reconnectTimer)

    const wsUrl = this.url
    console.log('[Remote] Connecting to', wsUrl)

    try {
      this.socket = new WebSocket(wsUrl)
    } catch (e) {
      console.error('[Remote] WebSocket creation failed:', e)
      this.scheduleReconnect()
      return
    }

    // Events from a socket this client has already replaced (disconnect then connect: the old
    // close lands after the new connect) must not reconnect or report status.
    const socket = this.socket
    const current = () => this.socket === socket

    this.socket.onopen = () => {
      if (!current()) return
      console.log('[Remote] Connected')
      this.reconnectDelay = 1000 // Reset reconnect delay on success
      this.onStatusChange?.('connected')
    }

    this.socket.onmessage = (e) => {
      if (!current()) return
      try {
        const data = JSON.parse(e.data)
        this.onMessage?.(data)
      } catch (err) {
        console.error('[Remote] Invalid message:', err)
      }
    }

    this.socket.onclose = (e) => {
      if (!current()) return
      console.log('[Remote] Disconnected', e.code, e.reason)
      this.onStatusChange?.('disconnected')

      if (!this.isIntentionallyClosed) {
        this.scheduleReconnect()
      }
    }

    this.socket.onerror = (err) => {
      if (!current()) return
      console.error('[Remote] Error:', err)
      this.onStatusChange?.('error')
    }
  }

  scheduleReconnect() {
    if (this.isIntentionallyClosed) return

    this.onStatusChange?.('reconnecting')
    console.log(`[Remote] Reconnecting in ${this.reconnectDelay}ms...`)

    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      if (!this.isIntentionallyClosed) {
        this.connect()
      }
    }, this.reconnectDelay)

    // Exponential backoff with max cap
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
  }

  // `extra` adds envelope fields beside type and data, e.g. { via: 'nfc' } (docs/nfc-show-controls.md).
  send(type, data, extra) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn('[Remote] Cannot send - not connected')
      return false
    }

    try {
      this.socket.send(JSON.stringify({ ...extra, type, data }))
      return true
    } catch (e) {
      console.error('[Remote] Send failed:', e)
      return false
    }
  }

  disconnect() {
    this.isIntentionallyClosed = true
    clearTimeout(this.reconnectTimer)
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  get isConnected() {
    return this.socket?.readyState === WebSocket.OPEN
  }
}
