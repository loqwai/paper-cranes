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
        let energy = calculateFFTEnergy(fftData) // Compute FFT energy
        if (energy === 0) throw new Error(e.data.fft)
        if (energy === null) return
        self.postMessage({ type: 'computedValue', value: energy, stats: calculateStats(energy) })
    }
    if (e.type === 'config') {
        historySize = e.config.historySize
    }
})

function calculateFFTEnergy(currentSignal) {
    let energy = 0
    for (let i = 0; i < currentSignal.length; i++) {
        let normalizedValue = currentSignal[i] / currentSignal.length
        energy += normalizedValue * normalizedValue
    }

    return energy
}
