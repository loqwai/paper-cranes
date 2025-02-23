import { render } from 'preact'

import { html } from 'htm/preact'
const shaders = await fetch('/shaders.json').then(res => res.json())
const List = () => {
  return html`<ul>${shaders.map(shader => html`<${ShaderEntry} shader=${shader} />`)}</ul>`
}
const ShaderEntry = ({shader}) => {
  return html`<li>${shader.name}</li>`
}
render(html`<${List} />`, document.getElementsByTagName('main')[0])
