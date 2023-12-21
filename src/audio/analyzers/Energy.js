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
        let energy = calculateFFTEnergy(fftData) // Compute FFT energy
        if (energy === null) return
        self.postMessage({ type: 'computedValue', value: energy, stats: set(energy) })
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
