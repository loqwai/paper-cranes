import { StatTypes, AudioFeatures } from 'hypnosound'
import { WorkerRPC } from './WorkerRPC.js'
import { OnsetProcessor } from './OnsetProcessor.js'

// Workers compute the regression stats. hypnosound's StatTypes lists them from
// 1.10 on; the Set keeps one copy whichever version is loaded.
const AllStatTypes = [...new Set([...StatTypes, 'slope', 'intercept', 'rSquared'])]

// Neutral values for each stat type during warm-up (what the shader sees when audio hasn't "arrived" yet)
const neutralValues = {
    ZScore: 0,
    Normalized: 0.5,
    Mean: 0,
    Median: 0,
    Min: 0,
    Max: 0,
    StandardDeviation: 0,
    Slope: 0,
    Intercept: 0,
    RSquared: 0,
}

// Returns the neutral value for a given feature key based on its stat suffix
const getNeutralValue = (key) => {
    for (const [suffix, value] of Object.entries(neutralValues)) {
        if (key.endsWith(suffix)) return value
    }
    return 0 // raw values (e.g. "bass", "energy") ramp from 0
}

const WARMUP_FRAMES = 120 // ~2 seconds at 60fps

export const getFlatAudioFeatures = (audioFeatures = AudioFeatures, rawFeatures = {}) => {
    const features = {}
    for (const feature of audioFeatures) {
        const featureKey = feature.charAt(0).toLowerCase() + feature.slice(1)
        for (const propertyKey of AllStatTypes) {
            const key = `${featureKey}${propertyKey.charAt(0).toUpperCase() + propertyKey.slice(1)}`
            features[key] = rawFeatures[feature]?.stats[propertyKey]
        }
        features[featureKey] = rawFeatures[feature]?.stats?.current
    }
    return features
}

export class AudioProcessor {
    constructor(audioContext, sourceNode, historySize=500,  fftSize = 4096) {
        this.audioContext = audioContext
        this.sourceNode = sourceNode
        this.fftSize = fftSize
        this.historySize = historySize
        this.fftAnalyzer = this.createAnalyzer()
        this.fftData = new Uint8Array(this.fftAnalyzer.frequencyBinCount)
        this.workers = new Map()
        this.rawFeatures = {}
        this.currentFeatures = getFlatAudioFeatures()
        this.currentFeatures.beat = false
        this.smoothedFeatures = {}
        this.smoothingFactor = 0.10 // Lower = smoother, higher = more responsive
        this.warmupFrame = 0
        // Event-driven layer. Runs on the raw spectrum in updateFftData, ahead of
        // both the worker hop and the EMA below, so its triggers are as early as
        // this pipeline can produce. See OnsetProcessor.js for why that matters.
        this.onsetProcessor = new OnsetProcessor(audioContext.sampleRate, this.fftAnalyzer.frequencyBinCount)
        this.onsetFeatures = {}
    }

    createAnalyzer = () => {
        const analyzer = this.audioContext.createAnalyser()
        analyzer.smoothingTimeConstant = 0.4
        analyzer.minDecibels = -100
        analyzer.maxDecibels = -30
        analyzer.fftSize = this.fftSize
        return analyzer
    }

    initializeWorker = async (name) => {
        const worker = new WorkerRPC(name, this.historySize)
        await worker.initialize()
        this.workers.set(name, worker)
    }

