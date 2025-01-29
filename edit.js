import { render, Fragment } from 'preact'
import { useState, useEffect, useRef } from 'preact/hooks'
import { html } from 'htm/preact'
import debounce from 'debounce'

const updateUrl = (params) => {
    const currentUrl = new URL(window.location)
    Object.entries(params).forEach(([paramName, paramValue]) => {
        if (paramValue !== null && paramValue !== undefined) {
            currentUrl.searchParams.set(paramName, paramValue)
        } else {
            currentUrl.searchParams.delete(paramName)
        }
    })
    window.history.replaceState({}, '', currentUrl.toString())
}

const updateUrlDebounced = debounce(updateUrl, 50)

const FeatureEditor = ({ name, feature, onChange, onDelete }) => {
    const [showSettings, setShowSettings] = useState(false)
    const settingsRef = useRef(null)

    const handleValueChange = (e) => onChange(name, { ...feature, value: parseFloat(e.target.value) })
    const handleMinChange = (e) => onChange(name, { ...feature, min: parseFloat(e.target.value) })
    const handleMaxChange = (e) => onChange(name, { ...feature, max: parseFloat(e.target.value) })
    const handleCommitValue = () => {
        updateUrlDebounced({ [name]: feature.value })
    }

    useEffect(() => {
        updateUrlDebounced({
            [name]: feature.value,
            [`${name}.min`]: feature.min,
            [`${name}.max`]: feature.max,
        })
        window.cranes.manualFeatures[name] = feature.value
    }, [feature])

    return html`
        <div className="edit-feature" key=${name}>
            <label>
                <button onClick=${() => onDelete(name)} class="delete-button">×</button>
                ${name}
            </label>
            <div class="slider-container">
                <input
                    class="feature-value"
                    type="range"
                    min=${feature.min}
                    max=${feature.max}
                    step="0.01"
                    value=${feature.value}
                    onInput=${handleValueChange}
                    onChange=${handleCommitValue}
                />
                <button
                    class="settings-button ${showSettings ? 'active' : ''}"
                    onClick=${() => setShowSettings(!showSettings)}
                    title="Adjust min/max values"
                >
                    <span style="transform: rotate(90deg)">⚡</span>
                </button>
                ${showSettings && html`
                    <div class="settings-popover" ref=${settingsRef}>
                        <div class="setting-row">
                            <label>Min:</label>
                            <input
                                type="number"
                                step="0.1"
                                value=${feature.min}
                                onInput=${handleMinChange}
                            />
                        </div>
                        <div class="setting-row">
                            <label>Max:</label>
                            <input
                                type="number"
                                step="0.1"
                                value=${feature.max}
                                onInput=${handleMaxChange}
                            />
                        </div>
                    </div>
                `}
            </div>
            <span class="value-display">${feature.value.toFixed(2)}</span>
        </div>
    `
}

const FeatureAdder = () => {
    const [features, setFeatures] = useState({})
    const [newFeatureName, setNewFeatureName] = useState('')
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    useEffect(async () => {
        const searchParams = new URLSearchParams(window.location.search)
        const initialFeatures = {}
        searchParams.forEach((value, key) => {
            // if the value is not a number, return.
            if (isNaN(value)) return
            const [featureName, paramType] = key.includes('.') ? key.split('.') : [key, 'value']
            if (!initialFeatures[featureName]) initialFeatures[featureName] = { min: -3, max: 3, value: 0 }
            initialFeatures[featureName][paramType] = parseFloat(value)
        })
        setFeatures(initialFeatures)

        // if we have a searchParam of 'present', add the present class to the body
        if (searchParams.has('present')) {
            document.body.classList.add('present')
        }
    }, [])

    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen)
    }

    const updateFeature = (name, updatedFeature) => {
        // get the previous feature
        updatedFeature.min = updatedFeature.min ?? -2
        updatedFeature.max = updatedFeature.max ?? 1
        //round the value to the nearest 3 decimal places
        updatedFeature.value = Math.round(updatedFeature.value * 1000) / 1000
        setFeatures((prev) => ({ ...prev, [name]: updatedFeature }))
    }

    window.cranes.updateFeature = (name, value) => {
        updateFeature(name, { ...features[name], value })
    }

    const addNewFeature = () => {
        if (!newFeatureName.trim()) {
            alert('Feature name cannot be empty')
            return
        }
        const newFeature = { value: 1, min: -3, max: 3 }
        updateFeature(newFeatureName, newFeature)
        setNewFeatureName('')
    }

    const deleteFeature = (name) => {
        const { [name]: _, ...rest } = features
        setFeatures(rest)
        updateUrl({ [name]: null, [`${name}.min`]: null, [`${name}.max`]: null })
        delete window.cranes?.manualFeatures[name]
    }

    return html`
        <${Fragment}>
            <button
                className="drawer-toggle sparkly animated"
                onClick=${toggleDrawer}
            >
                ${isDrawerOpen ? '×' : '⚙️'}
            </button>
            <div className=${`sparkly animated ${isDrawerOpen ? 'open' : ''}`} id="feature-editor">
                <div className="new-feature">
                    <input
                        type="text"
                        value=${newFeatureName}
                        onInput=${(e) => setNewFeatureName(e.target.value)}
                        placeholder="Enter new feature name"
                    />
                    <button onClick=${addNewFeature}>Add Feature</button>
                </div>
                <div id="existing-features-editor">
                    ${Object.entries(features).map(
                        ([name, feature]) => html`
                            <${FeatureEditor}
                                key=${name}
                                name=${name}
                                feature=${feature}
                                onChange=${updateFeature}
                                onDelete=${deleteFeature}
                            />
                        `
                    )}
                </div>
            </div>
        </${Fragment}>
    `
}

render(html`<${FeatureAdder} />`, document.getElementById('feature-editor-root'))
