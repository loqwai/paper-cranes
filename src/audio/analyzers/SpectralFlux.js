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

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        let fftData = e.data.fft // Extract FFT data from message
        let computed = calculateSpectralFlux(fftData) // Process FFT data
        if (computed === null) return
        self.postMessage({ type: 'computedValue', value: computed, stats: calculateStats(computed) })
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