    updateCurrentFeatures = () => {
        if (this.stopped) return
        requestAnimationFrame(this.updateCurrentFeatures)

        // Pull latest results from workers (no allocations, just reference swaps)
        this.workers.forEach((worker, name) => {
            this.rawFeatures[name] = worker.getResult()
        })

        const newFeatures = getFlatAudioFeatures(AudioFeatures, this.rawFeatures)

        // Check for manual override of smoothing factor
        const currentSmoothing = window.cranes?.manualFeatures?.smoothing ?? this.smoothingFactor

        // Apply exponential smoothing to reduce jitter
        for (const key in newFeatures) {
            if (typeof newFeatures[key] === 'number' && isFinite(newFeatures[key])) {
                // pitchClass is categorical (which note) — smoothing it is meaningless
                if (key.startsWith('pitchClass')) {
                    this.currentFeatures[key] = newFeatures[key]
                    continue
                }

                // Initialize smoothed value if it doesn't exist
                if (!(key in this.smoothedFeatures)) {
                    this.smoothedFeatures[key] = newFeatures[key]
                }

                // Exponential smoothing formula
                // For z-scores and normalized values, use less smoothing to maintain responsiveness
                // Capped at 1 (no smoothing): a weight above 1 overshoots every step,
                // and ?smoothing=0.85 (audio_file's default before 2.1.0) * 1.5 = 1.275 pushed 0-1 features out of range.
                const smoothingFactor = Math.min(1, key.includes('ZScore') || key.includes('Normalized')
                    ? currentSmoothing * 1.5
                    : currentSmoothing)

                this.smoothedFeatures[key] = this.smoothedFeatures[key] * (1 - smoothingFactor) +
                                             newFeatures[key] * smoothingFactor

                this.currentFeatures[key] = this.smoothedFeatures[key]
            } else {
                this.currentFeatures[key] = newFeatures[key]
            }
        }

        // Warm-up ramp: ease features from neutral to real over WARMUP_FRAMES
        if (this.warmupFrame < WARMUP_FRAMES) {
            const t = this.warmupFrame / WARMUP_FRAMES
            const ramp = t * t * (3 - 2 * t) // smoothstep: smooth S-curve from 0 to 1

            for (const key in this.currentFeatures) {
                if (typeof this.currentFeatures[key] !== 'number') continue
                const neutral = getNeutralValue(key)
                this.currentFeatures[key] = neutral + (this.currentFeatures[key] - neutral) * ramp
            }

            this.warmupFrame++
        }

        this.historySize = window.cranes?.manualFeatures?.history_size ?? this.historySize
        this.currentFeatures.beat = this.warmupFrame >= WARMUP_FRAMES && this.isBeat()
    }

    // hypnosound reports zScore 1 when its history is flat (max === min), which is
    // exactly what silence or a still-suspended AudioContext produces. A flat
    // history has no spike in it, so it is never a beat.
    isBeat = () => {
        const stats = this.rawFeatures.spectralFlux?.stats
        if (!stats || stats.max === stats.min) return false
        return stats.zScore > 0.9
    }

    start = async () => {
        await this.audioContext.audioWorklet.addModule('/window-processor.js')
        const windowNode = new AudioWorkletNode(this.audioContext, 'window-processor')

        this.sourceNode.connect(windowNode)
        windowNode.connect(this.fftAnalyzer)
        await Promise.all(AudioFeatures.map(name => this.initializeWorker(name)))

        this.updateCurrentFeatures()
        this.updateFftData()
    }

    updateFftData = () => {
        if (this.stopped) return
        requestAnimationFrame(this.updateFftData)
        this.fftAnalyzer.getByteFrequencyData(this.fftData)
        // Onsets first, on the freshest possible spectrum. Deliberately NOT
        // smoothed and NOT sent through a worker: a trigger is an event, and
        // delaying an event is the one thing that cannot be undone downstream.
        this.onsetProcessor.process(this.fftData, performance.now(), this.onsetFeatures)
        // Broadcast FFT data to all workers (fire-and-forget)
        this.workers.forEach(worker => {
            worker.setHistorySize(this.historySize)
            worker.sendData(this.fftData)
        })
    }

    // Onset features are merged at read time rather than written into
    // currentFeatures, so the EMA loop above can never touch them. Smoothing an
    // envelope would re-introduce exactly the lag this layer exists to remove.
    getFeatures = () => Object.assign(this.currentFeatures, this.onsetFeatures)

    cleanup = () => {
        this.stopped = true // ends both frame loops on their next tick
        this.workers.forEach(worker => worker.terminate())
        this.workers.clear()
    }
}
