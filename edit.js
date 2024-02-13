import { render, Fragment } from 'preact'
import { useState, useCallback, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'

window.cranes = window.cranes || {}
window.cranes.setState = () => {} // Will be properly initialized below
const SAVE_FEATURES_FILENAME = 'cranes-manual-features'
const SAVE_CODE_FILENAME = 'cranes-manual-code'

const FeatureEditor = ({ name, min, max, value, onChange }) => {
    const handleValueChange = (e) => {
        onChange({ value: parseFloat(e.target.value) }) // Update only the value
    }

    const handleMinChange = (e) => {
        onChange({ min: parseFloat(e.target.value) })
    }

    const handleMaxChange = (e) => {
        onChange({ max: parseFloat(e.target.value) })
    }

    return html`<div className="edit-feature" key=${name}>
        <label>${name}:</label>
        <input class="min-feature-value" step="0.1" type="number" value=${min} onInput=${handleMinChange} />
        <input class="feature-value" type="range" min="${min}" max=${max} value=${value} step="0.01" onInput=${handleValueChange} />
        <span> (${value})</span>
        <input class="max-feature-value" step="0.1" type="number" value=${max} onInput=${handleMaxChange} />
        <button>x</button>
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
        setFeatures({ ...features, [name]: { ...features[name], ...newValue } })
    }

    useEffect(() => {
        setFeatures(JSON.parse(localStorage.getItem(SAVE_FEATURES_FILENAME) || '{"knob_1": {"min": -3, "max": 3, "value": 1}, "test2": {"min": -3, "max": 3, "value": 1}}'))
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
    return html`
        <${Fragment}>
            <div className="new-feature">
                <input type="text" value=${newFeatureName} onChange=${(e) => setNewFeatureName(e.target.value)} placeholder="Enter new feature name" />
                <button type="button" onClick=${addNewFeature}>Add Feature</button>
            </div>
            <div id="existing-features-editor">
            ${Object.entries(features).map(
                ([name, { min, max, value }]) =>
                    html`<${FeatureEditor} key=${name} name=${name} min=${min} max=${max} value=${value} onChange=${(newValue) => updateFeature(name, newValue)} />`,
            )}
            </div>
            <div className="save-load">
                <button type="button" onClick=${save}>Save</button>
                <button type="button" onClick=${reset}>Reset</button>
            </div>
        </${Fragment}>
    `
}

// Cast our spell, bringing the FeatureAdder to life within the digital ether
render(html`<${FeatureAdder} />`, document.getElementById('feature-editor'))
