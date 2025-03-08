import { html } from 'htm/preact'
import { useShaderPresets, getEditUrl, filterPresetProps } from './shader-list.js'

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

/**
 * @typedef {Object} ShaderListItemProps
 * @property {string} name - Display name of the shader
 * @property {string} fileUrl - URL to the shader source file
 * @property {string} visualizerUrl - URL to view the shader in the visualizer
 * @property {boolean} isActive - Whether this shader is currently selected
 * @property {function(string): void} onClick - Callback when shader or preset is clicked, receives URL as argument
 */

/**
 * Component for displaying a shader and its presets
 * @param {ShaderListItemProps} props
 */
export const ShaderListItem = ({ name, fileUrl, visualizerUrl, isActive, onClick }) => {
    const [presets, shaderCode] = useShaderPresets(fileUrl, visualizerUrl)

    const linkIcon = html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>`

    const copyUrl = (e, url) => {
        e.stopPropagation()
        navigator.clipboard.writeText(url)
        const button = e.currentTarget
        button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4.5 12.75l6 6 9-13.5" />
        </svg>`
        setTimeout(() => {
            button.innerHTML = linkIcon
        }, 1000)
    }

    return html`
        <li class="shader-item ${isActive ? 'active' : ''}">
            <div
                class="link-group"
                onClick=${() => onClick?.(visualizerUrl)}
            >
                <button
                    class="copy-link"
                    onClick=${(e) => copyUrl(e, `${window.location.host}${visualizerUrl}`)}
                    title="Copy link"
                >${linkIcon}</button>
                <span class="main-link">${name}</span>
                <a
                    class="edit-link"
                    href="${getEditUrl(visualizerUrl)}"
                    onClick=${e => e.stopPropagation()}
                >edit</a>
            </div>
            ${presets.length > 0 && html`
                <ul class="preset-list">
                    ${presets.map((preset, index) => html`
                        <li>
                            <div
                                class="link-group preset-group"
                                onClick=${() => onClick?.(preset)}
                            >
                                <button
                                    class="copy-link"
                                    onClick=${(e) => copyUrl(e, preset)}
                                    title="Copy link"
                                >${linkIcon}</button>
                                <span class="main-link">Preset ${index + 1}</span>
                                <a
                                    class="edit-link"
                                    href="${getEditUrl(preset)}"
                                    onClick=${e => e.stopPropagation()}
                                >edit</a>
                            </div>
                            <${PresetParams} preset=${preset} />
                        </li>
                    `)}
                </ul>
            `}
        </li>
    `
}
