import { render } from 'preact'
import { useState, useCallback, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'

window.cranes = window.cranes || {}
window.cranes.setState = () => {} // Will be properly initialized below
const SAVE_FILE_NAME = 'cranes-manual-features'

const FeatureAdder = () => {
    return html`
        <div id="feature-editor">
            hi
            <div className="new-feature">
                <input type="text" placeholder="Enter new feature name" value=${newFeatureName} onInput=${(e) => setNewFeatureName(e.target.value)} />
                <button type="button" onClick=${addNewFeature}>Add Feature</button>
            </div>
            <form>
                ${Object.entries(features).map(
                    ([name, value]) => html`
                        <div className="edit-feature" key=${name}>
                            <label>${name}:</label>
                            <input type="number" value=${sliderRanges[name]?.min ?? -3} onInput=${(e) => updateSliderRange(name, e.target.value, sliderRanges[name]?.max ?? 3)} />
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
                <button type="button" onClick=${saveCode}>Save</button>
                <button type="button" onClick=${clearCode}>Reset</button>
            </div>
        </div>
    `
}

// Cast our spell, bringing the FeatureAdder to life within the digital ether
render(html`<${FeatureAdder} />`, document.getElementById('feature-editor'))
