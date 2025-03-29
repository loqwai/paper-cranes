import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { makeVisualizer } from './src/Visualizer.js'

// Add service worker registration
window.addEventListener('load', async () => {
    console.log('Registering service worker...')
    const { serviceWorker } = navigator
    if(!serviceWorker) {
        console.log('Service worker not supported')
        return
    }
    serviceWorker.addEventListener('message', processServiceWorkerMessage)
    // Add cache version to URL to force update when version changes
    const registration = await serviceWorker.register(`/service-worker.js`)
    registration.addEventListener('statechange', (e) =>
        console.log('ServiceWorker state changed:', e.target.state))
    registration.addEventListener('message', processServiceWorkerMessage)

})

/**
 * Process messages from the service worker
 * @param {MessageEvent} event
 */
const processServiceWorkerMessage = (event) => {
    console.log('Received message from service worker', event.data)
    if (event.data === 'reload') {
        console.log('Received reload message from service worker')
        window.stop()
        return window.location.reload()
    }
    console.log('Received strange message from service worker', event.data)
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
    autoGainControl: params.get('autoGainControl') !== 'false', // true by default
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

const setupAudio = async () => {
    // if we have a query param that says 'noaudio=true', just return a dummy audio processor
    if (params.get('noaudio') === 'true' || params.get('embed') === 'true') {
        return {
            getFeatures: () => ({
            })
        }
    }
    // get the default audio input
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');
    const defaultAudioInput = audioInputs[0].deviceId

    try {
        // Get microphone access first
        await navigator.mediaDevices.getUserMedia({
            audio: {
                ...audioConfig,
                ...(audioInputs.length > 1 ? { deviceId: { exact: defaultAudioInput } } : {})
            }
        });
        const audioContext = new AudioContext();
        await audioContext.resume();

        const stream = await getAudioStream(audioConfig);
        const sourceNode = audioContext.createMediaStreamSource(stream);
        const historySize = parseInt(params.get('history_size') ?? '500');
        const audioProcessor = new AudioProcessor(audioContext, sourceNode, historySize);
        audioProcessor.start();

        return audioProcessor;
    } catch (err) {
        console.error('Audio initialization failed:', err);
    }
};

// Set up the application state management
const setupCranesState = () => {
    window.cranes = {
        measuredAudioFeatures: {},  // Audio features (lowest precedence)
        controllerFeatures: {},     // Controller-computed features
        manualFeatures: {},         // Manual features
        messageParams: {},          // Message parameters (highest precedence)
        frameCount: 0,
        // Centralized feature flattening function with proper order of precedence
        flattenFeatures: () => {
            return {
                ...window.cranes.measuredAudioFeatures, // Audio features (lowest precedence)
                ...window.cranes.controllerFeatures,    // Controller-computed features
                ...Object.fromEntries(params),          // URL parameters
                ...window.cranes.manualFeatures,        // Manual features
                ...window.cranes.messageParams,         // Message parameters (highest precedence)
                touch: [coordsHandler.coords.x, coordsHandler.coords.y],
                touched: coordsHandler.touched
            }
        }
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

        // Render the shader
        render({
            time: (performance.now() - startTime) / 1000,
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

            // Update frame count
            window.cranes.frameCount++
        } catch (e) {
            console.error('Controller error:', e)
        }

        // Schedule next frame
        requestAnimationFrame(controllerFrame)
    }

    // Start controller animation loop
    requestAnimationFrame(controllerFrame)
}

const getRelativeOrAbsolute = async (url) => {
    //if the url is not a full url, then it's a relative url
    if (!url.includes('http')) {
        url = `/shaders/${url}`
    }
    const res = await fetch(url, {mode: 'no-cors'})
    const shader = await res.text()
    return shader
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

        console.log(`Loading controller from: ${controllerUrl}`)
        const controllerModule = await import(controllerUrl)

        // Handle different module formats:
        // 1. Module exports a function directly - use it as the controller
        // 2. Module exports a make() function - call it to get the controller
        // 3. Module exports something else - error

        if (typeof controllerModule.default === 'function')  return controllerModule.default
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

const getFragmentShader = async () => {
    const shaderUrl = params.get('shader')
    let fragmentShader

    if(params.get('shaderCode')) return decodeURIComponent(params.get('shaderCode'))

    if (shaderUrl) fragmentShader = await getRelativeOrAbsolute(`${shaderUrl}.frag`)
    if (!fragmentShader) fragmentShader = localStorage.getItem('cranes-manual-code')
    if (!fragmentShader) fragmentShader = await getRelativeOrAbsolute('default.frag')
    return fragmentShader
}

if(navigator.connection) {
    navigator.connection.addEventListener('change', () => {
        navigator.serviceWorker.controller.postMessage({type:'network-changed'})
    })
}

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

    // Load shader and audio
    const fragmentShader = await getFragmentShader()
    const audio = await setupAudio()
    const canvas = getVisualizerDOMElement()

    if (!window.location.href.includes('edit') && params.get('embed') !== 'true') addListenersForFullscreen(canvas)

    window.shader = fragmentShader
    setupCanvasEvents(canvas)

    const visualizerConfig = {
        canvas,
        initialImageUrl: params.get('image') ?? 'images/placeholder-image.png',
        fullscreen: (params.get('fullscreen') ?? false) === 'true'
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
                    console.log('Using direct controller function')
                } else {
                    // Otherwise it's probably a make function
                    controller = controllerExport(window.cranes)
                    console.log('Using make function to create controller')
                }
            }

            if (typeof controller !== 'function') {
                throw new Error('Controller must be a function or return a function')
            }

            console.log('Controller initialized successfully')

            // Setup separate animation loop for the controller
            animateController(controller)
        } catch (e) {
            console.error('Failed to initialize controller:', e)
        }
    }

    // Initialize visualizer and start shader animation loop
    const render = await makeVisualizer(visualizerConfig)
    requestAnimationFrame(() => animateShader({ render, audio, fragmentShader }))
}

main()

console.log(`paper cranes version FREE`);
