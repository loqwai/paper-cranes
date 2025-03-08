import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'

/**
 * @typedef {Object} Shader
 * @property {string} name - Display name of the shader
 * @property {string} fileUrl - URL to the shader source file
 * @property {string} visualizerUrl - URL to view the shader in the visualizer
 */
// Load shaders and render the list
import { VisualsListItem } from './src/components/VisualsListItem.js'
const shaders = await fetch('/shaders.json').then(res => res.json())

const List = () => html`
  <ul>
    ${shaders.map(shader => html`<${MusicVisual} ...${shader} />`)}
  </ul>
`

render(html`<${List} />`, document.getElementsByTagName('main')[0])
