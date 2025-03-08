import { useState, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'

/**
 * Fetches shader code and extracts preset URLs
 * @param {Object} props
 * @param {string} props.name - Display name of the shader
 * @param {string} props.fileUrl - URL to the shader source file
 * @param {string} props.visualizerUrl - URL to view the shader in the visualizer
 */
export const VisualsListItem = ({ name, fileUrl, visualizerUrl, onSelect }) => {
  const [presets, setPresets] = useState([])
  const [shaderCode, setShaderCode] = useState('')

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
      button.innerHTML = button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>`
    }, 1000)
  }

  return html`
    <li>
      <div class="link-group">
        <button
          class="copy-link"
          onClick=${() => copyUrl(`${window.location.host}${visualizerUrl}`)}
          title="Copy link"
        >${linkIcon}</button>
        <a class="main-link" href="${visualizerUrl}">${name}</a>
        <a class="edit-link" href="${getEditUrl(visualizerUrl)}">edit</a>
      </div>
      <ul>
        ${presets.map((preset, index) => html`
          <${ListLink} name="Preset ${index + 1}" url=${preset} />
        `)}
      </ul>
    </li>
  `
}
const ListLink = (preset) => {
  return html`
    <li>
      <div class="link-group">
        <button
          class="copy-link"
          onClick=${() => copyUrl(preset)}
          title="Copy link"
              >${linkIcon}</button>
              <a class="main-link" href="${preset}">Preset ${  + 1}</a>
              <a class="edit-link" href="${getEditUrl(preset)}">edit</a>
            </div>
            <${PresetParams} preset=${preset} />
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

  return html`
    <div class="chip-list">
      ${presetProps.map(([key, value], index) => html`
        <div
          class="chip pastel-color"
          style="--n: ${index / presetProps.length}"
        >
          ${key}: ${value}
        </div>
      `)}
    </div>
  `
}

const filterPresetProps = ([key]) => {
  if (key === 'shader') return false
  if (key.endsWith('.min')) return false
  if (key.endsWith('.max')) return false
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
    .filter(line => line.includes('http://') || line.includes('https://'))
    .map(line => getPresetUrl(visualizerUrl, line))
    .filter(url => url.searchParams.size !== 0)
    .map(url => url.toString())
}

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

  return resultUrl
}
