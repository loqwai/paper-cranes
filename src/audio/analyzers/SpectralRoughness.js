import { makeCalculateStats } from '../../utils/calculateStats'

let calculateStats = makeCalculateStats()

function calculateSpectralRoughness(fftData) {
    let roughness = 0

    for (let i = 1; i < fftData.length; i++) {
        // Calculate the difference in amplitude between adjacent frequency bins
        let diff = Math.abs(fftData[i] - fftData[i - 1])
        roughness += diff
    }

    return roughness
}

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        let fftData = e.data.fft // Extract FFT data from message

        // Process FFT data for roughness
        let computedRoughness = calculateSpectralRoughness(fftData)
        computedRoughness /= 100_000
        self.postMessage({ type: 'computedValue', value: computedRoughness, stats: calculateStats(computedRoughness) })
    }
    if (e.type === 'config') {
        calculateStats = makeCalculateStats(e.config.historySize)
    }
})
