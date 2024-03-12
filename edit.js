import { render, Fragment } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'
import debounce from 'debounce' // Ensure this is correctly imported

const updateUrlDebounced = debounce((name, value) => {
    const currentUrl = new URL(window.location)
    currentUrl.searchParams.set(name, value)
    window.history.replaceState({}, '', currentUrl.toString())
}, 25)

const FeatureEditor = ({ name, min, max, value, onChange, onDelete }) => {
    // Debounce the URL update to prevent excessive history state updates

    const handleValueChange = (e) => {
        const newValue = parseFloat(e.target.value)
        onChange({ min, max, value: newValue })
        // Update URL live with debounced function
        updateUrlDebounced(name, newValue)
    }

    return html`
        <div className="edit-feature" key=${name}>
            <label>${name}:</label>
            <input class="min-feature-value" step="0.1" type="number" value=${min} onInput=${(e) => onChange({ ...value, min: parseFloat(e.target.value) })} />
            <input class="feature-value" type="range" min=${min} max=${max} value=${value} step="0.01" onInput=${handleValueChange} />
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

        // Update URL search params immediately upon deletion
        const currentUrl = new URL(window.location)
        currentUrl.searchParams.delete(name)
        window.history.replaceState({}, '', currentUrl.toString())
    }

    return html`
        <${Fragment}>
            <div className="new-feature">
                <input type="text" value=${''} onInput=${(e) => addNewFeature(e.target.value)} placeholder="Enter new feature name" />
                <button onClick=${addNewFeature}>Add Feature</button>
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
