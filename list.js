import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'

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

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url)
    const button = event.currentTarget
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4.5 12.75l6 6 9-13.5" />
    </svg>`
    setTimeout(() => {
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>`
    }, 1000)
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

  return html`
    <li>
      <div class="main-link" onClick=${hasPresets ? () => setIsExpanded(!isExpanded) : undefined}>
        <a
          href="${targetUrl}"
          onClick=${hasPresets ? (e) => e.preventDefault() : undefined}
        >
          <span>${name}</span>
        </a>
        <div class="main-link-actions">
          <button
            class="copy-link"
            onClick=${(e) => {
              e.preventDefault()
              e.stopPropagation()
              copyUrl(getFullUrl(targetUrl))
            }}
            title="Copy link"
          >${linkIcon}</button>
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
              <a class="preset-link" href="${preset}">
                <span>${getPresetName(preset, index)}</span>
                <div class="preset-link-actions">
                  <button
                    class="copy-link"
                    onClick=${(e) => {
                      e.preventDefault()
                      copyUrl(getFullUrl(preset))
                    }}
                    title="Copy link"
                  >${linkIcon}</button>
                  <a class="edit-link" href="${getEditUrl(preset)}">edit</a>
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

const List = () => {
  const [filterText, setFilterText] = useState(getInitialFilter())
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1200)

  // Update URL when filter changes
  useEffect(() => {
    updateUrlWithFilter(filterText)
  }, [filterText])

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
  const filteredShaders = showAll ? shaders : shaders.filter(shader => !shader.name.includes('/wip/') && !shader.name.includes('knobs'))

  return html`
    <div>
      <${SearchInput} value=${filterText} onChange=${handleFilterChange} />
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
