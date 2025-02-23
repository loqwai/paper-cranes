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
 */
const MusicVisual = ({ name, fileUrl, visualizerUrl }) => {
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

  return html`
    <li>
      <div class="link-group">
        <a class="main-link" href="${visualizerUrl}">${name}</a>
        <a class="edit-link" href="${getEditUrl(visualizerUrl)}">edit</a>
      </div>
      <ul>
        ${presets.map((preset, index) => html`
          <li>
            <div class="link-group">
              <a class="main-link" href="${preset}">Preset ${index + 1}</a>
              <a class="edit-link" href="${getEditUrl(preset)}">edit</a>
            </div>
            <${PresetParams} preset=${preset} />
          </li>
        `)}
      </ul>
    </li>
  `
}


const getEditUrl = (visualizationUrl) => {
  try {
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

  return resultUrl.toString()
}
// Load shaders and render the list
const shaders = await fetch('/shaders.json').then(res => res.json())

const List = () => html`
  <ul>
    ${shaders.map(shader => html`<${MusicVisual} ...${shader} />`)}
  </ul>
`

render(html`<${List} />`, document.getElementsByTagName('main')[0])
