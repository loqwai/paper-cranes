import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { createAudioFileSource, initAudioFromFile } from './src/audio/audioFileSource.js'
import { makeVisualizer } from './src/Visualizer.js'
import { getInitialShader } from './src/shaderLoader.js'


const SEED_KEY = 'paperCranes.seeds'

const loadOrCreateSeeds = () => {
    const stored = localStorage.getItem(SEED_KEY)
    if (stored) {
        try {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed) && parsed.length === 4 && parsed.every(n => typeof n === 'number')) return parsed
        } catch { /* regenerate */ }
    }
    const seeds = Array.from({ length: 4 }, () => Math.random())
    localStorage.setItem(SEED_KEY, JSON.stringify(seeds))
    return seeds
}

const events = ['touchstart', 'touchmove', 'touchstop', 'keydown', 'mousedown', 'resize']
let ranMain = false
let startTime = 0
const params = new URLSearchParams(window.location.search)

const getVisualizerDOMElement = () => {
    if (!window.visualizer) {
        window.visualizer = document.getElementById('visualizer')
    }
    return window.visualizer
}

// Add this new function to handle touch/mouse coordinates
const getNormalizedCoordinates = (event, element) => {
    let x, y
    if (event.touches) {
        x = event.touches[0].clientX
        y = event.touches[0].clientY
    } else {
        x = event.clientX
        y = event.clientY
    }

    const rect = element.getBoundingClientRect()
    return {
        x: (x - rect.left) / rect.width,
        y: 1.0 - (y - rect.top) / rect.height  // Flip Y coordinate for WebGL
    }
}
const audioConfig = {
    echoCancellation: params.get('echoCancellation') === 'true',
    noiseSuppression: params.get('noiseSuppression') === 'true',
    autoGainControl: params.get('autoGainControl') === 'true',
    voiceIsolation: params.get('voiceIsolation') === 'true',
    latency: params.get('latency') ? parseFloat(params.get('latency')) : 0,
    sampleRate: params.get('sampleRate') ? parseInt(params.get('sampleRate')) : 44100,
    sampleSize: params.get('sampleSize') ? parseInt(params.get('sampleSize')) : 16,
    channelCount: params.get('channelCount') ? parseInt(params.get('channelCount')) : 2,
}

// Factor out common audio setup logic
const getAudioStream = async (config) => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');

    const constraints = {
        audio: {
            ...config,
            // Only specify deviceId if we have multiple audio inputs
            ...(audioInputs.length > 1 ? { deviceId: { exact: audioInputs[0].deviceId } } : {})
        }
    };

    return navigator.mediaDevices.getUserMedia(constraints);
};

