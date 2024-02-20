import { makeCalculateStats } from '../../utils/calculateStats'

let calculateStats = makeCalculateStats()

let lastFFtSize = 0
let maxSpread = 0

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        let fftData = e.data.fft // Extract FFT data from message

        if (lastFFtSize !== fftData.length) {
            maxSpread = calculateMaxSpread(fftData.length)
            lastFFtSize = fftData.length
        }

        let computed = calculateSpectralSpread(fftData) // Process FFT data
        self.postMessage({ type: 'computedValue', value: computed, stats: calculateStats(computed) })
    }
    if (e.type === 'config') {
        calculateStats = makeCalculateStats(e.config.historySize)
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
function calculateMaxSpread(fftSize) {
    // Create a spectrum with energy at the two extremes
    const extremeSpectrum = new Array(fftSize).fill(0)
    extremeSpectrum[0] = 1 // Energy at the lowest frequency
    extremeSpectrum[fftSize - 1] = 1 // Energy at the highest frequency

    const meanFrequency = mu(1, extremeSpectrum)
    const secondMoment = mu(2, extremeSpectrum)

    return Math.sqrt(secondMoment - Math.pow(meanFrequency, 2))
}
function calculateSpectralSpread(fftData) {
    const meanFrequency = mu(1, fftData)
    const secondMoment = mu(2, fftData)

    const spread = Math.sqrt(secondMoment - Math.pow(meanFrequency, 2))
    // Normalize the spread
    return maxSpread ? spread / maxSpread : 0
}
