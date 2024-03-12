import { render, Fragment } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'
const FeatureEditor = ({ name, min, max, value, onChange, onDelete }) => {
    const handleValueChange = (e) => onChange({ min, max, value: parseFloat(e.target.value) })
    const handleCommitChange = () => {
        // Trigger URL update when the slider is released
        const currentUrl = new URL(window.location)
        currentUrl.searchParams.set(name, value)
        window.history.replaceState({}, '', currentUrl.toString())
    }

    return html`
        <div className="edit-feature" key=${name}>
            <label>${name}:</label>
            <input class="min-feature-value" step="0.1" type="number" value=${min} onInput=${(e) => onChange({ ...value, min: parseFloat(e.target.value) })} />
            <input class="feature-value" type="range" min=${min} max=${max} value=${value} step="0.01" onInput=${handleValueChange} onChange=${handleCommitChange} />
            <span> (${value})</span>
            <input class="max-feature-value" step="0.1" type="number" value=${max} onInput=${(e) => onChange({ ...value, max: parseFloat(e.target.value) })} />
            <button onClick=${onDelete}>x</button>
        </div>
    `
}

const FeatureAdder = () => {
    const [features, setFeatures] = useState({})

    // Initialize features from URL search params
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const initialFeatures = Array.from(searchParams.keys()).reduce((acc, key) => {
            const value = parseFloat(searchParams.get(key)) || 0
            acc[key] = { min: -3, max: 3, value } // Assuming default min and max
            return acc
        }, {})

        setFeatures(initialFeatures)
    }, [])

    const updateFeature = (name, newValue) => {
        // Update URL search params
        const currentUrl = new URL(window.location)
        const searchParams = new URLSearchParams(window.location.search)
        searchParams.set(name, newValue.value)
        window.history.replaceState({}, '', currentUrl.toString())

        setFeatures({ ...features, [name]: newValue })
    }

    const addNewFeature = (name) => {
        if (!name) {
            alert('Feature name cannot be empty')
            return
        }
        updateFeature(name, { min: -3, max: 3, value: 1 })
    }

    const deleteFeature = (name) => {
        const { [name]: _, ...rest } = features
        setFeatures(rest)

        // Update URL search params
        const searchParams = new URLSearchParams(window.location.search)
        searchParams.delete(name)
        window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`)
    }

    return html`
        <${Fragment}>
            <div className="new-feature">
                <input type="text" value=${''} onInput=${(e) => setFeatures(e.target.value)} placeholder="Enter new feature name" />
                <button onClick=${() => addNewFeature(newFeatureName)}>Add Feature</button>
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
                            onDelete=${() => deleteFeature(name)}
                        />`,
                )}
            </div>
        </${Fragment}>
    `
}

render(html`<${FeatureAdder} />`, document.getElementById('feature-editor'))