// Opt-in voice removal: capture two streams from the same input device — a raw mix
// and a voice-isolated version — then subtract the isolated voice from the raw mix
// to leave the surrounding music/ambient audio. Enable with ?removeVoice=true.
//
// Caveats:
// - Browsers vary. Safari honors `voiceIsolation`. Chrome may honor it on some
//   platforms and silently ignore it on others. We DON'T gate on
//   getSupportedConstraints() because that list under-reports non-standard
//   constraints; instead we request both streams and inspect the resulting
//   MediaStreamTrack.getSettings() to see what the browser actually applied.
// - Cancellation quality depends on the two streams being phase-aligned. If they
//   go through different processing pipelines they will drift, leaving partial
//   residual voice and comb-filter artifacts on the music.
// - If voiceIsolation didn't actually take effect AND no other DSP differs, the
//   two streams will be near-identical and the subtraction would null the music.
//   We detect that and fall back to the raw stream.
const createVoiceCancelledSource = async (audioContext, baseConfig) => {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const audioInputs = devices.filter(d => d.kind === 'audioinput')
    const deviceId = audioInputs[0]?.deviceId
    const deviceConstraint = (audioInputs.length > 1 && deviceId) ? { deviceId: { exact: deviceId } } : {}

    const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            ...baseConfig,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            voiceIsolation: false,
            ...deviceConstraint,
        },
    })

    let voiceStream = null
    try {
        voiceStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                ...baseConfig,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: false,
                voiceIsolation: true,
                ...deviceConstraint,
            },
        })
    } catch (err) {
        console.warn('[removeVoice] second getUserMedia rejected, using raw mic:', err)
    }

    const rawSource = audioContext.createMediaStreamSource(rawStream)
    if (!voiceStream) return rawSource

    // Diagnostic: did the browser actually apply voiceIsolation to the second stream?
    const rawTrack = rawStream.getAudioTracks()[0]
    const voiceTrack = voiceStream.getAudioTracks()[0]
    const rawSettings = rawTrack?.getSettings?.() ?? {}
    const voiceSettings = voiceTrack?.getSettings?.() ?? {}
    console.info('[removeVoice] raw track settings:', rawSettings)
    console.info('[removeVoice] voice track settings:', voiceSettings)
    const voiceIsolationApplied = voiceSettings.voiceIsolation === true
    const dspDifferent =
        voiceSettings.noiseSuppression !== rawSettings.noiseSuppression ||
        voiceSettings.echoCancellation !== rawSettings.echoCancellation ||
        voiceIsolationApplied
    if (!voiceIsolationApplied) {
        console.warn(
            '[removeVoice] voiceIsolation NOT confirmed in track settings.',
            'Browser likely ignored the constraint.',
            dspDifferent
                ? 'Other DSP (NS/AEC) does differ — subtraction may still partially work.'
                : 'Streams look identical — subtraction would null the music. Falling back to raw mic.'
        )
        if (!dspDifferent) {
            voiceTrack?.stop()
            return rawSource
        }
    }

    const voiceSource = audioContext.createMediaStreamSource(voiceStream)
    const invert = audioContext.createGain()
    invert.gain.value = -1

    // Time-align the two streams. The browser reports per-track latency in
    // seconds; whichever stream arrives earlier gets delayed by the difference
    // so the subtraction can actually phase-cancel. This is a coarse fix —
    // reported latency is approximate and the real sample offset may drift —
    // but it's vastly better than ignoring the misalignment entirely.
    const rawLatency = rawSettings.latency ?? 0
    const voiceLatency = voiceSettings.latency ?? 0
    const delayRawBy = Math.max(0, voiceLatency - rawLatency)
    const delayVoiceBy = Math.max(0, rawLatency - voiceLatency)
    const rawDelay = audioContext.createDelay(1)
    const voiceDelay = audioContext.createDelay(1)
    rawDelay.delayTime.value = delayRawBy
    voiceDelay.delayTime.value = delayVoiceBy
    console.info(
        `[removeVoice] aligning streams: raw +${(delayRawBy * 1000).toFixed(1)}ms, voice +${(delayVoiceBy * 1000).toFixed(1)}ms`
    )

    const summed = audioContext.createGain()
    summed.gain.value = 1
    rawSource.connect(rawDelay)
    rawDelay.connect(summed)
    voiceSource.connect(voiceDelay)
    voiceDelay.connect(invert)
    invert.connect(summed)

    // Expose for runtime A/B testing and tuning from the console
    window.cranes = window.cranes || {}
    window.cranes.voiceRemoval = {
        rawSource, voiceSource, rawDelay, voiceDelay, invert, summed,
        rawSettings, voiceSettings,
    }

    return summed
}

// Factor out coordinate handling
const coordsHandler = {
    coords: { x: 0.5, y: 0.5 },
    touched: false,

    updateCoords(event, element) {
        this.coords = getNormalizedCoordinates(event, element);
        this.touched = true;
    },

    reset() {
        this.touched = false;
    }
};

// Factor out canvas event handling
const setupCanvasEvents = (canvas) => {
    const updateCoords = (e) => coordsHandler.updateCoords(e, canvas);
    const resetTouch = () => coordsHandler.reset();

    canvas.addEventListener('touchmove', updateCoords);
    canvas.addEventListener('touchstart', updateCoords);
    canvas.addEventListener('mousemove', updateCoords);
    canvas.addEventListener('touchend', resetTouch);
    canvas.addEventListener('mouseup', resetTouch);
    canvas.addEventListener('mouseleave', resetTouch);
};

const noAudio = { getFeatures: () => ({}) }

const setupAudio = async () => {
    // if we have a query param that says 'noaudio=true', just return a dummy audio processor
    if (params.get('noaudio') === 'true' || params.get('embed') === 'true') {
        return noAudio
    }

    const fileConfig = createAudioFileSource({ params })
    if (fileConfig) {
        try {
            const audioContext = new AudioContext()
            const { sourceNode, audioBuffer, startSource } = await initAudioFromFile({ config: fileConfig, audioContext })
            window.cranes.audioBuffer = audioBuffer
            window.cranes.startSource = startSource

            const audioProcessor = new AudioProcessor(audioContext, sourceNode, fileConfig.historySize, fileConfig.fftSize)
            audioProcessor.smoothingFactor = fileConfig.smoothing
            await audioProcessor.start()
            // Route through speakers (unlike mic input, file playback has no feedback risk)
            audioProcessor.fftAnalyzer.connect(audioContext.destination)
            return audioProcessor
        } catch (err) {
            console.error('Audio file initialization failed:', err)
            return noAudio
        }
    }

    try {
        // get the default audio input
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const defaultAudioInput = audioInputs[0]?.deviceId

        // Get microphone access first
        await navigator.mediaDevices.getUserMedia({
            audio: {
                ...audioConfig,
                ...(audioInputs.length > 1 && defaultAudioInput ? { deviceId: { exact: defaultAudioInput } } : {})
            }
        });
        const audioContext = new AudioContext();
        await audioContext.resume();

        const sourceNode = params.get('removeVoice') === 'true'
            ? await createVoiceCancelledSource(audioContext, audioConfig)
            : audioContext.createMediaStreamSource(await getAudioStream(audioConfig));
        const historySize = parseInt(params.get('history_size') ?? '500');
        const fftSize = parseInt(params.get('fft_size') ?? '4096');
        const smoothing = parseFloat(params.get('smoothing') ?? '0.15');
        const audioProcessor = new AudioProcessor(audioContext, sourceNode, historySize, fftSize);
        audioProcessor.smoothingFactor = smoothing;
        audioProcessor.start();

        return audioProcessor;
    } catch (err) {
        console.error('Audio initialization failed:', err);
        return noAudio
    }
};

