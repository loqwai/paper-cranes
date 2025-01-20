import { StatTypes } from 'hypnosound'
import { WorkerRPC } from './WorkerRPC'

export const AudioFeatures = [
    'SpectralCentroid',
    'SpectralFlux',
    'SpectralSpread',
    'SpectralRolloff',
    'SpectralRoughness',
    'SpectralKurtosis',
    'Energy',
    'SpectralEntropy',
    'SpectralCrest',
    'SpectralSkew',
    'PitchClass',
    'Bass',
    'Mids',
    'Treble',
]

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
    constructor(audioContext, sourceNode, historySize=500,  fftSize = 8192) {
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
        this.windowNode = null  // Track the window node
        this.isProcessing = false  // Track if we're already processing
    }

    createAnalyzer = () => {
        const analyzer = this.audioContext.createAnalyser()
        analyzer.smoothingTimeConstant = 0.7

        analyzer.fftSize = this.fftSize
        return analyzer
    }

    initializeWorker = async (name) => {
        const worker = new WorkerRPC(name, this.historySize)
        await worker.initialize()
        this.workers.set(name, worker)
        this.runWorkerLoop(worker)
    }

    runWorkerLoop = async (worker) => {
        if(this.audioContext.state !== 'running') {
            console.log('audio context is not running, resuming')
            await this.audioContext.resume()
        }
        const result = await worker.processData(this.fftData)
        if (result) {
            this.rawFeatures[result.workerName] = result
        }
        requestAnimationFrame(() => this.runWorkerLoop(worker));
    }

    updateCurrentFeatures = () => {
        requestAnimationFrame(this.updateCurrentFeatures)
        this.currentFeatures = getFlatAudioFeatures(AudioFeatures, this.rawFeatures)
        this.currentFeatures.beat = this.isBeat()
    }

    isBeat = () => {
        const spectralFlux = this.rawFeatures.SpectralFlux
        return spectralFlux?.stats.zScore > 0.9 || false
    }

    start = async () => {
        try {
            this.isProcessing = false

            // Ensure audio context is running
            if (this.audioContext.state !== 'running') {
                await this.audioContext.resume()
            }

            // Clean up existing connections
            this.cleanup()

            // Load window processor
            await this.audioContext.audioWorklet.addModule('src/window-processor.js')
            this.windowNode = new AudioWorkletNode(this.audioContext, 'window-processor', {
                processorOptions: {
                    numberOfInputs: 1,
                    numberOfOutputs: 1,
                    channelCount: 2
                }
            })

            // Connect audio chain
            this.sourceNode.connect(this.windowNode)
            this.windowNode.connect(this.fftAnalyzer)

            // Debug audio levels
            console.log('Audio setup:', {
                contextState: this.audioContext.state,
                sourceOutputs: this.sourceNode.numberOfOutputs,
                analyzerMinDecibels: this.fftAnalyzer.minDecibels,
                analyzerMaxDecibels: this.fftAnalyzer.maxDecibels
            })

            // Initialize workers
            await Promise.all(AudioFeatures.map(this.initializeWorker))

            this.isProcessing = true
            this.updateCurrentFeatures()
            this.updateFftData()
        } catch (error) {
            console.error('Error starting audio processor:', error)
            this.cleanup()
        }
    }

    updateFftData = () => {
        if (!this.isProcessing) return  // Stop if we're not supposed to be processing

        try {
            if (this.audioContext.state === 'running') {
                this.fftAnalyzer.getByteFrequencyData(this.fftData)
                const sum = this.fftData.reduce((acc, val) => acc + val, 0)

                if (sum === 0) {
                    console.log('sum is 0')
                    // Only log every 60 frames to avoid console spam
                    if (this.audioContext.currentTime % 60 === 0) {
                        console.warn('No audio data detected. Checking connections...')
                    }

                    // Attempt recovery
                    this.sourceNode.disconnect()
                    this.windowNode.disconnect()
                    this.sourceNode.connect(this.windowNode)
                    this.windowNode.connect(this.fftAnalyzer)
                }
            } else {
                console.warn('Audio context not running, attempting to resume...')
                this.audioContext.resume()
            }
        } catch (error) {
            console.error('Error in updateFftData:', error)
        }
        requestAnimationFrame(this.updateFftData)
    }

    getFeatures = () => this.currentFeatures

    cleanup = () => {
        this.isProcessing = false

        // Clean up audio nodes
        if (this.sourceNode) this.sourceNode.disconnect()
        if (this.windowNode) this.windowNode.disconnect()
        if (this.fftAnalyzer) this.fftAnalyzer.disconnect()

        // Clean up workers
        this.workers.forEach(worker => worker.terminate())
        this.workers.clear()
    }
}
