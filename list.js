import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'
import { loadShaders } from './src/shader-list.js'
import { ShaderListItem } from './src/shader-list-item.js'

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
  const [presets, shaderCode] = useShaderPresets(fileUrl, visualizerUrl)

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
      button.innerHTML = linkIcon
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
          <li>
            <div class="link-group">
              <button
                class="copy-link"
                onClick=${() => copyUrl(preset)}
                title="Copy link"
              >${linkIcon}</button>
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

const List = () => {
  const [shaders, setShaders] = useState([])

  useEffect(() => {
    loadShaders().then(setShaders)
  }, [])

  const handleClick = (url) => {
    window.location.href = url
  }

  return html`
    <ul>
      ${shaders.map(shader => html`
        <${ShaderListItem}
          ...${shader}
          isActive=${false}
          onClick=${handleClick}
        />
      `)}
    </ul>
  `
}

render(html`<${List} />`, document.body)
