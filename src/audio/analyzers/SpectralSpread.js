let historySize = 500, // Define history size
    queue = [],
    sum = 0,
    sumOfSquares = 0,
    min = Infinity,
    max = -Infinity

function calculateStats(value) {
    if (typeof value !== 'number') throw new Error('Input must be a number')

    // Add new value to the queue
    queue.push(value)
    sum += value
    sumOfSquares += value * value

    // Update min and max
    min = Math.min(min, value)
    max = Math.max(max, value)

    // Remove old value if queue exceeds history size
    if (queue.length > historySize) {
        let removed = queue.shift()
        sum -= removed
        sumOfSquares -= removed * removed

        // Recalculate min and max if necessary
        if (removed === min || removed === max) {
            min = queue.length ? Math.min(...queue) : Infinity
            max = queue.length ? Math.max(...queue) : -Infinity
        }
    }

    let mean = sum / queue.length
    let variance = sumOfSquares / queue.length - mean * mean

    return {
        normalized: queue.length && max !== min ? (value - min) / (max - min) : 0,
        mean,
        standardDeviation: Math.sqrt(variance),
        zScore: variance ? (value - mean) / Math.sqrt(variance) : 0,
        min: min,
        max: max,
    }
}

let lastFFtSize = 0
let maxSpread = 0

function calculateMaxSpread(fftSize) {
    // Create a spectrum with energy at the two extremes
    const extremeSpectrum = new Array(fftSize).fill(0)
    extremeSpectrum[0] = 1 // Energy at the lowest frequency
    extremeSpectrum[fftSize - 1] = 1 // Energy at the highest frequency

    const meanFrequency = mu(1, extremeSpectrum)
    const secondMoment = mu(2, extremeSpectrum)

    return Math.sqrt(secondMoment - Math.pow(meanFrequency, 2))
}

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        let fftData = e.data.fft // Extract FFT data from message

        if (lastFFtSize !== fftData.length) maxSpread = calculateMaxSpread(fftData.length)
        lastFFtSize = fftData.length

        let computed = calculateSpectralSpread(fftData) // Process FFT data
        self.postMessage({ type: 'computedValue', value: computed, stats: calculateStats(computed) })
    }
    if (e.type === 'config') {
        historySize = e.config.historySize
    }
})

function mu(i, amplitudeSpect) {
    let numerator = 0
    let denominator = 0

    for (let k = 0; k < amplitudeSpect.length; k++) {
        numerator += Math.pow(k, i) * Math.abs(amplitudeSpect[k])
        denominator += amplitudeSpect[k]
    }

    if (denominator === 0) return 0 // Prevent division by zero
    return numerator / denominator
}

function calculateSpectralSpread(fftData, sampleRate, fftSize) {
    const meanFrequency = mu(1, fftData)
    const secondMoment = mu(2, fftData)

    const spread = Math.sqrt(secondMoment - Math.pow(meanFrequency, 2))
    // Normalize the spread
    return spread / maxSpread
}
