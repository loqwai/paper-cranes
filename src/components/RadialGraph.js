import { html } from 'htm/preact'
import { useState } from 'preact/hooks'
import { AudioFeatures } from '../audio/AudioProcessor'

const FEATURE_SUFFIXES = ['Normalized', 'ZScore', 'Mean', 'StandardDeviation', 'Median', 'Min', 'Max']

const RadialGraph = ({ features }) => {
    const [selectedFeature, setSelectedFeature] = useState('all')
    const [selectedSuffix, setSelectedSuffix] = useState('all')

    const filterFeatures = (key, value) => {
        if (value === undefined) return false

        if (selectedFeature === 'all') {
            if (selectedSuffix === 'all') return true
            return key.endsWith(selectedSuffix)
        }

        const baseFeature = selectedFeature.charAt(0).toLowerCase() + selectedFeature.slice(1)
        if (!key.startsWith(baseFeature)) return false

        if (selectedSuffix === 'all') return true
        return key.endsWith(selectedSuffix)
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

    const renderRadialGraph = () => {
        const filteredFeatures = Object.entries(features || {})
            .filter(([key, value]) => filterFeatures(key, value))
            .sort(([a], [b]) => a.localeCompare(b))

        const total = filteredFeatures.length
        const radius = 150
        const centerX = radius + 50
        const centerY = radius + 50

        return html`
            <svg width=${(radius + 50) * 2} height=${(radius + 50) * 2}>
                ${filteredFeatures.map(([key, value], index) => {
                    const angle = (index / total) * Math.PI * 2 - Math.PI / 2
                    const normalizedValue = typeof value === 'boolean' ? (value ? 1 : 0) : Math.min(Math.abs(value), 1)
                    const length = normalizedValue * radius

                    const x = centerX + Math.cos(angle) * length
                    const y = centerY + Math.sin(angle) * length

                    const labelRadius = radius + 20
                    const labelX = centerX + Math.cos(angle) * labelRadius
                    const labelY = centerY + Math.sin(angle) * labelRadius
                    const labelRotation = (angle * 180 / Math.PI) + (angle > Math.PI / 2 || angle < -Math.PI / 2 ? 180 : 0)

                    return html`
                        <line
                            x1=${centerX}
                            y1=${centerY}
                            x2=${x}
                            y2=${y}
                            stroke=${value < 0 ? '#f44336' : '#4caf50'}
                            stroke-width="2"
                        />
                        <text
                            x=${labelX}
                            y=${labelY}
                            text-anchor="middle"
                            transform="rotate(${labelRotation}, ${labelX}, ${labelY})"
                            fill="#fff"
                            font-size="10"
                        >${key}</text>
                    `
                })}
                <circle
                    cx=${centerX}
                    cy=${centerY}
                    r=${radius}
                    fill="none"
                    stroke="#333"
                    stroke-width="1"
                    stroke-dasharray="4,4"
                />
            </svg>
        `
    }

    return html`
        <div class="radial-graph">
            <div class="filter-controls">${renderFeatureSelect()} ${renderSuffixSelect()}</div>
            ${renderRadialGraph()}
        </div>
    `
}

export default RadialGraph
