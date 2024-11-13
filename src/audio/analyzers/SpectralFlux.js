import { makeCalculateStats, spectralFlux } from 'hypnosound'

const WINDOW_SIZE = 5 // Number of samples to average
let previousValues = []
let calculateStats = makeCalculateStats()

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        const { fft } = e.data
        const value = spectralFlux(fft)

        // Apply moving average
        previousValues.push(value)
        if (previousValues.length > WINDOW_SIZE) {
            previousValues.shift()
        }
        const smoothedValue = previousValues.reduce((a, b) => a + b, 0) / previousValues.length

        self.postMessage({
            type: 'computedValue',
            value: smoothedValue,
            stats: calculateStats(smoothedValue)
        })
    }
    if (e.type === 'config') {
        calculateStats = makeCalculateStats(e.config.historySize)
        previousValues = [] // Reset buffer on config change
    }
})
