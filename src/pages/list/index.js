import { render } from 'preact'
import { html } from 'htm/preact'
import { useState, useEffect } from 'preact/hooks'

const ShaderList = () => {
    const [shaders, setShaders] = useState([])

    useEffect(() => {
        fetch('shaders.json')
            .then(res => res.json())
            .then(setShaders)
            .catch(console.error)
    }, [])

    return html`
        <div class="shader-list">
            ${shaders.map(shader => html`
                <a href=${shader.visualizerUrl} class="shader-item">
                    ${shader.name}
                </a>
            `)}
        </div>
    `
}

render(html`<${ShaderList} />`, document.body)
