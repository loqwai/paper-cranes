import { render, Fragment } from 'preact'
import { useState, useEffect } from 'preact/hooks'
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
    const handleValueChange = (e) => onChange(name, { ...feature, value: parseFloat(e.target.value) })
    const handleMinChange = (e) => onChange(name, { ...feature, min: parseFloat(e.target.value) })
    const handleMaxChange = (e) => onChange(name, { ...feature, max: parseFloat(e.target.value) })
    const handleCommitValue = () => {
        delete window.cranes?.manualFeatures[name]
        updateUrlDebounced({ [name]: feature.value })
    }
    // Update the URL immediately for live updates
    useEffect(() => {
        updateUrlDebounced({
            [name]: feature.value,
            [`${name}.min`]: feature.min,
            [`${name}.max`]: feature.max,
        })
        if (window.cranes?.manualFeatures) {
            window.cranes.manualFeatures[name] = feature.value
        }
    }, [feature])

    return html`
        <div className="edit-feature" key=${name}>
            <label>${name}:</label>
            <input class="min-feature-value" type="number" step="0.1" value=${feature.min} onInput=${handleMinChange} />
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
            <span> (${feature.value})</span>
            <input class="max-feature-value" type="number" step="0.1" value=${feature.max} onInput=${handleMaxChange} />
            <button onClick=${() => onDelete(name)}>x</button>
        </div>
    `
}

const FeatureAdder = () => {
    const [features, setFeatures] = useState({})
    const [newFeatureName, setNewFeatureName] = useState('')

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
        // if there is no 'shader' query param, set the editor code to the default shader
        const shaderName = searchParams.get('shader')
        if (shaderName) {
            // add the no-editor class to body

            document.body.classList.add('no-editor')
            document.body.classList.add('no-editor')
        } else {
            // try to get the shader from local storage
            let shader = localStorage.getItem('cranes-manual-code')
            // if the shader is not in local storage, fetch it from the server
            if (!shader) {
                const res = await fetch('/shaders/default.frag')
                shader = await res.text()
            }
            window.editor.pushUndoStop()
            window.editor.setValue(shader)
            window.editor.pushUndoStop()
            window.editor.layout()
        }
        // if we have a searchParam of 'present', add the present class to the body
        if (searchParams.has('present')) {
            document.body.classList.add('present')
        }
    }, [])

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
            <div className="new-feature">
                <input type="text" value=${newFeatureName} onInput=${(e) => setNewFeatureName(e.target.value)} placeholder="Enter new feature name" />
                <button onClick=${addNewFeature}>Add Feature</button>
            </div>
            <div id="existing-features-editor">
                ${Object.entries(features).map(
                    ([name, feature]) => html` <${FeatureEditor} key=${name} name=${name} feature=${feature} onChange=${updateFeature} onDelete=${deleteFeature} />`,
                )}
            </div>
        </${Fragment}>
    `
}

render(html`<${FeatureAdder} />`, document.getElementById('feature-editor'))
