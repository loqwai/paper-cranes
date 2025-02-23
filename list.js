import { render} from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'

const shaders = await fetch('/shaders.json').then(res => res.json())
const List = () => {
    console.log(shaders)
  return html`<ul>${shaders.map(shader => html`<${MusicVisual} ...${shader} />`)}</ul>`
}
const MusicVisual = ({name, fileUrl, visualizerUrl}) => {
  const [presets, setPresets] = useState([])
  const [shaderCode, setShaderCode] = useState()

  useEffect(async () => {
    if (!fileUrl) return
    const res = await fetch(fileUrl)
    const text = await res.text()
    setShaderCode(text)
  }, [fileUrl])

  useEffect(async () => {
    if (!shaderCode) return
    const presets = extractPresets(visualizerUrl, shaderCode)
    setPresets(presets)
  }, [shaderCode])

  return html`<li>
    <a href=${visualizerUrl}>${name}</a>
    <ul>
      ${presets.map((preset, index) => html`<li><a href=${preset}>${index}</a></li>`)}
    </ul>
  </li>`
}
const extractPresets = (visualizerUrl, shaderCode) => {
  // for each line in the shader code, if that line contains a url
  const presets = []
  const lines = shaderCode.split('\n')
  for (const line of lines) {
    if(!(line.includes('https://') || line.includes('http://'))) continue
    const presetUrl = getPresetUrl(visualizerUrl, line)
    presets.push(presetUrl)
  }
  return presets
}
/**
 * Creates a preset URL by combining the visualizer base URL with preset parameters
 * @param {string} visualizerUrl - Base visualizer URL
 * @param {string} line - Line containing a preset URL
 * @returns {string} Combined URL with merged parameters
 */
const getPresetUrl = (visualizerUrl, line) => {
  // Extract the preset URL from the line
  const presetUrlMatch = line.match(/https?:\/\/[^\s]+/)
  if (!presetUrlMatch) return visualizerUrl

  const presetUrl = new URL(presetUrlMatch[0])
  const baseUrl = new URL(visualizerUrl, window.location.href)

  // Create new URL with current window's origin and visualizer's pathname
  const resultUrl = new URL(baseUrl.pathname, window.location.origin)

  // First add preset parameters
  for (const [key, value] of presetUrl.searchParams.entries()) {
    resultUrl.searchParams.set(key, value)
  }

  // Then add/override with visualizer parameters
  for (const [key, value] of baseUrl.searchParams.entries()) {
    resultUrl.searchParams.set(key, value)
  }

  return resultUrl.toString()
}

render(html`<${List} />`, document.getElementsByTagName('main')[0])
