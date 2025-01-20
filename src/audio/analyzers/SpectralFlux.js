import { makeCalculateStats, spectralFlux } from 'hypnosound'

let state = {
    calculateStats: makeCalculateStats(),
    previousSignal: new Float32Array(),
}

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        const { fft } = e.data

        if (!state.previousSignal.length) {
            state.previousSignal = new Float32Array(fft.length)
            return
        }

        const value = spectralFlux(fft, state.previousSignal)
        self.postMessage({id: e.id, type: 'computedValue', value, stats: state.calculateStats(value) })
    }
    if (e.type === 'config') {
        state.calculateStats = makeCalculateStats(e.config.historySize)
    }
})
