// Live-stream audio source: visualize AND play audio from an HTTP(S) stream
// URL — e.g. a desktop/system-audio Icecast feed — so devices without a usable
// mic (Tesla and other car browsers, kiosks) can still drive the visualizer.
//
// Triggered when ?audio=<http(s) url>. Unlike the file path (fetch +
// decodeAudioData, which needs a finite file) this uses an <audio> element +
// createMediaElementSource so it works on an endless live stream.
//
// The stream is also routed to the speakers, so the same buffered audio you
// hear is what the shader reacts to — sound and visuals stay in sync locally
// regardless of network latency.
//
// Two hard requirements for the *visuals* (playback works without them, but the
// analyser reads silence and nothing reacts):
//   1. The page is HTTPS, so the stream URL must be HTTPS too (mixed content).
//   2. The stream must send `Access-Control-Allow-Origin` and we set
//      crossOrigin='anonymous' — otherwise Web Audio can't read the samples.
//
// Browsers block autoplay until a user gesture, so we show a one-tap overlay
// before starting playback.

const OVERLAY_ID = 'stream-audio-overlay'

// True when an ?audio= value looks like a stream URL rather than a keyword
// (none/tab). URLSearchParams has already decoded it by the time we see it.
export const isStreamUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value)

const showStartOverlay = ({ onStart }) => {
    const existing = document.getElementById(OVERLAY_ID)
    if (existing) existing.remove()

    const overlay = document.createElement('div')
    overlay.id = OVERLAY_ID
    overlay.style.cssText = [
        'position: fixed', 'inset: 0', 'z-index: 10000',
        'display: flex', 'flex-direction: column',
        'align-items: center', 'justify-content: center', 'gap: 1.25rem',
        'background: rgba(0,0,0,0.82)', 'color: #f5f5f5',
        'font-family: system-ui, -apple-system, sans-serif',
        'text-align: center', 'padding: 2rem', 'cursor: pointer',
    ].join(';')

    const title = document.createElement('div')
    title.textContent = 'Tap to start'
    title.style.cssText = 'font-size: 1.8rem; font-weight: 600; letter-spacing: 0.02em;'

    const body = document.createElement('div')
    body.textContent = 'Plays the audio stream and reacts to it.'
    body.style.cssText = 'max-width: 28rem; font-size: 0.95rem; line-height: 1.5; opacity: 0.8;'

    const status = document.createElement('div')
    status.style.cssText = 'min-height: 1.2rem; font-size: 0.85rem; color: #ff8080;'

    overlay.append(title, body, status)
    document.body.appendChild(overlay)

    const handler = async () => {
        status.textContent = 'Connecting…'
        try {
            await onStart()
            overlay.remove()
        } catch (err) {
            status.textContent = err?.message ?? String(err)
            console.error('[Stream audio] start failed:', err)
        }
    }
    overlay.addEventListener('click', handler, { once: false })

    return { setStatus: (t) => { status.textContent = t } }
}

// Entry point called from index.js when ?audio= is an http(s) URL.
// Mirrors setupTabAudio: returns a holder whose getFeatures is empty until the
// user taps to start, then swaps in the real AudioProcessor's getFeatures.
export const setupStreamAudio = ({ params, AudioProcessor, url }) => {
    const holder = { getFeatures: () => ({}) }

    const historySize = parseInt(params.get('history_size') ?? '500')
    const fftSize = parseInt(params.get('fft_size') ?? '4096')
    // Live streams want mic-like responsiveness, not the file path's heavy 0.85.
    const smoothing = parseFloat(params.get('smoothing') ?? '0.15')

    const audio = new Audio()
    audio.crossOrigin = 'anonymous' // must be set before src for CORS to apply
    audio.preload = 'auto'
    audio.setAttribute('playsinline', '')
    audio.src = url

    // Live streams drop; reconnect by reloading the source after a short delay.
    let reconnecting = false
    const reconnect = () => {
        if (reconnecting) return
        reconnecting = true
        setTimeout(() => {
            reconnecting = false
            audio.src = url
            audio.load()
            audio.play().catch((e) => console.warn('[Stream audio] reconnect failed:', e))
        }, 1000)
    }
    audio.addEventListener('ended', reconnect)
    audio.addEventListener('error', reconnect)

    const start = async () => {
        const audioContext = new AudioContext()
        await audioContext.resume()

        const sourceNode = audioContext.createMediaElementSource(audio)
        await audio.play()

        const processor = new AudioProcessor(audioContext, sourceNode, historySize, fftSize)
        processor.smoothingFactor = smoothing
        await processor.start()

        // Route to speakers (same buffered audio the analyser sees). Mirrors the
        // audio-file path — a MediaElementSource is muted until connected.
        processor.fftAnalyzer.connect(audioContext.destination)

        // PROTOTYPE: opt-in wavelet analysis on the same source (?wavelet=true).
        if (params.get('wavelet') === 'true') {
            const { WaveletProcessor } = await import('./WaveletProcessor.js')
            const wavelet = new WaveletProcessor(audioContext, sourceNode, historySize)
            await wavelet.start()
            if (window.cranes) window.cranes.waveletProcessor = wavelet
        }

        holder.getFeatures = processor.getFeatures

        // Go fullscreen on the same gesture — nice for a car/kiosk display.
        try { await document.documentElement.requestFullscreen() } catch { /* ignore */ }
    }

    showStartOverlay({ onStart: start })
    return holder
}
