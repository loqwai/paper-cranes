import { h, render } from 'https://esm.sh/preact@10.19.3'
import { useEffect, useCallback, useState } from 'https://esm.sh/@preact/signals@1.2.2'
import htm from 'https://unpkg.com/htm?module'
const html = htm.bind(h)

window.cranes = window.cranes || {}
window.cranes.setState = () => {} // Will be properly initialized below

const FeatureAdder = () => {
    const [features, setFeatures] = useState({
        // An example initial state, seeds sown from which our power grows
        speed: 0.5,
        agility: -0.2,
        strength: 0.8,
    })
    const [newFeatureName, setNewFeatureName] = useState('')

    // A spell to update our internal state based on external will
    const updateFeaturesFromOutside = useCallback((newFeatures) => {
        setFeatures((prevFeatures) => ({
            ...prevFeatures,
            ...newFeatures,
        }))
    }, [])

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
        setFeatures(newFeatures)
        window.cranes.manualFeatures = window.cranes.manualFeatures || {}
        window.cranes.manualFeatures[newFeatureName] = 0

        setNewFeatureName('') // Clear the incantation for the next summoning
    }

    return html`
        <div id="editor">
            <input type="text" placeholder="Enter new feature name" value=${newFeatureName} onInput=${(e) => setNewFeatureName(e.target.value)} />
            <button type="button" onClick=${addNewFeature}>Add Feature</button>
            <form>
                ${Object.entries(features).map(
                    ([name, value]) => html`
                        <div key=${name}>
                            <label
                                >${name}:
                                <input type="range" min="-1" max="1" value=${value} step="0.01" onInput=${(e) => updateFeatureValue(name, e.target.value)} />
                                <span> (${value})</span>
                            </label>
                            <br />
                        </div>
                    `,
                )}
            </form>
        </div>
    `
}

// Cast our spell, bringing the FeatureAdder to life within the digital ether
render(html`<${FeatureAdder} />`, document.getElementById('editor'))
