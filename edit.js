import { render } from 'preact'
import { useState, useCallback, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'

window.cranes = window.cranes || {}
window.cranes.setState = () => {} // Will be properly initialized below
const SAVE_FILE_NAME = 'cranes-manual-features'
// get an array of slider names from the 'slider' query parameter
const sliderNames = new URLSearchParams(window.location.search).getAll('slider')

const FeatureAdder = () => {
    const [features, setFeatures] = useState({})
    const [newFeatureName, setNewFeatureName] = useState('')
    const [sliderRanges, setSliderRanges] = useState({})

    // A spell to update our internal state based on external will
    const updateFeaturesFromOutside = useCallback((newFeatures) => {
        setFeatures((prevFeatures) => ({
            ...prevFeatures,
            ...newFeatures,
        }))
    }, [])

    useEffect(() => {
        // If there are no sliders, we're done here
        if (sliderNames.length === 0) return

        // Initialize the sliders with the given names
        const newFeatures = sliderNames.reduce((acc, name) => {
            acc[name] = 1
            return acc
        }, {})
        setFeatures(newFeatures)
        setSliderRanges(
            sliderNames.reduce((acc, name) => {
                acc[name] = { min: -3, max: 3 }
                return acc
            }, {}),
        )
    }, [sliderNames])

    // Bind our will to the global cranes.setState, allowing the external
    // realms to influence our internal dominion
    useEffect(() => {
        window.cranes.getState = () => features
        window.cranes.setState = updateFeaturesFromOutside
    }, [features, updateFeaturesFromOutside])

    const updateFeatureValue = (name, value) => {
        const newFeatures = { ...features, [name]: parseFloat(value) }
        setFeatures(newFeatures)

        // Reflect this change globally, ensuring our actions echo in the outer realms
        window.cranes.manualFeatures = window.cranes.manualFeatures || {}
        window.cranes.manualFeatures[name] = parseFloat(value)
    }

    const addNewFeature = () => {
        if (!newFeatureName.trim()) return // Whisper no empty names into the void

        // Summon the new feature into our realm and the global dominion alike
        const newFeatures = { ...features, [newFeatureName]: 0 }
        const newSliderRanges = { ...sliderRanges, [newFeatureName]: { min: -1, max: 1 } }
        setFeatures(newFeatures)
        setSliderRanges(newSliderRanges)
        window.cranes.manualFeatures = window.cranes.manualFeatures || {}
        window.cranes.manualFeatures[newFeatureName] = undefined

        setNewFeatureName('') // Clear the incantation for the next summoning
    }

    const updateSliderRange = (name, min, max) => {
        const newSliderRanges = { ...sliderRanges, [name]: { min: parseFloat(min), max: parseFloat(max) } }
        setSliderRanges(newSliderRanges)
    }
    const saveFeatures = () => {
        localStorage.setItem(SAVE_FILE_NAME, JSON.stringify(features))
    }
    const loadFeatures = () => {
        const savedFeatures = JSON.parse(localStorage.getItem(SAVE_FILE_NAME))
        if (savedFeatures) {
            setFeatures(savedFeatures)
        }
        for (const [name, value] of Object.entries(savedFeatures)) {
            window.cranes.manualFeatures[name] = value
        }
    }

    return html`
        <div id="editor">
            <div className="new-feature">
                <input type="text" placeholder="Enter new feature name" value=${newFeatureName} onInput=${(e) => setNewFeatureName(e.target.value)} />
                <button type="button" onClick=${addNewFeature}>Add Feature</button>
            </div>
            <form>
                ${Object.entries(features).map(
                    ([name, value]) => html`
                        <div className="edit-feature" key=${name}>
                            <label>${name}:</label>
                            <input type="number" value=${sliderRanges[name]?.min ?? -1} onInput=${(e) => updateSliderRange(name, e.target.value, sliderRanges[name]?.max ?? 1)} />
                            <input
                                type="range"
                                min=${sliderRanges[name]?.min ?? -3}
                                max=${sliderRanges[name]?.max ?? 3}
                                value=${value ?? 1}
                                step="0.01"
                                onInput=${(e) => updateFeatureValue(name, e.target.value)}
                            />
                            <span> (${value})</span>
                            <input type="number" value=${sliderRanges[name]?.max ?? 1} onInput=${(e) => updateSliderRange(name, sliderRanges[name]?.min ?? -1, e.target.value)} />
                            <br />
                        </div>
                    `,
                )}
            </form>
            <div className="save-load">
                <button type="button" onClick=${saveFeatures}>Save</button>
                <button type="button" onClick=${loadFeatures}>Load</button>
            </div>
        </div>
    `
}

// Cast our spell, bringing the FeatureAdder to life within the digital ether
render(html`<${FeatureAdder} />`, document.getElementById('editor'))
