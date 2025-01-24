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
    constructor(audioContext, sourceNode, historySize=500,  fftSize = 32768/2) {
        this.audioContext = audioContext
        this.sourceNode = sourceNode

        // Test source node immediately
        const testProcessor = this.audioContext.createScriptProcessor(1024, 1, 1);
        testProcessor.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            console.log('Direct source test:', {
                hasData: input.some(x => x !== 0),
                maxValue: Math.max(...input),
                minValue: Math.min(...input)
            });
        };
        this.sourceNode.connect(testProcessor);
        testProcessor.connect(this.audioContext.destination);

        // Disconnect after 1 second
        setTimeout(() => {
            this.sourceNode.disconnect(testProcessor);
            testProcessor.disconnect();
        }, 1000);

        // Add state verification
        console.log('Audio Context State:', {
            state: audioContext.state,
            sampleRate: audioContext.sampleRate,
            sourceChannels: sourceNode.channelCount,
            sourceActive: sourceNode.numberOfOutputs > 0,
            sourceNode: sourceNode instanceof MediaStreamAudioSourceNode ? 'MediaStream' : 'Other'
        });

        // Add stream track monitoring
        if (sourceNode instanceof MediaStreamAudioSourceNode) {
            const stream = sourceNode.mediaStream;
            console.log('Audio tracks:', stream.getAudioTracks().map(track => ({
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
                label: track.label
            })));

            stream.getAudioTracks().forEach(track => {
                track.onended = () => console.log('Audio track ended');
                track.onmute = () => console.log('Audio track muted');
                track.onunmute = () => console.log('Audio track unmuted');
            });
        }

        this.fftSize = fftSize
        this.historySize = historySize
        this.fftAnalyzer = this.createAnalyzer()
        this.fftData = new Uint8Array(this.fftAnalyzer.frequencyBinCount)

        // Monitor audio context state changes
        this.audioContext.onstatechange = () => {
            console.log('Audio Context state changed:', this.audioContext.state);
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(console.error);
            }
        };

        // Monitor source node
        this.sourceNode.onended = () => {
            console.error('Source node ended - attempting to reconnect');
            this.reconnectAudio().catch(console.error);
        };

        this.workers = new Map()
        this.rawFeatures = {}
        this.currentFeatures = getFlatAudioFeatures()
        this.currentFeatures.beat = false

        // Add signal monitoring
        this.monitorNode = this.audioContext.createScriptProcessor(1024, 1, 1);
        this.monitorNode.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            const max = Math.max(...input);
            const min = Math.min(...input);
            const rms = Math.sqrt(input.reduce((acc, val) => acc + val * val, 0) / input.length);

            if (rms > 0.0001) {  // Only log when there's significant signal
                console.log('Signal monitor:', { max, min, rms });
            }
        };

        this.sourceNode.connect(this.monitorNode);
        this.monitorNode.connect(this.audioContext.destination);
    }

    createAnalyzer = () => {
        const analyzer = this.audioContext.createAnalyser()
        analyzer.smoothingTimeConstant = 0.8
        analyzer.minDecibels = -90
        analyzer.maxDecibels = -10
        analyzer.fftSize = this.fftSize

        // Add periodic analyzer state check
        setInterval(() => {
            const data = new Float32Array(analyzer.frequencyBinCount);
            analyzer.getFloatFrequencyData(data);
            const maxDb = Math.max(...data);
            if (maxDb > -90) {
                console.log('Analyzer receiving signal:', {
                    maxDb,
                    binCount: analyzer.frequencyBinCount,
                    currentMinDb: analyzer.minDecibels,
                    currentMaxDb: analyzer.maxDecibels
                });
            }
        }, 1000);

        return analyzer
    }

    initializeWorker = async (name) => {
        const worker = new WorkerRPC(name, this.historySize)
        await worker.initialize()
        this.workers.set(name, worker)
        this.runWorkerLoop(worker)
    }

    runWorkerLoop = async (worker) => {
        try {
            worker.setHistorySize(this.historySize);

            const result = await worker.processData(this.fftData)

            if(!result) {
                noResultCount++;
                console.error(`worker returned no result for ${worker.name}`)
                if(noResultCount > 10) {
                    await this.restartWorker(worker);
                    noResultCount = 0;
                    return;
                }
            } else {
                noResultCount = 0;
                // console.log(`Got result from ${worker.name}:`, result.stats?.current);
                this.rawFeatures[result.workerName] = result;
            }
        } catch (error) {
            console.error(`Worker error for ${worker.name}:`, error);
            await this.restartWorker(worker);
        }
        requestAnimationFrame(() => this.runWorkerLoop(worker));
    }

    restartWorker = async (worker) => {
        console.log(`Restarting worker ${worker.name}`);
        worker.terminate();
        this.workers.delete(worker.name);
        await this.initializeWorker(worker.name);
    }

    updateCurrentFeatures = () => {
        requestAnimationFrame(this.updateCurrentFeatures)
        this.currentFeatures = getFlatAudioFeatures(AudioFeatures, this.rawFeatures)
        this.historySize = window.cranes?.manualFeatures?.history_size ?? this.historySize;
        this.currentFeatures.beat = this.isBeat()
    }

    isBeat = () => {
        const spectralFlux = this.rawFeatures.SpectralFlux
        return spectralFlux?.stats.zScore > 0.9 || false
    }

    start = async () => {
        try {
            if (this.audioContext.state !== 'running') {
                await this.audioContext.resume();
            }

            await this.audioContext.audioWorklet.addModule('src/window-processor.js')

            // Create window node with more explicit options
            this.windowNode = new AudioWorkletNode(this.audioContext, 'window-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                channelCount: 1,
                channelCountMode: 'explicit',
                channelInterpretation: 'speakers',
                processorOptions: {
                    debugMode: true
                }
            });

            // Connect with gain nodes to ensure proper routing
            const inputGain = this.audioContext.createGain();
            const outputGain = this.audioContext.createGain();

            console.log('Creating audio chain...');
            this.sourceNode.connect(inputGain);
            inputGain.connect(this.windowNode);
            this.windowNode.connect(outputGain);
            outputGain.connect(this.fftAnalyzer);

            // Test tone through the whole chain
            const oscillator = this.audioContext.createOscillator();
            oscillator.frequency.value = 440;
            oscillator.connect(inputGain);
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                oscillator.disconnect();
            }, 1000);

            // Initialize workers with explicit names
            const workerInitPromises = AudioFeatures.map(featureName => {
                console.log(`Initializing worker for ${featureName}`);
                return this.initializeWorker(featureName);
            });

            await Promise.all(workerInitPromises);
            console.log('All workers initialized');

            this.updateCurrentFeatures()
            this.updateFftData()
        } catch (error) {
            console.error('Error starting audio processor:', error);
        }
    }

    updateFftData = () => {
        requestAnimationFrame(this.updateFftData)

        // Check both time and frequency domain
        const timeData = new Float32Array(this.fftAnalyzer.fftSize);
        this.fftAnalyzer.getFloatTimeDomainData(timeData);
        this.fftAnalyzer.getByteFrequencyData(this.fftData)

        const timeSum = timeData.reduce((a,b) => a + Math.abs(b), 0);
        const freqSum = this.fftData.reduce((a,b) => a+b, 0);

        // Log only if we haven't seen signal for a while
        if ((timeSum === 0 || freqSum === 0) &&
            (!this.lastNoSignalLog || performance.now() - this.lastNoSignalLog > 5000)) {
            this.lastNoSignalLog = performance.now();
            console.warn('No audio signal detected for 5 seconds');
            this.checkAudioChain();
        }
    }

    getFeatures = () => this.currentFeatures

    cleanup = () => {
        this.workers.forEach(worker => worker.terminate())
        this.workers.clear()
    }

    // Add new method to handle reconnection
    reconnectAudio = async () => {
        try {
            console.log('Attempting to reconnect audio...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: true
                }
            });

            this.sourceNode = this.audioContext.createMediaStreamSource(stream);
            this.sourceNode.connect(this.windowNode);
            console.log('Audio reconnected successfully');
        } catch (error) {
            console.error('Failed to reconnect audio:', error);
        }
    }

    // Add method to check audio chain
    checkAudioChain = () => {
        console.log('Checking audio chain:', {
            contextState: this.audioContext.state,
            sourceConnected: this.sourceNode.numberOfOutputs > 0,
            analyzerConnected: this.fftAnalyzer.numberOfInputs > 0,
            windowNodeConnected: this.windowNode.numberOfInputs > 0,
            currentTime: this.audioContext.currentTime
        });
    }
}
