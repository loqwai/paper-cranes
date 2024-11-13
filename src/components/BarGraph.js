import { html } from 'htm/preact'
import { useState } from 'preact/hooks'
import { AudioFeatures } from '../audio/AudioProcessor'

const FEATURE_SUFFIXES = ['Normalized', 'ZScore', 'Mean', 'StandardDeviation', 'Median', 'Min', 'Max']

const BarGraph = ({ features }) => {
    const [selectedFeature, setSelectedFeature] = useState('all')
    const [selectedSuffix, setSelectedSuffix] = useState('all')

    const filterFeatures = (key, value) => {
        if (value === undefined) return false // Only filter undefined values, keep zeros

        // If "all" is selected for feature, show all features
        if (selectedFeature === 'all') {
            // If "all" is selected for suffix, show all suffixes
            if (selectedSuffix === 'all') return true
            return key.endsWith(selectedSuffix)
        }

        // Filter by feature
        const baseFeature = selectedFeature.charAt(0).toLowerCase() + selectedFeature.slice(1)
        if (!key.startsWith(baseFeature)) return false

        // If "all" is selected for suffix, show all suffixes for this feature
        if (selectedSuffix === 'all') return true

        // Filter by both feature and suffix
        return key.endsWith(selectedSuffix)
    }

    const renderBar = ([key, value]) => {
        const normalizedKey = key.replace(selectedSuffix === 'all' ? '' : selectedSuffix, '')
        const absValue = Math.abs(value)
        const width = Math.min(absValue * 50, 50)
        // if value is a boolean with a value of true, set it to 1. If false, set it to 0.
        if (typeof value === 'boolean') {
            value = value ? 1 : 0
        }
        const formattedValue = value.toFixed(2)

        return html`
            <div class="bar-row">
                <div class="negative-space">${value < 0 && html` <div class="bar negative" style=${`width: ${width}%`}></div> `}</div>
                <div class="feature-name">${normalizedKey}</div>
                <div class="positive-space">${value >= 0 && html` <div class="bar positive" style=${`width: ${width}%`}></div> `}</div>
                <div class="value">${formattedValue}</div>
            </div>
        `
    }

    const renderFeatureSelect = () => html`
        <select value=${selectedFeature} onChange=${(e) => setSelectedFeature(e.target.value)}>
            <option value="all">All Features</option>
            ${AudioFeatures.map((feature) => html`<option value=${feature}>${feature}</option>`)}
        </select>
    `

    const renderSuffixSelect = () => html`
        <select value=${selectedSuffix} onChange=${(e) => setSelectedSuffix(e.target.value)}>
            <option value="all">All Stats</option>
            ${FEATURE_SUFFIXES.map((suffix) => html`<option value=${suffix}>${suffix}</option>`)}
        </select>
    `

    const filteredFeatures = Object.entries(features || {})
        .filter(([key, value]) => filterFeatures(key, value))
        .sort(([a], [b]) => a.localeCompare(b))

    return html`
        <div class="bar-graph">
            <div class="filter-controls">${renderFeatureSelect()} ${renderSuffixSelect()}</div>
            ${filteredFeatures.map(renderBar)}
        </div>
    `
}

export default BarGraph
