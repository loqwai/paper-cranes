import { render} from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'

const shaders = await fetch('/shaders.json').then(res => res.json())
const List = () => {
  return html`<ul>${shaders.map(shader => html`<${MusicVisual} name=${shader.name} url=${shader.url} />`)}</ul>`
}
const MusicVisual = ({name, url}) => {
  const [presets, setPresets] = useState([])
  const [shaderCode, setShaderCode] = useState()

  useEffect(async () => {
    if (!url) return
    const res = await fetch(url)
    const text = await res.text()
    setShaderCode(text)
  }, [url])

  useEffect(async () => {
    if (!shaderCode) return
    const presets = extractPresets(shaderCode)
    setPresets(presets)
  }, [shaderCode])

  return html`<li>
    <a href=${getShaderUrl(name)}>${name}</a>
    <ul>
      ${presets.map(preset => html`<li>${preset}</li>`)}
    </ul>
  </li>`
}
const getShaderUrl = (name) => {
  return `/?shader=${name}`
}
const extractPresets = (shaderCode) => {
  return ['a', 'b', 'c']
}
render(html`<${List} />`, document.getElementsByTagName('main')[0])
