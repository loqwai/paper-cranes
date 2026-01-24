import debounce from 'debounce'
import { initRemoteController } from '../remote/RemoteController.js'

/**
 * ParamsManager - Single source of truth for all shader parameters
 *
 * Unifies:
 * - URL query params (bidirectional sync)
 * - Manual features (knobs, sliders)
 * - Remote control (sends to connected displays)
 * - Shader code updates
 *
 * Usage:
 *   const params = createParamsManager({ syncToUrl: true, remoteMode: true })
 *   params.set('knob_71', 0.5)
 *   params.setShader(shaderCode)
 *   params.getAll() // returns all params
 */

export const createParamsManager = (options = {}) => {
  const {
    syncToUrl = true,
    remoteMode = false,
    onRemoteStatusChange = null,
    urlSyncDelay = 50,
    remoteSyncDelay = 16, // ~60fps for smooth remote updates
  } = options

  // Internal state
  const params = {}
  let shaderCode = null
  let remoteController = null
  const listeners = new Set()

  // Initialize from URL
  const initFromUrl = () => {
    const searchParams = new URLSearchParams(window.location.search)
    searchParams.forEach((value, key) => {
      // Parse numeric values
      const numValue = parseFloat(value)
      params[key] = isNaN(numValue) ? value : numValue
    })
  }

  // URL sync (debounced)
  const syncToUrlDebounced = debounce((changedParams) => {
    if (!syncToUrl) return

    const url = new URL(window.location)
    for (const [key, value] of Object.entries(changedParams)) {
      if (value === null || value === undefined) {
        url.searchParams.delete(key)
      } else {
        url.searchParams.set(key, value)
      }
    }
    window.history.replaceState({}, '', url.toString())
  }, urlSyncDelay)

  // Remote sync (debounced, faster for smooth updates)
  const syncToRemoteDebounced = debounce((data) => {
    if (!remoteController?.isConnected) return
    remoteController.sendParams(data)
  }, remoteSyncDelay)

  // Initialize remote controller if in remote mode
  if (remoteMode) {
    remoteController = initRemoteController((status, info) => {
      console.log('[ParamsManager] Remote status:', status, info)
      onRemoteStatusChange?.(status, info)
    })
  }

  // Notify listeners
  const notifyListeners = (changedParams) => {
    for (const listener of listeners) {
      try {
        listener(changedParams, params)
      } catch (e) {
        console.error('[ParamsManager] Listener error:', e)
      }
    }
  }

  // Initialize from URL on creation
  initFromUrl()

  // Also sync to window.cranes.manualFeatures for compatibility
  const syncToCranes = (changedParams) => {
    if (!window.cranes) return
    window.cranes.manualFeatures = window.cranes.manualFeatures || {}
    for (const [key, value] of Object.entries(changedParams)) {
      if (value === null || value === undefined) {
        delete window.cranes.manualFeatures[key]
      } else {
        window.cranes.manualFeatures[key] = value
      }
    }
  }

  return {
    /**
     * Set a single parameter
     */
    set(key, value) {
      params[key] = value
      const changed = { [key]: value }

      syncToCranes(changed)
      syncToUrlDebounced(changed)
      syncToRemoteDebounced(changed)
      notifyListeners(changed)
    },

    /**
     * Set multiple parameters at once
     */
    setMany(newParams) {
      Object.assign(params, newParams)

      syncToCranes(newParams)
      syncToUrlDebounced(newParams)
      syncToRemoteDebounced(newParams)
      notifyListeners(newParams)
    },

    /**
     * Delete a parameter
     */
    delete(key) {
      delete params[key]
      const changed = { [key]: null }

      syncToCranes(changed)
      syncToUrlDebounced(changed)
      syncToRemoteDebounced(changed)
      notifyListeners(changed)
    },

    /**
     * Get a single parameter value
     */
    get(key) {
      return params[key]
    },

    /**
     * Get all parameters
     */
    getAll() {
      return { ...params }
    },

    /**
     * Update shader code and optionally sync to remote
     */
    setShader(code, { syncRemote = true } = {}) {
      shaderCode = code

      // Update window.cranes.shader for the visualizer
      if (window.cranes) {
        window.cranes.shader = code
      }

      // Save to localStorage (for persistence)
      localStorage.setItem('cranes-manual-code', code)

      // Send to remote display
      if (syncRemote && remoteController?.isConnected) {
        remoteController.sendParams({ shaderCode: code })
      }

      notifyListeners({ _shaderCode: code })
    },

    /**
     * Get current shader code
     */
    getShader() {
      return shaderCode ?? window.cranes?.shader
    },

    /**
     * Send all current state to remote (for initial sync)
     */
    syncAllToRemote() {
      if (!remoteController?.isConnected) return false

      const allData = { ...params }
      if (shaderCode) {
        allData.shaderCode = shaderCode
      }
      remoteController.sendParams(allData)
      return true
    },

    /**
     * Subscribe to parameter changes
     */
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    /**
     * Check if remote is connected
     */
    get isRemoteConnected() {
      return remoteController?.isConnected ?? false
    },

    /**
     * Get remote connection info
     */
    get remoteInfo() {
      if (!remoteController) return null
      return {
        isConnected: remoteController.isConnected,
        connectedClients: remoteController.connectedClients,
      }
    },

    /**
     * Disconnect remote controller
     */
    disconnectRemote() {
      remoteController?.disconnect()
    },

    /**
     * Reconnect remote controller
     */
    reconnectRemote() {
      remoteController?.reconnect()
    },
  }
}

// Singleton instance for global access
let globalParamsManager = null

export const getParamsManager = (options) => {
  if (!globalParamsManager) {
    globalParamsManager = createParamsManager(options)
  }
  return globalParamsManager
}
