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
        let computed = calculateSpectralFlux(fftData) // Process FFT data
        if (computed === null) return
        self.postMessage({ type: 'computedValue', value: computed, stats: set(computed) })
    }
    if (e.type === 'config') {
        historySize = e.config.historySize
    }
})

// calculations specific to the analyzer go here

let previousSignal = null
function calculateSpectralFlux(currentSignal) {
    if (!previousSignal) {
        previousSignal = currentSignal
        return null
    }

    let sf = 0
    for (let i = 0; i < currentSignal.length; i++) {
        const diff = Math.abs(currentSignal[i]) - Math.abs(previousSignal[i])
        sf += (diff + Math.abs(diff)) / 2
    }

    // Update the previous signal for the next call
    previousSignal = currentSignal

    return sf
}
