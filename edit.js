import { render, Fragment } from 'preact'
import { useState, useCallback, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'

window.cranes = window.cranes || {}
const SAVE_FEATURES_FILENAME = 'cranes-manual-features'
const SAVE_CODE_FILENAME = 'cranes-manual-code'
const DEFAULT_SHADER = `uniform float knob_1;
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;

    vec3 col = vec3(1.,knob_1/2.,energy);
    // Output to screen
    fragColor = vec4(col,1.0);
}`
const FeatureEditor = ({ name, min, max, value, onChange, onDelete }) => {
    const handleValueChange = (e) => {
        onChange({ min, max, value: parseFloat(e.target.value) }) // Update only the value
    }

    const handleMinChange = (e) => {
        onChange({ min: parseFloat(e.target.value), max, value })
    }

    const handleMaxChange = (e) => {
        onChange({ min, max: parseFloat(e.target.value), value })
    }

    const handleDelete = () => {
        onDelete(name)
    }

    return html`<div className="edit-feature" key=${name}>
        <label>${name}:</label>
        <input class="min-feature-value" step="0.1" type="number" value=${min} onInput=${handleMinChange} />
        <input class="feature-value" type="range" min="${min}" max=${max} value=${value} step="0.01" onInput=${handleValueChange} />
        <span> (${value})</span>
        <input class="max-feature-value" step="0.1" type="number" value=${max} onInput=${handleMaxChange} />
        <button onClick=${handleDelete}>x</button>
    </div>`
}

const FeatureAdder = () => {
    const [features, setFeatures] = useState({})
    const [newFeatureName, setNewFeatureName] = useState('')
    const addNewFeature = () => {
        if (!newFeatureName) {
            alert('Feature name cannot be empty')
            return
        }
        setFeatures({ ...features, [newFeatureName]: { min: -3, max: 3, value: 1 } })
        setNewFeatureName('')
    }

    const updateFeature = (name, newValue) => {
        setFeatures({ ...features, [name]: newValue })
    }

    const deleteFeature = (name) => {
        const newFeatures = { ...features }
        delete newFeatures[name]
        setFeatures(newFeatures)
    }

    useEffect(() => {
        const initialFeatures = JSON.parse(localStorage.getItem(SAVE_FEATURES_FILENAME) || '{"knob_1": {"min": -3, "max": 3, "value": 1}}')
        const initialCode = localStorage.getItem(SAVE_CODE_FILENAME)
        if (!initialCode) {
            localStorage.setItem(SAVE_CODE_FILENAME, DEFAULT_SHADER)
            window.location.reload()
        }
        window.cranes.setFeatures = setFeatures
        window.cranes.setFeature = (name, value) => {
            setFeatures((currentFeatures) => {
                const newFeature = { ...currentFeatures[name], value }
                return { ...currentFeatures, [name]: newFeature }
            })
            let currentUrl = new URL(window.location)
            currentUrl.searchParams.set(name, value)
            window.history.pushState({}, '', currentUrl)
        }
        setFeatures(initialFeatures)
    }, [])
    const save = () => {
        localStorage.setItem(SAVE_FEATURES_FILENAME, JSON.stringify(features))
        localStorage.setItem(SAVE_CODE_FILENAME, editor.getValue())
        window.location.reload()
    }
    const reset = () => {
        localStorage.removeItem(SAVE_FEATURES_FILENAME)
        localStorage.removeItem(SAVE_CODE_FILENAME)
        window.location.reload()
    }

    useEffect(() => {
        // set window.cranes.manualFeatures to just the value of each feature
        window.cranes.manualFeatures = Object.fromEntries(Object.entries(features).map(([name, { value }]) => [name, value]))
    }, [features])

    return html`
        <${Fragment}>
            <div className="new-feature">
                <input type="text" value=${newFeatureName} onChange=${(e) => setNewFeatureName(e.target.value)} placeholder="Enter new feature name" />
                <button type="button" onClick=${addNewFeature}>Add Feature</button>
            </div>
            <div id="existing-features-editor">
            ${Object.entries(features).map(
                ([name, { min, max, value }]) =>
                    html`<${FeatureEditor}
                        key=${name}
                        name=${name}
                        min=${min}
                        max=${max}
                        value=${value}
                        onChange=${(newValue) => updateFeature(name, newValue)}
                        onDelete=${deleteFeature}
                    />`,
            )}
            </div>
            <div className="save-load">
                <button type="button" onClick=${save}>Save</button>
                <button type="button" onClick=${reset}>Reset</button>
            </div>
        </${Fragment}>
    `
}

// check to see if we have a query param for the shader
const urlParams = new URLSearchParams(window.location.search)
const shader = urlParams.get('shader')
// if we do, fetch the code and set it in local storage. Then remove the query param and reload the page
//if we do, and we don't have anything in localstorage, fetch the code and set it in local storage. Then remove the query param and reload the page
// then reload the page
if (shader) {
    fetch(`shaders/${shader}.frag`)
        .then((response) => response.text())
        .then((data) => {
            localStorage.setItem(SAVE_CODE_FILENAME, data)
            // remove the query param and reload the page
            // window.location.search = ''
            // const reloadUrl = window.location.href.split('?')[0]
            // window.location.href = reloadUrl
        })
}
// Cast our spell, bringing the FeatureAdder to life within the digital ether
render(html`<${FeatureAdder} />`, document.getElementById('feature-editor'))
