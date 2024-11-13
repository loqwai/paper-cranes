const SMOOTHING_FACTOR = 0.1

function updateRange(range, value) {
    if (!range.min || !range.max) {
        range.min = range.max = value
    } else {
        range.min = range.min * (1 - SMOOTHING_FACTOR) + Math.min(value, range.min) * SMOOTHING_FACTOR
        range.max = range.max * (1 - SMOOTHING_FACTOR) + Math.max(value, range.max) * SMOOTHING_FACTOR
    }
}

export function normalizeAnalysisData(data) {
    const ranges = {}

    // First pass: update ranges with smoothing
    for (const entry of data) {
        for (const [key, value] of Object.entries(entry.features)) {
            if (typeof value !== 'number') continue

            if (!ranges[key]) {
                ranges[key] = {}
            }
            updateRange(ranges[key], value)
        }
    }

    // Second pass: normalize with smoothed ranges
    const normalized = data.map(entry => {
        const normalizedFeatures = {}

        for (const [key, value] of Object.entries(entry.features)) {
            if (typeof value !== 'number') {
                normalizedFeatures[key] = value
                continue
            }

            const { min, max } = ranges[key]
            if (Math.abs(max - min) < 1e-6) {
                normalizedFeatures[key] = 0
            } else {
                normalizedFeatures[key] = (value - min) / (max - min)
            }
        }

        return {
            timestamp: entry.timestamp,
            features: normalizedFeatures
        }
    })

    return { normalized, ranges }
}
