import { makeCalculateStats } from '../../utils/calculateStats'

let calculateStats = makeCalculateStats()

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        let fftData = e.data.fft // Extract FFT data from message
        let energy = calculateFFTEnergy(fftData) // Compute FFT energy
        if (energy === 0) return
        if (energy === null) return
        self.postMessage({ type: 'computedValue', value: energy, stats: calculateStats(energy) })
    }
    if (e.type === 'config') {
        calculateStats = makeCalculateStats(e.config.historySize)
    }
})

function calculateFFTEnergy(currentSignal) {
    let energy = 0
    for (let i = 0; i < currentSignal.length; i++) {
        let normalizedValue = currentSignal[i] / currentSignal.length
        energy += normalizedValue * normalizedValue
    }

    return energy * 10
}
