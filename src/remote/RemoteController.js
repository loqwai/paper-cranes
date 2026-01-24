import { WebSocketClient } from './WebSocketClient.js'

/**
 * Initialize remote controller mode
 * Sends commands to connected displays
 */
export const initRemoteController = (onStatusChange) => {
  console.log('[Remote Controller] Initializing...')

  let connectedClients = 0

  const handleMessage = (message) => {
    // Controller receives status updates about connected clients
    if (message.type === 'status') {
      connectedClients = message.data?.connectedClients || 0
      onStatusChange?.('connected', { connectedClients })
    }
  }

  const handleStatusChange = (status) => {
    console.log('[Remote Controller] Status:', status)
    onStatusChange?.(status, { connectedClients })
  }

  const client = new WebSocketClient(handleMessage, handleStatusChange)
  client.connect()

  return {
    /**
     * Send a shader change command
     * @param {string} name - Shader name
     */
    sendShader: (name) => {
      console.log('[Remote Controller] Sending shader:', name)
      return client.send('update-params', { shader: name })
    },

    /**
     * Send arbitrary parameters
     * @param {Object} params - Key-value pairs to send
     */
    sendParams: (params) => {
      console.log('[Remote Controller] Sending params:', params)
      return client.send('update-params', params)
    },

    /**
     * Send a single knob value
     * @param {string} name - Knob name (e.g., 'knob_71')
     * @param {number} value - Value (0-1)
     */
    sendKnob: (name, value) => {
      return client.send('update-params', { [name]: parseFloat(value) })
    },

    /**
     * Get connection status
     */
    get isConnected() {
      return client.isConnected
    },

    /**
     * Get number of connected clients
     */
    get connectedClients() {
      return connectedClients
    },

    /**
     * Disconnect
     */
    disconnect: () => client.disconnect(),

    /**
     * Reconnect
     */
    reconnect: () => client.connect(),
  }
}
