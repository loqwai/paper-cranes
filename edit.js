import { render, Fragment } from 'preact'
import { useState, useCallback, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'

window.cranes = window.cranes || {}
window.cranes.setState = () => {} // Will be properly initialized below
const SAVE_FILE_NAME = 'cranes-manual-features'

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
        <input class="min-feature-value" type="number" value=${min} onChange=${handleMinChange} />
        <input class="feature-value" type="range" min="${min}" max=${max} value=${value} step="0.01" onChange=${handleValueChange} />
        <span> (${value})</span>
        <input class="max-feature-value" type="number" value=${max} onChange=${handleMaxChange} />
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
        console.log('features changed', features)
    }, [features])

    useEffect(() => {
        setFeatures(JSON.parse(localStorage.getItem(SAVE_FILE_NAME) || '{"knob_1": {"min": -3, "max": 3, "value": 1}, "test2": {"min": -3, "max": 3, "value": 1}}'))
    }, [])
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
                <button type="button">Save</button>
                <button type="button">Reset</button>
            </div>
        </${Fragment}>
    `
}

// Cast our spell, bringing the FeatureAdder to life within the digital ether
render(html`<${FeatureAdder} />`, document.getElementById('feature-editor'))
