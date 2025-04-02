import { render, Fragment } from 'preact'
import { useState, useEffect, useRef } from 'preact/hooks'
import { html } from 'htm/preact'
import debounce from 'debounce'
import { getRelativeOrAbsoluteShaderUrl } from './src/utils.js'

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
    const handleValueChange = (e) => onChange(name, { ...feature, value: parseFloat(e.target.value) })

    const handleMinChange = (e) => {
        // Allow the field to be empty temporarily
        const val = e.target.value
        if (val === '') {
            onChange(name, { ...feature, min: '' })
        } else if (!isNaN(parseFloat(val))) {
            onChange(name, { ...feature, min: parseFloat(val) })
        }
    }

    const handleMaxChange = (e) => {
        // Allow the field to be empty temporarily
        const val = e.target.value
        if (val === '') {
            onChange(name, { ...feature, max: '' })
        } else if (!isNaN(parseFloat(val))) {
            onChange(name, { ...feature, max: parseFloat(val) })
        }
    }

    const handleKeyDown = (e, type) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

        e.preventDefault()
        const step = e.shiftKey ? 0.01 : 0.1

        // Get current value, default to 0 if empty or invalid
        const fieldName = type === 'min' ? 'min' : 'max'
        const currentVal = feature[fieldName]
        const numVal = currentVal === '' || isNaN(parseFloat(currentVal)) ? 0 : parseFloat(currentVal)

        // Calculate new value based on key pressed
        const newVal = e.key === 'ArrowUp' ? numVal + step : numVal - step

        // Update the value
        const updatedFeature = { ...feature }
        updatedFeature[fieldName] = newVal
        onChange(name, updatedFeature)
    }

    const handleCommitValue = () => {
        updateUrlDebounced({ [name]: feature.value })
    }

    useEffect(() => {
        if (feature.min !== '' && feature.max !== '' && !isNaN(feature.min) && !isNaN(feature.max)) {
            updateUrlDebounced({
                [name]: feature.value,
                [`${name}.min`]: feature.min,
                [`${name}.max`]: feature.max,
            })
            window.cranes.manualFeatures[name] = feature.value
        }
    }, [feature])

    return html`
        <div className="edit-feature" key=${name}>
            <div class="feature-header">
                <div class="feature-name">
                    <span>${name}</span>
                    <span class="value-display">${feature.value.toFixed(2)}</span>
                    <button onClick=${() => onDelete(name)} class="delete-button" title="Delete feature">×</button>
                </div>
                <div class="slider-container">
                    <input
                        type="number"
                        value=${feature.min === '' ? '' : feature.min}
                        onInput=${handleMinChange}
                        onKeyDown=${(e) => handleKeyDown(e, 'min')}
                        placeholder="0"
                        class="min-input"
                        step="0.1"
                    />
                    <input
                        class="feature-value"
                        type="range"
                        min=${feature.min === '' ? 0 : feature.min}
                        max=${feature.max === '' ? 1 : feature.max}
                        step="0.01"
                        value=${feature.value}
                        onInput=${handleValueChange}
                        onChange=${handleCommitValue}
                    />
                    <input
                        type="number"
                        value=${feature.max === '' ? '' : feature.max}
                        onInput=${handleMaxChange}
                        onKeyDown=${(e) => handleKeyDown(e, 'max')}
                        placeholder="1"
                        class="max-input"
                        step="0.1"
                    />
                </div>
            </div>
        </div>
    `
}

const FeatureAdder = () => {
    const [features, setFeatures] = useState({})
    const [newFeatureName, setNewFeatureName] = useState('')
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const toggleButtonRef = useRef(null)
    const prevFeaturesLength = useRef(0)

    useEffect(() => {
        const currentLength = Object.keys(features).length
        if (currentLength > prevFeaturesLength.current && toggleButtonRef.current) {
            const button = toggleButtonRef.current
            button.classList.remove('wiggle')
            button.classList.add('wiggle')
            setTimeout(() => button.classList.remove('wiggle'), 1000)
        }
        prevFeaturesLength.current = currentLength
    }, [features])

    const handleShaderParam = async (searchParams) => {
        if (!searchParams.has('shader')) return false

        try {
            const shaderCode = await getRelativeOrAbsoluteShaderUrl(searchParams.get('shader'))
            localStorage.setItem('cranes-manual-code', shaderCode)
            const newUrl = new URL(window.location)
            newUrl.searchParams.delete('shader')
            window.history.replaceState({}, '', newUrl)
            window.location.reload()
            return true
        } catch (error) {
            console.error('Failed to fetch shader:', error)
            return false
        }
    }

    const initializeFeatures = (searchParams) => {
        const initialFeatures = {}
        searchParams.forEach((value, key) => {
            if (isNaN(value)) return
            const [featureName, paramType] = key.includes('.') ? key.split('.') : [key, 'value']
            if (!initialFeatures[featureName]) {
                initialFeatures[featureName] = { min: 0, max: 1, value: 0.5 }
            }
            initialFeatures[featureName][paramType] = parseFloat(value)
        })
        return initialFeatures
    }

    const handleUIState = (searchParams) => {
        if (searchParams.has('present')) document.body.classList.add('present')
        if (searchParams.has('open_sliders'))  setIsDrawerOpen(true)
    }

    useEffect(() => {
        const init = async () => {
            const searchParams = new URLSearchParams(window.location.search)

            const shaderHandled = await handleShaderParam(searchParams)
            if (shaderHandled) return

            const initialFeatures = initializeFeatures(searchParams)
            setFeatures(initialFeatures)
            prevFeaturesLength.current = Object.keys(initialFeatures).length
            handleUIState(searchParams)
        }

        init()
    }, [])

    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen)
    }

    const updateFeature = (name, updatedFeature) => {
        updatedFeature.min = updatedFeature.min ?? 0
        updatedFeature.max = updatedFeature.max ?? 1
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
                ref=${toggleButtonRef}
                className="drawer-toggle"
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
