// Web Worker script for processing FFT data.

let historySize = 500 // Define history size
let queue = []
let sum = 0
let sumOfSquares = 0
let minQueue = []
let maxQueue = []

function updateMinMaxQueues(value) {
    while (minQueue.length && minQueue[minQueue.length - 1] > value) {
        minQueue.pop()
    }
    while (maxQueue.length && maxQueue[maxQueue.length - 1] < value) {
        maxQueue.pop()
    }
    minQueue.push(value)
    maxQueue.push(value)
}

function removeOldFromMinMaxQueues(oldValue) {
    if (minQueue[0] === oldValue) {
        minQueue.shift()
    }
    if (maxQueue[0] === oldValue) {
        maxQueue.shift()
    }
}

function calculateStats(value) {
    if (typeof value !== 'number') throw new Error('Input must be a number')

    updateMinMaxQueues(value)

    queue.push(value)
    sum += value
    sumOfSquares += value * value

    if (queue.length > historySize) {
        let removed = queue.shift()
        sum -= removed
        sumOfSquares -= removed * removed
        removeOldFromMinMaxQueues(removed)
    }

    let mean = sum / queue.length
    let variance = sumOfSquares / queue.length - mean * mean
    let min = minQueue.length ? minQueue[0] : Infinity
    let max = maxQueue.length ? maxQueue[0] : -Infinity

    return {
        normalized: queue.length && max !== min ? (value - min) / (max - min) : 0,
        mean,
        standardDeviation: Math.sqrt(variance),
        zScore: (variance ? (value - mean) / Math.sqrt(variance) : 0) / 3,
        min,
        max,
    }
}

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        let fftData = e.data.fft // Extract FFT data from message
        let energy = calculateFFTEnergy(fftData) // Compute FFT energy
        if (energy === 0) return
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
