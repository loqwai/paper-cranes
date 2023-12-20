let historySize = 500, // Define history size
    queue = [],
    sum = 0,
    sumOfSquares = 0,
    min = Infinity,
    max = -Infinity

function set(value) {
    if (typeof value !== 'number') throw new Error('Input must be a number')
    min = Math.min(min, value)
    max = Math.max(max, value)
    queue.push(value)
    sum += value
    sumOfSquares += value * value

    if (queue.length > historySize) {
        let removed = queue.shift()
        sum -= removed
        sumOfSquares -= removed * removed
        if (removed === min || removed === max) {
            min = Math.min(...queue)
            max = Math.max(...queue)
        }
    }

    let mean = sum / queue.length,
        variance = sumOfSquares / queue.length - mean * mean
    return {
        normalized: (value - min) / (max - min || 1),
        mean: mean,
        standardDeviation: Math.sqrt(variance),
        zScore: (value - mean) / Math.sqrt(variance || 1),
        min: min === Infinity ? -1 : min,
        max: max === -Infinity ? -1 : max,
    }
}

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        let fftData = e.data.fft // Extract FFT data from message
        let computed = calculateSpectralSpread(fftData) // Process FFT data
        self.postMessage({ type: 'computedValue', value: computed, stats: set(computed) })
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
    const meanFrequency = mu(1, fftData, sampleRate, fftSize)
    const secondMoment = mu(2, fftData, sampleRate, fftSize)

    return Math.sqrt(secondMoment - Math.pow(meanFrequency, 2))
}
