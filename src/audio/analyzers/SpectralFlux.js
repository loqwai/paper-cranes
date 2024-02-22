import { makeCalculateStats } from '../../utils/calculateStats'
let calculateStats = makeCalculateStats()

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        let fftData = e.data.fft
        let computed = calculateSpectralFlux(fftData)
        if (computed === null) return
        self.postMessage({ type: 'computedValue', value: computed, stats: calculateStats(computed) })
    }
    if (e.type === 'config') {
        calculateStats = makeCalculateStats(e.config.historySize)
    }
})

let previousSignal = new Float32Array() // Initialize with zeros
function calculateSpectralFlux(currentSignal) {
    if (!previousSignal.length) {
        previousSignal = new Float32Array(currentSignal.length)
        return null
    }

    let sf = 0
    for (let i = 0; i < currentSignal.length; i++) {
        const diff = Math.abs(currentSignal[i]) - Math.abs(previousSignal[i])
        sf += (diff + Math.abs(diff)) / 2
    }
    previousSignal = currentSignal
    return sf / 30_000
}
