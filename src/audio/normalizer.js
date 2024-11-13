export function normalizeAnalysisData(data) {
    // Collect min/max for each property
    const ranges = {}

    // First pass: find min/max values
    for (const entry of data) {
        for (const [key, value] of Object.entries(entry.features)) {
            if (typeof value !== 'number') continue

            if (!ranges[key]) {
                ranges[key] = { min: value, max: value }
            } else {
                ranges[key].min = Math.min(ranges[key].min, value)
                ranges[key].max = Math.max(ranges[key].max, value)
            }
        }
    }

    // Second pass: normalize values
    const normalized = data.map(entry => {
        const normalizedFeatures = {}

        for (const [key, value] of Object.entries(entry.features)) {
            if (typeof value !== 'number') {
                normalizedFeatures[key] = value
                continue
            }

            const { min, max } = ranges[key]
            if (min === max) {
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
