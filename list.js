import { render } from 'preact'
import { useState, useEffect, useRef } from 'preact/hooks'
import { html } from 'htm/preact'

// Check if we're in remote control mode
const params = new URLSearchParams(window.location.search)
const isRemoteControlMode = params.get('remote') === 'control'

// Remote controller instance (initialized in List component)
let remoteController = null

/**
 * @typedef {Object} Shader
 * @property {string} name - Display name of the shader
 * @property {string} fileUrl - URL to the shader source file
 * @property {string} visualizerUrl - URL to view the shader in the visualizer
 */

/**
 * Fetches shader code and extracts preset URLs
 * @param {Object} props
 * @param {string} props.name - Display name of the shader
 * @param {string} props.fileUrl - URL to the shader source file
 * @param {string} props.visualizerUrl - URL to view the shader in the visualizer
 * @param {string} props.filterText - Text to filter by
 */
const MusicVisual = ({ name, fileUrl, visualizerUrl, filterText }) => {
  const [presets, setPresets] = useState([])
  const [shaderCode, setShaderCode] = useState('')
  const [filteredPresets, setFilteredPresets] = useState([])
  const [isExpanded, setIsExpanded] = useState(false)

  // Fetch shader source code
  useEffect(() => {
    if (!fileUrl) return

    const fetchShaderCode = async () => {
      const res = await fetch(fileUrl)
      const text = await res.text()
      setShaderCode(text)
    }

    fetchShaderCode()
  }, [fileUrl])

  // Extract presets when shader code is loaded
  useEffect(() => {
    if (!shaderCode) return
    setPresets(extractPresets(visualizerUrl, shaderCode))
  }, [shaderCode, visualizerUrl])

  // Filter presets when filter text changes
  useEffect(() => {
    if (!filterText) {
      setFilteredPresets(presets)
      return
    }

    const lowerFilter = filterText.toLowerCase()
    setFilteredPresets(presets.filter(preset => {
      // Check if any preset parameter contains the filter text
      const url = new URL(preset)
      const params = Array.from(url.searchParams.entries())
      return params.some(([key, value]) =>
        key.toLowerCase().includes(lowerFilter) ||
        value.toLowerCase().includes(lowerFilter)
      )
    }))
  }, [presets, filterText])

  // If shader name doesn't match filter and no presets match, don't render
  if (filterText &&
      !name.toLowerCase().includes(filterText.toLowerCase()) &&
      filteredPresets.length === 0) {
    return null
  }

  const hasPresets = presets.length > 0
  const targetUrl = hasPresets ? presets[0] : visualizerUrl

  const linkIcon = html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>`

  const copyUrl = (url, options = {}) => {
    const { stripKnobs = true, addFullscreen = false } = options

    const originalUrl = new URL(url)
    const newParams = new URLSearchParams()

    for (const [key, value] of originalUrl.searchParams) {
      if (stripKnobs && key.toLowerCase().includes('knob')) {
        continue
      }
      newParams.set(key, value)
    }

    if (addFullscreen) {
      newParams.set('fullscreen', 'true')
    }

    // Add default image if not present
    if (!newParams.has('image')) {
      newParams.set('image', 'images/rezz-full-lips-cropped.png')
    }

    const finalUrl = new URL(originalUrl.pathname, originalUrl.origin)
    finalUrl.search = newParams.toString()

    navigator.clipboard.writeText(finalUrl.toString())

    // Use a more robust way to get the button, maybe pass it as an argument if needed
    const button = event?.currentTarget
    if (button) {
      const originalContent = button.innerHTML
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4.5 12.75l6 6 9-13.5" />
      </svg>`
      setTimeout(() => {
        button.innerHTML = originalContent // Restore original icon
      }, 1000)
    }
  }

  // Get preset name from URL parameters
  const getPresetName = (preset, index) => {
    return new URL(preset).searchParams.get('name') || `Preset ${index + 1}`
  }

  // Get full URL for copying
  const getFullUrl = (url) => {
    try {
      const fullUrl = new URL(url, window.location.origin)
      return fullUrl.toString()
    } catch (e) {
      return `${window.location.origin}${url}`
    }
  }

  const fullscreenIcon = html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9.75 9.75M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L14.25 9.75M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9.75 14.25m10.5 6v-4.5m0 4.5h-4.5m4.5 0L14.25 14.25" />
  </svg>`

  const handleMainLinkClick = (e) => {
    e.preventDefault()
    if (hasPresets) {
      // If has presets, just expand/collapse the list
      setIsExpanded(!isExpanded)
    } else if (isRemoteControlMode && remoteController) {
      // In remote control mode, send command instead of navigating
      const shaderName = new URL(targetUrl, window.location.origin).searchParams.get('shader')
      if (shaderName) {
        remoteController.sendShader(shaderName)
      }
    } else {
      // If no presets, copy and navigate
      const fullscreenUrl = buildFullscreenUrl(getFullUrl(targetUrl))
      navigator.clipboard.writeText(fullscreenUrl)
      window.location.href = fullscreenUrl
    }
  }

  return html`
    <li>
      <div class="main-link">
        <a
          href="${targetUrl}"
          onClick=${handleMainLinkClick}
        >
          <span>${name}</span>
        </a>
        <div class="main-link-actions">
          <button
            class="copy-link"
            onClick=${(e) => {
              e.preventDefault()
              e.stopPropagation()
              copyUrl(getFullUrl(targetUrl), { stripKnobs: true })
            }}
            title="Copy link (no knobs)"
          >${linkIcon}</button>
          <button
            class="copy-link"
            onClick=${async (e) => {
              e.preventDefault()
              e.stopPropagation()
              if (isRemoteControlMode && remoteController) {
                // In remote control mode, send shader with fullscreen param
                const shaderName = new URL(targetUrl, window.location.origin).searchParams.get('shader')
                if (shaderName) {
                  remoteController.sendParams({ shader: shaderName, fullscreen: true })
                }
              } else {
                // Copy URL and enter browser fullscreen
                const fullscreenUrl = buildFullscreenUrl(getFullUrl(targetUrl))
                await navigator.clipboard.writeText(fullscreenUrl)
                document.documentElement.requestFullscreen?.()
                window.location.href = fullscreenUrl
              }
            }}
            title=${isRemoteControlMode ? "Open fullscreen on display" : "Open in fullscreen"}
          >${fullscreenIcon}</button>
          <a
            class="edit-link"
            href="${getEditUrl(targetUrl)}"
            onClick=${(e) => e.stopPropagation()}
          >edit</a>
        </div>
      </div>
      ${hasPresets && isExpanded ? html`
        <ul>
          ${(filterText ? filteredPresets : presets).map((preset, index) => html`
            <li>
              <a class="preset-link" href="${preset}" onClick=${(e) => {
                e.preventDefault()
                if (isRemoteControlMode && remoteController) {
                  // In remote control mode, send all params from the preset URL
                  const presetUrl = new URL(getFullUrl(preset))
                  const params = Object.fromEntries(presetUrl.searchParams.entries())
                  remoteController.sendParams(params)
                } else {
                  const fullscreenUrl = buildFullscreenUrl(getFullUrl(preset))
                  navigator.clipboard.writeText(fullscreenUrl)
                  window.location.href = fullscreenUrl
                }
              }}>
                <span>${getPresetName(preset, index)}</span>
                <div class="preset-link-actions">
                  <button
                    class="copy-link"
                    onClick=${(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      copyUrl(getFullUrl(preset), { stripKnobs: true })
                    }}
                    title="Copy link (no knobs)"
                  >${linkIcon}</button>
                  <button
                    class="copy-link"
                    onClick=${async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (isRemoteControlMode && remoteController) {
                        // In remote control mode, send all params with fullscreen
                        const presetUrl = new URL(getFullUrl(preset))
                        const params = Object.fromEntries(presetUrl.searchParams.entries())
                        // Strip knob params
                        Object.keys(params).forEach(key => {
                          if (key.toLowerCase().includes('knob')) delete params[key]
                        })
                        params.fullscreen = true
                        remoteController.sendParams(params)
                      } else {
                        // Copy URL and enter browser fullscreen
                        const fullscreenUrl = buildFullscreenUrl(getFullUrl(preset))
                        await navigator.clipboard.writeText(fullscreenUrl)
                        document.documentElement.requestFullscreen?.()
                        window.location.href = fullscreenUrl
                      }
                    }}
                    title=${isRemoteControlMode ? "Open fullscreen on display" : "Open in fullscreen"}
                  >${fullscreenIcon}</button>
                  <a class="edit-link" href="${getEditUrl(preset)}" onClick=${(e) => e.stopPropagation()}>edit</a>
                </div>
              </a>
              <${PresetParams} preset=${preset} />
            </li>
          `)}
        </ul>
      ` : null}
    </li>
  `
}


const getEditUrl = (visualizationUrl) => {
  try {
    // trim beginning slash, if it exists
    visualizationUrl = visualizationUrl.startsWith('/') ? visualizationUrl.slice(1) : visualizationUrl
    const url = new URL(visualizationUrl)
    url.pathname = '/edit.html'
    return url.toString()
  } catch (e) {
    return `edit.html${visualizationUrl}`
  }
}

const PresetParams = ({ preset }) => {
  const params = new URL(preset).searchParams
  const presetProps = Array.from(params.entries()).filter(filterPresetProps)

  if (presetProps.length === 0) return null

  return html`
    <div class="chip-list">
      ${presetProps.map(([key, value]) => html`
        <div class="chip">${key}: ${value}</div>
      `)}
    </div>
  `
}

const filterPresetProps = ([key]) => {
  if (key === 'shader') return false
  if (key.endsWith('.min')) return false
  if (key.endsWith('.max')) return false
  if (key === 'name') return false
  return true
}

/**
 * Builds a fullscreen URL with knob parameters stripped
 * @param {string} url - The URL to process
 * @returns {string} The fullscreen URL
 */
const buildFullscreenUrl = (url) => {
  const originalUrl = new URL(url, window.location.origin)
  const newParams = new URLSearchParams()

  for (const [key, value] of originalUrl.searchParams) {
    if (key.toLowerCase().includes('knob')) continue
    newParams.set(key, value)
  }

  newParams.set('fullscreen', 'true')

  if (!newParams.has('image')) {
    newParams.set('image', 'images/rezz-full-lips-cropped.png')
  }

  const finalUrl = new URL(originalUrl.pathname || '/', window.location.origin)
  finalUrl.search = newParams.toString()
  return finalUrl.toString()
}

/**
 * Extracts preset URLs from shader code
 * @param {string} visualizerUrl - Base visualizer URL
 * @param {string} shaderCode - Raw shader source code
 * @returns {string[]} Array of preset URLs
 */
const extractPresets = (visualizerUrl, shaderCode) => {
  if (!shaderCode) return []

  return shaderCode
    .split('\n')
    .filter(isLink)
    .filter(hasGetParams)
    .map(line => getPresetUrl(visualizerUrl, line))
}

const hasGetParams = line => line.includes('?')

const isLink = line => line.includes('http://') || line.includes('https://')

/**
 * Creates a preset URL by combining the visualizer base URL with preset parameters
 * @param {string} visualizerUrl - Base visualizer URL
 * @param {string} line - Line containing a preset URL
 * @returns {string} Combined URL with merged parameters
 */
const getPresetUrl = (visualizerUrl, line) => {
  const presetUrlMatch = line.match(/https?:\/\/[^\s]+/)
  if (!presetUrlMatch) return visualizerUrl

  const presetUrl = new URL(presetUrlMatch[0])
  const baseUrl = new URL(visualizerUrl, window.location.href)
  const resultUrl = new URL(baseUrl.pathname, window.location.origin)

  // Add preset parameters first
  for (const [key, value] of presetUrl.searchParams) {
    resultUrl.searchParams.set(key, value)
  }

  // Override with visualizer parameters
  for (const [key, value] of baseUrl.searchParams) {
    resultUrl.searchParams.set(key, value)
  }

  resultUrl.pathname = ''

  return resultUrl.toString()
}

// Load shaders and render the list
const shaders = await fetch('/shaders.json').then(res => res.json())

/**
 * Connection status banner for remote control mode
 */
const ConnectionStatus = ({ status, connectedClients, onRetry }) => {
  if (!isRemoteControlMode) return null

  const statusConfig = {
    connected: { bg: '#22c55e', text: `Connected (${connectedClients} clients)`, icon: '🟢' },
    disconnected: { bg: '#ef4444', text: 'Disconnected - tap to retry', icon: '🔴' },
    reconnecting: { bg: '#eab308', text: 'Reconnecting...', icon: '🟡' },
    error: { bg: '#ef4444', text: 'Connection error', icon: '🔴' },
  }

  const config = statusConfig[status] || statusConfig.disconnected
  const isClickable = status === 'disconnected' || status === 'error'

  return html`
    <div
      class="connection-status"
      style=${{
        backgroundColor: config.bg,
        color: 'white',
        padding: '12px 16px',
        textAlign: 'center',
        cursor: isClickable ? 'pointer' : 'default',
        fontWeight: 'bold',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
      onClick=${isClickable ? onRetry : null}
    >
      ${config.icon} Remote Control: ${config.text}
    </div>
  `
}

/**
 * Search input component
 * @param {Object} props
 * @param {string} props.value - Current filter value
 * @param {Function} props.onChange - Change handler
 */
const SearchInput = ({ value, onChange }) => {
  return html`
    <div class="search-container">
      <input
        type="text"
        placeholder="Filter shaders and presets..."
        value=${value}
        onInput=${(e) => onChange(e.target.value)}
        class="search-input"
      />
      ${value && html`
        <button
          class="clear-button"
          onClick=${() => onChange('')}
          title="Clear filter"
        >
          ×
        </button>
      `}
    </div>
  `
}

/**
 * Updates the URL with the current filter
 * @param {string} filter - The filter text
 */
const updateUrlWithFilter = (filter) => {
  const url = new URL(window.location)
  if (filter) {
    url.searchParams.set('filter', filter)
  } else {
    url.searchParams.delete('filter')
  }
  window.history.replaceState({}, '', url)
}

/**
 * Gets the initial filter from URL query parameters
 * @returns {string} The filter from URL or empty string
 */
const getInitialFilter = () => {
  const url = new URL(window.location)
  return url.searchParams.get('filter') || ''
}

/**
 * Gets initial filter states from URL
 * @returns {Object} Filter states
 */
const getInitialFilters = () => {
  const url = new URL(window.location)
  return {
    fullscreenOnly: url.searchParams.get('fullscreenOnly') === 'true',
    favoritesOnly: url.searchParams.get('favoritesOnly') === 'true'
  }
}

/**
 * Updates URL with filter states
 * @param {string} key - Filter key
 * @param {boolean} value - Filter value
 */
const updateUrlFilter = (key, value) => {
  const url = new URL(window.location)
  if (value) {
    url.searchParams.set(key, 'true')
  } else {
    url.searchParams.delete(key)
  }
  window.history.replaceState({}, '', url)
}

const List = () => {
  const initialFilters = getInitialFilters()
  const [filterText, setFilterText] = useState(getInitialFilter())
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1200)
  const [fullscreenOnly, setFullscreenOnly] = useState(initialFilters.fullscreenOnly)
  const [favoritesOnly, setFavoritesOnly] = useState(initialFilters.favoritesOnly)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [connectedClients, setConnectedClients] = useState(0)
  const controllerRef = useRef(null)

  // Initialize remote controller
  useEffect(() => {
    if (!isRemoteControlMode) return

    const initController = async () => {
      const { initRemoteController } = await import('./src/remote/RemoteController.js')
      controllerRef.current = initRemoteController((status, data) => {
        setConnectionStatus(status)
        if (data?.connectedClients !== undefined) {
          setConnectedClients(data.connectedClients)
        }
      })
      remoteController = controllerRef.current
    }

    initController()

    return () => {
      controllerRef.current?.disconnect()
    }
  }, [])

  // Update URL when filter changes
  useEffect(() => {
    updateUrlWithFilter(filterText)
  }, [filterText])

  // Update URL when fullscreen filter changes
  useEffect(() => {
    updateUrlFilter('fullscreenOnly', fullscreenOnly)
  }, [fullscreenOnly])

  // Update URL when favorites filter changes
  useEffect(() => {
    updateUrlFilter('favoritesOnly', favoritesOnly)
  }, [favoritesOnly])

  // Update isDesktop state when window resizes
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1200)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleFilterChange = (value) => {
    setFilterText(value)
  }

  // Show all shaders if show=all is present in URL or if on desktop
  const showAll = new URL(window.location).searchParams.get('show') === 'all' || isDesktop
  const filteredPaths = ['wip', 'knobs', 'static']
  let filteredShaders = showAll ? shaders : shaders.filter(shader => !filteredPaths.some(path => shader.name.includes(path)))

  // Filter to fullscreen-compatible shaders (hide explicitly marked as false)
  if (fullscreenOnly) {
    filteredShaders = filteredShaders.filter(shader => shader.fullscreen !== false)
  }

  // Filter to favorites only
  if (favoritesOnly) {
    filteredShaders = filteredShaders.filter(shader => shader.favorite === true)
  }

  const handleRetry = () => {
    controllerRef.current?.reconnect()
  }

  return html`
    <div>
      <${ConnectionStatus}
        status=${connectionStatus}
        connectedClients=${connectedClients}
        onRetry=${handleRetry}
      />
      <${SearchInput} value=${filterText} onChange=${handleFilterChange} />
      <div class="filter-toggles">
        <label class="filter-toggle">
          <input
            type="checkbox"
            checked=${favoritesOnly}
            onChange=${(e) => setFavoritesOnly(e.target.checked)}
          />
          Favorites only
        </label>
        <label class="filter-toggle">
          <input
            type="checkbox"
            checked=${fullscreenOnly}
            onChange=${(e) => setFullscreenOnly(e.target.checked)}
          />
          Fullscreen-compatible
        </label>
      </div>
      <ul class="shader-list">
        ${filteredShaders.map(shader => html`
          <${MusicVisual}
            ...${shader}
            filterText=${filterText}
          />
        `)}
      </ul>
    </div>
  `
}

render(html`<${List} />`, document.getElementsByTagName('main')[0])
