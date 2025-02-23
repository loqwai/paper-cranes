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

let noResultCount = 0;
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
    constructor(audioContext, sourceNode, historySize=500,  fftSize = 1024) {
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
    }

    createAnalyzer = () => {
        const analyzer = this.audioContext.createAnalyser()
        analyzer.smoothingTimeConstant = 0.8
        analyzer.minDecibels = -100
        analyzer.maxDecibels = -30
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
        if(worker.historySize !== this.historySize) {
            worker.setHistorySize(this.historySize);
        }
        if(worker.processing)  {
            console.warn(`${worker.workerName} is already processing`)
            return requestAnimationFrame(() => this.runWorkerLoop(worker));
        }
        worker.processing = true;
        const result = await worker.processData(this.fftData)
        this.rawFeatures[result.workerName] = result
        worker.processing = false;
        requestAnimationFrame(() => this.runWorkerLoop(worker));
    }

    updateCurrentFeatures = () => {
        this.currentFeatures = getFlatAudioFeatures(AudioFeatures, this.rawFeatures)
        this.historySize = window.cranes?.manualFeatures?.history_size ?? this.historySize;
        this.currentFeatures.beat = this.isBeat()
        requestAnimationFrame(() => this.updateCurrentFeatures())
    }

    isBeat = () => {
        const spectralFlux = this.rawFeatures.SpectralFlux
        return spectralFlux?.stats.zScore > 0.9 || false
    }

    start = async () => {
        // await this.audioContext.audioWorklet.addModule('src/window-processor.js')
        // const windowNode = new AudioWorkletNode(this.audioContext, 'window-processor')

        this.sourceNode.connect(this.fftAnalyzer)
        // windowNode.connect(this.fftAnalyzer)
        const debugNode = this.audioContext.createScriptProcessor(256, 1, 1);
        debugNode.onaudioprocess = function (e) {
            const input = e.inputBuffer.getChannelData(0);
            console.log("PCM Sample Before FFT:", input[0]); // Should be non-zero if audio is active
        };
        this.sourceNode.connect(debugNode);

        AudioFeatures.map(this.initializeWorker)
        // await new Promise(resolve => setTimeout(resolve, 100))


        this.updateCurrentFeatures()
        this.updateFftData()
        setInterval(async () => {
            console.log(`audio context state: ${this.audioContext.state}`)
            console.log("Source Node State:", this.sourceNode.mediaStream.active);
                console.log("Re-initializing microphone...");
                const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.sourceNode = this.audioContext.createMediaStreamSource(newStream);
                this.sourceNode.connect(this.fftAnalyzer);

        }, 2000)
    }

    updateFftData = () => {
        this.fftAnalyzer.getByteFrequencyData(this.fftData)
        requestAnimationFrame(() => this.updateFftData())
    }

    getFeatures = () => this.currentFeatures
}