// Parse URL params as numbers when possible
const parseUrlParams = (searchParams) => {
    const result = {}
    for (const [key, value] of searchParams) {
        const num = parseFloat(value)
        result[key] = !isNaN(num) ? num : value
    }
    return result
}

export const getCranesState = () => {
    const [s1, s2, s3, s4] = window.cranes.seeds
    return {
        seed: s1,
        seed2: s2,
        seed3: s3,
        seed4: s4,
        ...window.cranes.measuredAudioFeatures, // Audio features (lowest precedence)
        ...window.cranes.controllerFeatures,    // Controller-computed features
        ...parseUrlParams(params),              // URL parameters (parsed as numbers or strings)
        ...window.cranes.manualFeatures,        // Manual features
        ...window.cranes.messageParams,         // Message parameters (highest precedence)
        touch: [coordsHandler.coords.x, coordsHandler.coords.y],
        touched: coordsHandler.touched
    }
}

// Set up the application state management
const setupCranesState = () => {
    window.cranes = {
        seeds: loadOrCreateSeeds(),
        measuredAudioFeatures: {},  // Audio features (lowest precedence)
        controllerFeatures: {},     // Controller-computed features
        manualFeatures: {},         // Manual features
        messageParams: {},          // Message parameters (highest precedence)
        frameCount: 0,
        // Centralized feature flattening function with proper order of precedence
        flattenFeatures: getCranesState
    }

    window.c = window.cranes
}

// Animation function for the shader rendering
const animateShader = ({ render, audio, fragmentShader }) => {
    requestAnimationFrame(() => animateShader({ render, audio, fragmentShader }))

    try {
        // Get audio features and store in measuredAudioFeatures
        window.cranes.measuredAudioFeatures = audio.getFeatures() || {}

        // Get flattened features using the centralized method
        const features = window.cranes.flattenFeatures()
        // Update frame count
        window.cranes.frameCount++
        // Render the shader
        render({
            time: ((performance.now() - startTime) / 1000) % 1000,
            features,
            fragmentShader: window.cranes?.shader ?? fragmentShader,
        })
    } catch (e) {
        console.error('Shader render error:', e)
    }
}

// Separate animation function for the controller
const animateController = (controller) => {
    if (!controller) return

    const controllerFrame = () => {
        try {
            // Get flattened features using the centralized method
            const features = window.cranes.flattenFeatures()

            // Call controller with flattened features
            const controllerResult = controller(features) ?? {}

            // Store controller result in controllerFeatures
            window.cranes.controllerFeatures = controllerResult
        } catch (e) {
            console.error('Controller error:', e)
        }

        // Schedule next frame
        requestAnimationFrame(controllerFrame)
    }

    // Start controller animation loop
    requestAnimationFrame(controllerFrame)
}

// Load a controller module from a URL (local or remote)
const loadController = async () => {
    const controllerPath = params.get('controller')
    if (!controllerPath) return null

    try {
        // Handle paths with or without .js extension
        let controllerUrl = controllerPath
        if (!controllerPath.includes('http') && !controllerPath.endsWith('.js')) {
            controllerUrl = `/controllers/${controllerPath}.js`
        } else if (!controllerPath.includes('http')) {
            controllerUrl = `/controllers/${controllerPath}`
        }

        const controllerModule = await import(/* @vite-ignore */ controllerUrl)

        // Handle different module formats:
        // 1. Module exports a function directly - use it as the controller
        // 2. Module exports a make() function - call it to get the controller
        // 3. Module exports something else - error

        if (typeof controllerModule.default === 'function') return controllerModule.default
        // Default export is a function - direct controller or make function
        if (typeof controllerModule.make === 'function') return controllerModule.make
        if (typeof controllerModule === 'function') return controllerModule
        console.error('Controller must export a function directly or provide a make() function')
        return null
    } catch (error) {
        console.error(`Failed to load controller: ${error}`)
        return null
    }
}


