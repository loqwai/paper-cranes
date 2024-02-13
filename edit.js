import { render, Fragment } from 'preact'
import { useState, useCallback, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'

window.cranes = window.cranes || {}
window.cranes.setState = () => {} // Will be properly initialized below
const SAVE_FEATURES_FILENAME = 'cranes-manual-features'
const SAVE_CODE_FILENAME = 'cranes-manual-code'

const FeatureEditor = ({ name, min, max, value, onChange }) => {
    const handleValueChange = (e) => {
        onChange({ min, max, value: parseFloat(e.target.value) }) // Update only the value
    }

    const handleMinChange = (e) => {
        onChange({ min: parseFloat(e.target.value), max, value })
    }

    const handleMaxChange = (e) => {
        onChange({ min, max: parseFloat(e.target.value), value })
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
        setFeatures({ ...features, [name]: newValue })
    }

    useEffect(() => {
        const initialFeatures = JSON.parse(
            localStorage.getItem(SAVE_FEATURES_FILENAME) || '{"knob_1": {"min": -3, "max": 3, "value": 1}, "test2": {"min": -3, "max": 3, "value": 1}}',
        )
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
