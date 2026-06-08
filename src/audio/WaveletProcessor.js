// WaveletProcessor.js
// PROTOTYPE — isolated multiresolution (DWT) analysis running alongside the FFT
// pipeline. Gated behind ?wavelet=true. Publishes octave-band energies + a sharp
// onset signal as float uniforms via window.cranes.waveletFeatures.
//
// Exposed uniforms (low→high octave band):
//   wavelet_band0 .. wavelet_band5      RMS energy per octave detail band
//   wavelet_band0Z .. wavelet_band5Z    per-band z-score (spiking vs own baseline)
//   wavelet_onset                       sharp transient signal (finest-band positive flux)
//   wavelet_onsetSmooth                 lightly smoothed onset (for non-strobing visuals)
//   wavelet_bass                        coarse approximation energy
//
// Nothing here touches AudioProcessor.js or hypnosound.

const NUM_BANDS = 6 // we surface this many bands; deeper ones are merged into bass

export class WaveletProcessor {
    constructor(audioContext, sourceNode) {
        this.audioContext = audioContext
        this.sourceNode = sourceNode
        this.worker = new Worker(new URL('./waveletWorker.js', import.meta.url), { type: 'module' })
        this.latest = null
        this.onsetSmooth = 0
        this.worker.onmessage = (e) => { this.latest = e.data }
    }

    start = async () => {
        await this.audioContext.audioWorklet.addModule('/raw-tap-processor.js')
        const tapNode = new AudioWorkletNode(this.audioContext, 'raw-tap-processor')
        tapNode.port.onmessage = (e) => this.worker.postMessage(e.data)
        // Tap the source directly (raw, un-windowed). The node has no audible output
        // path of its own — we don't connect it to destination.
        this.sourceNode.connect(tapNode)
        this.publish()
    }

    publish = () => {
        requestAnimationFrame(this.publish)
        if (!this.latest) return

        const { bands, zScores, onset, bassEnergy, bassZ, approxEnergy } = this.latest
        // onset here = the deep-bass HIT signal (sharp positive jump in low-band energy).
        // Intentionally NOT smoothed hard — sharpness is the whole point of a hit.
        this.onsetSmooth = this.onsetSmooth * 0.7 + onset * 0.3

        const out = {}
        for (let i = 0; i < NUM_BANDS; i++) {
            out[`wavelet_band${i}`] = bands[i] ?? 0
            out[`wavelet_band${i}Z`] = zScores[i] ?? 0
        }
        out.wavelet_onset = onset            // deep-bass hit (raw, sharp)
        out.wavelet_onsetSmooth = this.onsetSmooth
        out.wavelet_bassHit = onset          // alias — clearer name for the bass-drop use case
        out.wavelet_bassEnergy = bassEnergy  // harmonic-weighted low-band energy
        out.wavelet_bassZ = bassZ            // self-calibrating hit strength (mic-agnostic)
        out.wavelet_bass = approxEnergy      // raw sub-approximation (<43Hz)

        window.cranes.waveletFeatures = out
    }

    cleanup = () => {
        this.worker.terminate()
    }
}