if(navigator.connection) {
    navigator.connection.addEventListener('change', () => {
        navigator.serviceWorker.controller?.postMessage({type:'network-changed'})
    })
}

document.addEventListener('fullscreenchange', () => {
    document.body.style.cursor = document.fullscreenElement ? 'none' : 'default'
})

const addListenersForFullscreen = (visualizer) => {
    for (const event of events) {
        visualizer.addEventListener(event, async () => {
            try {
                await document.documentElement.requestFullscreen();
            } catch (e) {
                console.error(`requesting fullscreen from event ${event} failed`, e);
            }
        }, { once: true });
    }
}

const main = async () => {
    if (ranMain) return
    ranMain = true

    // Initialize global state
    setupCranesState()
    startTime = performance.now()

    // Initialize remote display mode if ?remote=display
    if (params.get('remote') === 'display') {
        const { initRemoteDisplay } = await import('./src/remote/RemoteDisplay.js')
        initRemoteDisplay()
    }

    // Load shader and audio
    const { code: fragmentShader, fullscreen: shaderFullscreen } = await getInitialShader()
    const audio = await setupAudio()
    const canvas = getVisualizerDOMElement()

    if (!window.location.href.includes('edit') && params.get('embed') !== 'true') addListenersForFullscreen(canvas)

    window.shader = fragmentShader
    setupCanvasEvents(canvas)

    const visualizerConfig = {
        canvas,
        initialImageUrl: params.get('image') ?? 'images/placeholder-image.png',
        fullscreen: params.get('fullscreen') === 'true' || shaderFullscreen
    }

    // Load and initialize controller if specified
    const controllerExport = await loadController()

    if (controllerExport) {
        try {
            let controller

            // Check if the export is a make function or direct controller
            if (typeof controllerExport === 'function') {
                // If it takes 0-1 arguments, it's likely a direct controller function
                if (controllerExport.length <= 1) {
                    controller = controllerExport
                } else {
                    // Otherwise it's probably a make function
                    controller = controllerExport(window.cranes)
                }
            }

            if (typeof controller !== 'function') {
                throw new Error('Controller must be a function or return a function')
            }

            // Setup separate animation loop for the controller
            animateController(controller)
        } catch (e) {
            console.error('Failed to initialize controller:', e)
        }
    }

    // Initialize visualizer and start shader animation loop
    const render = await makeVisualizer(visualizerConfig)

    // WKWebView (Plash/macOS Spaces) composites the page before firing visibilitychange visible,
    // so rendering in the handler is too late — the black frame already appeared.
    // Fix: capture a snapshot of the last rendered frame before hiding and show it as a DOM
    // overlay. Regular DOM elements are not cleared by WKWebView during Space transitions.
    let snapDiv = null
    let snapRemovalRaf = null

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Cancel any pending removal so snapshot stays up through rapid hide/show cycles
            if (snapRemovalRaf) { cancelAnimationFrame(snapRemovalRaf); snapRemovalRaf = null }
            try {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
                const rect = canvas.getBoundingClientRect()
                if (!snapDiv) {
                    snapDiv = document.createElement('div')
                    snapDiv.style.cssText = 'position: fixed; z-index: 9999; pointer-events: none; background-repeat: no-repeat; background-size: 100% 100%;'
                    document.body.appendChild(snapDiv)
                }
                snapDiv.style.left = `${rect.left}px`
                snapDiv.style.top = `${rect.top}px`
                snapDiv.style.width = `${rect.width}px`
                snapDiv.style.height = `${rect.height}px`
                snapDiv.style.backgroundImage = `url(${dataUrl})`
                snapDiv.style.display = 'block'
            } catch (e) {
                console.error('snapshot failed:', e.message)
            }
            return
        }
        // Visible again: render immediately, then remove snapshot after 2 compositor frames
        const features = window.cranes?.flattenFeatures?.() ?? {}
        render({ time: ((performance.now() - startTime) / 1000) % 1000, features, fragmentShader: window.cranes?.shader ?? fragmentShader })
        snapRemovalRaf = requestAnimationFrame(() => {
            snapRemovalRaf = requestAnimationFrame(() => {
                if (snapDiv) { snapDiv.style.display = 'none' }
                snapRemovalRaf = null
            })
        })
    })

    requestAnimationFrame(() => animateShader({ render, audio, fragmentShader }))
}

main()
