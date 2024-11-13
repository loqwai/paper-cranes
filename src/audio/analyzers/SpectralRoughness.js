import { makeCalculateStats, spectralRoughness } from 'hypnosound'

const WINDOW_SIZE = 5
let previousValues = []
let calculateStats = makeCalculateStats()

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        const { fft } = e.data
        const value = spectralRoughness(fft)

        previousValues.push(value)
        if (previousValues.length > WINDOW_SIZE) {
            previousValues.shift()
        }
        const smoothedValue = previousValues.reduce((a, b) => a + b, 0) / previousValues.length

        self.postMessage({ type: 'computedValue', value: smoothedValue, stats: calculateStats(smoothedValue) })
    }
    if (e.type === 'config') {
        calculateStats = makeCalculateStats(e.config.historySize)
        previousValues = []
    }
})
