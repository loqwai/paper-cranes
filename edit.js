import { render, Fragment } from 'preact'
import { useState, useCallback, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'

window.cranes = window.cranes || {}
window.cranes.setState = () => {} // Will be properly initialized below
const SAVE_FILE_NAME = 'cranes-manual-features'

const FeatureAdder = () => {
    const [features, setFeatures] = useState({})
    const [newFeatureName, setNewFeatureName] = useState('')
    const addNewFeature = () => {
        if (!newFeatureName) alert('Feature name cannot be empty')
        // setFeatures({ ...features, [newFeatureName]: { min: -3, max: 3, value: 1 } })
        setNewFeatureName('')
        console.log('features', features)
    }

    const testAddFeature = (e) => {
        setNewFeatureName(e.target.value)
    }

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
