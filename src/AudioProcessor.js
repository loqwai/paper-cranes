import {applyHanningWindow} from './applyHanningWindow.js';
export class AudioProcessor {
  // An array of strings of names of processors
  audioProcessors = [
    'Energy',
  ];
  thingsThatWork = [
    'SpectralFlux',
    'SpectralSpread',
    'SpectralCentroid',
  ];

  constructor(audioContext, sourceNode, fftSize = 2048) {
    this.audioContext = audioContext;
    this.sourceNode = sourceNode;
    this.fftSize = fftSize;
    this.rawFeatures = {};
    this.features = {};
    this.workers = {};

    this.fftAnalyzer = this.audioContext.createAnalyser();
    this.fftAnalyzer.fftSize = this.fftSize;  // Example size, can be adjusted
    this.fftData = new Uint8Array(this.fftAnalyzer.frequencyBinCount);
    // this.fftFloatData = new Float32Array(this.fftAnalyzer.frequencyBinCount);
    this.sourceNode.connect(this.fftAnalyzer);
    // Don't connect the fftAnalyzer to the audioContext's destination
  }

  getFrequencyData = () => {
    return this.fftData;
  }

  start = async () => {
    const timestamp = Date.now();
    for (const processor of this.audioProcessors) {
      await this.audioContext.audioWorklet.addModule(`/src/analyzers/${processor}.js?timestamp=${timestamp}`);
      console.log(`Audio worklet ${processor} added`);
      const audioProcessor = new AudioWorkletNode(this.audioContext, `Audio-${processor}`);
      this.sourceNode.connect(audioProcessor);
      // Don't connect the audioProcessor to the audioContext's destination
      audioProcessor.port.onmessage = event => this.rawFeatures[processor] = event.data;
    }
    for (const workerName of this.thingsThatWork) {
      const worker = new Worker(`/src/analyzers/${workerName}.js?timestamp=${timestamp}`);
      console.log(`Worker ${workerName} added`);
      worker.onmessage = (event) => {
        // console.log(`Worker ${workerName} message received`, event);;
        this.rawFeatures[workerName] = event.data;
      }
      this.workers[workerName] = worker;
    }

    this.pullFFTData();
  }

  setupFFT = () => {
    this.fftData = new Uint8Array(this.fftAnalyzer.frequencyBinCount);
  }

  pullFFTData = () => {
    // this.fftAnalyzer.getByteTimeDomainData(this.fftData);
    this.fftAnalyzer.getByteFrequencyData(this.fftData);
    this.windowedFftData = applyHanningWindow(this.fftData);

    for(const worker in this.workers) {
      this.workers[worker].postMessage(this.windowedFftData);
    }

    // this.fftAnalyzer.getFloatFrequencyData(this.fftFloatData);
    this.updateLegacyFeatures();
    requestAnimationFrame(this.pullFFTData);
  }
  updateLegacyFeatures = () => {
    this.features['spectralSpread'] = this.rawFeatures['SpectralSpread'] || 0;
    this.features['spectralCentroid'] = (this.rawFeatures['SpectralCentroid'] || 0)/4;
    this.features['spectralFlux'] = this.rawFeatures['SpectralFlux'] || 0;
    this.features['energy'] = this.rawFeatures['Energy'] || 0;
  }

}
