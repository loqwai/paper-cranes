import { treble, makeCalculateStats } from 'hypnosound'

let state = {
    calculateStats: makeCalculateStats()
}

self.addEventListener('message', ({ data: e }) => {
    switch (e.type) {
        case 'fftData':
            const { fft } = e.data // Extract FFT data from message
            const value = treble(fft)
            self.postMessage({
                id: e.id,
                type: 'computedValue',
                value,
                stats: state.calculateStats(value)
            })
            break
        case 'config':
            state.calculateStats = makeCalculateStats(e.config.historySize)
            break
        case 'reset':
            state.calculateStats = makeCalculateStats()
            break
        case 'debug':
            self.postMessage({
                id: e.id,
                type: 'debug',
                value: state.calculateStats.queue
            })
            break
    }
})
