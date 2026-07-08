import { StatTypes, AudioFeatures } from 'hypnosound'
import { WorkerRPC } from './WorkerRPC.js'
import { makeOnsetDetector, defaultOnsetConfig } from './onsetDetector.js'

let noResultCount = 0
export const getFlatAudioFeatures = (audioFeatures = AudioFeatures, rawFeatures = {}) => {
    const features = {}
    for (const feature of audioFeatures) {
        const featureKey = feature.charAt(0).toLowerCase() + feature.slice(1)
        for (const propertyKey of StatTypes) {
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
        this.urlSettings = Object.fromEntries(new URLSearchParams(window.location.search))
        this.onsetAnalyzer = this.createOnsetAnalyzer()
        this.onsetFftData = new Uint8Array(this.onsetAnalyzer.frequencyBinCount)
        this.detectOnset = makeOnsetDetector()
        this.workers = new Map()
        this.rawFeatures = {}
        this.currentFeatures = getFlatAudioFeatures()
        this.currentFeatures.beat = false
        this.currentFeatures.onset = false
        this.currentFeatures.timeSinceOnset = 1000
        this.currentFeatures.onsetStrength = 0
        this.currentFeatures.onsetFlux = 0
        this.currentFeatures.onsetThreshold = 0
        this.smoothedFeatures = {}
        this.smoothingFactor = 0.10 // Lower = smoother, higher = more responsive
    }

    createAnalyzer = () => {
        const analyzer = this.audioContext.createAnalyser()
        analyzer.smoothingTimeConstant = 0.4
        analyzer.minDecibels = -100
        analyzer.maxDecibels = -30
        analyzer.fftSize = this.fftSize
        return analyzer
    }

    // Detection needs fidelity, not smoothness: its own tap with no time smoothing
    // and a small FFT (~23ms window at 1024 vs ~85ms at 4096) so transients stay sharp.
    // The feature analyser keeps its smoothing — measurement and animation paths split here.
    createOnsetAnalyzer = () => {
        const analyzer = this.audioContext.createAnalyser()
        analyzer.smoothingTimeConstant = 0
        analyzer.minDecibels = -100
        analyzer.maxDecibels = -30
        analyzer.fftSize = parseInt(this.urlSettings.onset_fft_size ?? '1024')
        return analyzer
    }

    getOnsetConfig = () => {
        const manual = window.cranes?.manualFeatures ?? {}
        const setting = (key, fallback) => {
            const value = parseFloat(manual[key] ?? this.urlSettings[key])
            return isFinite(value) ? value : fallback
        }
        const nyquist = this.audioContext.sampleRate / 2
        const binCount = this.onsetAnalyzer.frequencyBinCount
        return {
            sensitivity: setting('onset_sensitivity', defaultOnsetConfig.sensitivity),
            ratio: setting('onset_ratio', defaultOnsetConfig.ratio),
            refractoryMs: setting('onset_refractory_ms', defaultOnsetConfig.refractoryMs),
            fluxFloor: setting('onset_flux_floor', defaultOnsetConfig.fluxFloor),
            lowBin: (setting('onset_low_hz', 0) / nyquist) * binCount,
            highBin: (setting('onset_high_hz', nyquist) / nyquist) * binCount,
        }
    }

    initializeWorker = async (name) => {
        const worker = new WorkerRPC(name, this.historySize)
        await worker.initialize()
        this.workers.set(name, worker)
        this.runWorkerLoop(worker)
    }

    runWorkerLoop = async (worker) => {
        worker.setHistorySize(this.historySize)
        const result = await worker.processData(this.fftData)
        if(!result) {
            noResultCount++
            console.error(`worker returned no result`)
            if(noResultCount > 150) {
                noResultCount = -Infinity
                window.location.reload()
                return
            }
            requestAnimationFrame(() => this.runWorkerLoop(worker))
            return
        }
        this.rawFeatures[result.workerName] = result
        requestAnimationFrame(() => this.runWorkerLoop(worker))
    }

    updateCurrentFeatures = () => {
        requestAnimationFrame(this.updateCurrentFeatures)
        const newFeatures = getFlatAudioFeatures(AudioFeatures, this.rawFeatures)
        
        // Check for manual override of smoothing factor
        const currentSmoothing = window.cranes?.manualFeatures?.smoothing ?? this.smoothingFactor
        
        // Apply exponential smoothing to reduce jitter
        for (const key in newFeatures) {
            if (typeof newFeatures[key] === 'number' && isFinite(newFeatures[key])) {
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
        
        this.historySize = window.cranes?.manualFeatures?.history_size ?? this.historySize
        this.currentFeatures.beat = this.isBeat()

        // Onset values bypass the smoothing above on purpose: they are events, not
        // measurements — the "animation" side shapes them (see onsetEnvelope in GLSL)
        this.onsetAnalyzer.getByteFrequencyData(this.onsetFftData)
        const { onset, flux, threshold, strength, timeSinceMs } = this.detectOnset(this.onsetFftData, performance.now(), this.getOnsetConfig())
        this.currentFeatures.onset = onset
        this.currentFeatures.timeSinceOnset = isFinite(timeSinceMs) ? timeSinceMs / 1000 : 1000
        this.currentFeatures.onsetStrength = strength
        this.currentFeatures.onsetFlux = flux
        this.currentFeatures.onsetThreshold = threshold
    }

    isBeat = () => {
        const spectralFlux = this.rawFeatures.SpectralFlux
        return spectralFlux?.stats.zScore > 0.9 || false
    }

    start = async () => {
        await this.audioContext.audioWorklet.addModule('/window-processor.js')
        const windowNode = new AudioWorkletNode(this.audioContext, 'window-processor')

        this.sourceNode.connect(windowNode)
        windowNode.connect(this.fftAnalyzer)
        windowNode.connect(this.onsetAnalyzer)
        AudioFeatures.map(this.initializeWorker)
        // await new Promise(resolve => setTimeout(resolve, 100))

        this.updateCurrentFeatures()
        this.updateFftData()
        if(navigator.userAgent.toLowerCase().includes('firefox')) this.enableMicDisconnectionMitigations()

    }

    enableMicDisconnectionMitigations = () => {
        setInterval(async () => {
            const newStream = await navigator.mediaDevices.getUserMedia({ audio: true })
            this.sourceNode = this.audioContext.createMediaStreamSource(newStream)
            this.sourceNode.connect(this.fftAnalyzer)
            this.sourceNode.connect(this.onsetAnalyzer)

        }, 5000)
    }

    updateFftData = () => {
        requestAnimationFrame(this.updateFftData)
        this.fftAnalyzer.getByteFrequencyData(this.fftData)
    }

    getFeatures = () => this.currentFeatures

    cleanup = () => {
        this.workers.forEach(worker => worker.terminate())
        this.workers.clear()
    }
}
