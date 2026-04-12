import { StatTypes, AudioFeatures } from 'hypnosound'
import { WorkerRPC } from './WorkerRPC.js'

// Workers compute these but hypnosound's StatTypes doesn't include them
const AllStatTypes = [...StatTypes, 'slope', 'intercept', 'rSquared']

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
                const smoothingFactor = key.includes('ZScore') || key.includes('Normalized')
                    ? currentSmoothing * 1.5
                    : currentSmoothing

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

    isBeat = () => {
        const spectralFlux = this.rawFeatures.spectralFlux
        return spectralFlux?.stats.zScore > 0.9 || false
    }

    start = async () => {
        await this.audioContext.audioWorklet.addModule('/window-processor.js')
        const windowNode = new AudioWorkletNode(this.audioContext, 'window-processor')

        this.sourceNode.connect(windowNode)
        windowNode.connect(this.fftAnalyzer)
        await Promise.all(AudioFeatures.map(name => this.initializeWorker(name)))

        this.updateCurrentFeatures()
        this.updateFftData()
        if(navigator.userAgent.toLowerCase().includes('firefox')) this.enableMicDisconnectionMitigations()

    }

    enableMicDisconnectionMitigations = () => {
        setInterval(async () => {
            const newStream = await navigator.mediaDevices.getUserMedia({ audio: true })
            this.sourceNode = this.audioContext.createMediaStreamSource(newStream)
            this.sourceNode.connect(this.fftAnalyzer)

        }, 5000)
    }

    updateFftData = () => {
        requestAnimationFrame(this.updateFftData)
        this.fftAnalyzer.getByteFrequencyData(this.fftData)
        // Broadcast FFT data to all workers (fire-and-forget)
        this.workers.forEach(worker => {
            worker.setHistorySize(this.historySize)
            worker.sendData(this.fftData)
        })
    }

    getFeatures = () => this.currentFeatures

    cleanup = () => {
        this.workers.forEach(worker => worker.terminate())
        this.workers.clear()
    }
}
