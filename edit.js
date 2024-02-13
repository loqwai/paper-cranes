import { render, Fragment } from 'preact'
import { useState, useCallback, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'

window.cranes = window.cranes || {}
window.cranes.setState = () => {} // Will be properly initialized below
const SAVE_FILE_NAME = 'cranes-manual-features'

const FeatureAdder = () => {
    const [features, setFeatures] = useState({})
    useEffect(() => {
        setFeatures(JSON.parse(localStorage.getItem(SAVE_FILE_NAME) || '{"test": {"min": -3, "max": 3, "value": 1}, "test2": {"min": -3, "max": 3, "value": 1}}'))
    }, [])
    return html`
        <Fragment>
            <div className="new-feature">
                <input type="text" placeholder="Enter new feature name" value="test" />
                <button type="button">Add Feature</button>
            </div>
            <form id="existing-features-editor">
                ${Object.entries(features).map(
                    ([name, value]) => html`
                        <div className="edit-feature" key=${name}>
                            <label>${name}:</label>
                            <input class="min-feature-value" type="number" value="${-3}}" />
                            <input class="feature-value" type="range" min="${-3}" max=${1} value=${value ?? 1} step="0.01" />
                            <span> (${value ?? 1})</span>
                            <input class="max-feature-value" type="number" value=${1} />
                            <button>x</button>
                        </div>
                    `,
                )}
            </form>
            <div className="save-load">
                <button type="button">Save</button>
                <button type="button">Reset</button>
            </div>
        </Fragment>
    `
}

// Cast our spell, bringing the FeatureAdder to life within the digital ether
render(html`<${FeatureAdder} />`, document.getElementById('feature-editor'))
