import { html } from 'htm/preact'

const BarGraph = ({ features }) => {
    // Filter for only zScore properties and sort alphabetically
    const zScoreFeatures = Object.entries(features || {})
        .filter(([key, value]) => key.endsWith('ZScore') && value !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))

    return html`
        <div class="bar-graph">
            ${zScoreFeatures.map(([key, value]) => {
                const normalizedKey = key.replace('ZScore', '')
                const absValue = Math.abs(value)
                const width = Math.min(absValue * 50, 50) // Scale to max 50% of container

                return html`
                    <div class="bar-row">
                        <div class="negative-space">
                            ${value < 0 && html`
                                <div
                                    class="bar negative"
                                    style=${`width: ${width}%`}
                                ></div>
                            `}
                        </div>
                        <div class="feature-name">${normalizedKey}</div>
                        <div class="positive-space">
                            ${value > 0 && html`
                                <div
                                    class="bar positive"
                                    style=${`width: ${width}%`}
                                ></div>
                            `}
                        </div>
                        <div class="value">${value.toFixed(2)}</div>
                    </div>
                `
            })}
        </div>
    `
}

export default BarGraph
