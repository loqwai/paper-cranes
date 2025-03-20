import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { makeVisualizer } from './src/Visualizer.js'

// Add service worker registration
window.cranes = {
    manualFeatures: {},
    messageParams: {} // Add storage for message params
}

// Add listener for messages from parent window
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'update-params') {
        console.log('Received postMessage:', event.data)

        // Store incoming params
        const { type, ...params } = event.data

        // Update shader code if provided
        if (params.shaderCode) {
            window.cranes.shader = params.shaderCode
        }

        // Store all params
        Object.entries(params).forEach(([key, value]) => {
            window.cranes.messageParams[key] = value
        })
    }
})

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
    const audioContext = new AudioContext();
    await audioContext.resume();

    const stream = await getAudioStream(audioConfig);
    const sourceNode = audioContext.createMediaStreamSource(stream);
    const historySize = parseInt(params.get('history_size') ?? '500');
    const audioProcessor = new AudioProcessor(audioContext, sourceNode, historySize);
    audioProcessor.start();

    return audioProcessor;
};

const animate = ({ render, audio, fragmentShader }) => {
    requestAnimationFrame(() => animate({ render, audio, fragmentShader }));

    const features = {
        ...audio.getFeatures(),
        ...Object.fromEntries(params),
        ...window.cranes.manualFeatures,
        // Add message params with highest priority
        ...window.cranes.messageParams,
        touch: [coordsHandler.coords.x, coordsHandler.coords.y],
        touched: coordsHandler.touched
    };

    window.cranes.measuredAudioFeatures = features;

    try {
        render({
            time: (performance.now() - startTime) / 1000,
            features,
            // Prioritize shader from postMessage if available
            fragmentShader: window.cranes.shader ?? fragmentShader,
        });
    } catch (e) {
        console.error('Render error:', e);
    }
};

const main = async () => {
    try {
        if (ranMain) return;
        ranMain = true;

        window.c = cranes;
        startTime = performance.now();
        const fragmentShader = await getFragmentShader();
        const audio = await setupAudio();

        window.shader = fragmentShader;
        const canvas = getVisualizerDOMElement();
        setupCanvasEvents(canvas);

        const visualizerConfig = {
            canvas,
            initialImageUrl: params.get('image') ?? 'images/placeholder-image.png',
            fullscreen: (params.get('fullscreen') ?? false) === 'true'
        };

        const render = await makeVisualizer(visualizerConfig);
        requestAnimationFrame(() => animate({ render, audio, fragmentShader }));
    } catch (e) {
        console.error('Main initialization error:', e);
    }
};

// Combine initialization into a single function
const initializeApp = async () => {
    if (ranMain) return;
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

        // If successful, run main
        await main();

        // Add click handlers for fullscreen
        if (!window.location.href.includes('edit')) {
            const visualizer = getVisualizerDOMElement();
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
    } catch (err) {
        console.error('Failed to initialize:', err);
        const body = document.querySelector('body');
        body.classList.remove('ready');
    }
};

// Start initialization immediately
initializeApp();

const getRelativeOrAbsolute = async (url) => {
    //if the url is not a full url, then it's a relative url
    if (!url.includes('http')) {
        url = `/shaders/${url}`
    }
    const res = await fetch(url)
    const shader = await res.text()
    return shader
}

const getFragmentShader = async () => {
    const shaderUrl = params.get('shader')
    let fragmentShader

    // Check for shader from postMessage
    if (window.cranes.shader) {
        return window.cranes.shader
    }

    // Check for shader code in URL params
    if (params.get('shaderCode')) {
        return decodeURIComponent(params.get('shaderCode'))
    }

    if (shaderUrl) {
        fragmentShader = await getRelativeOrAbsolute(`${shaderUrl}.frag`)
    }

    if (!fragmentShader) {
        fragmentShader = localStorage.getItem('cranes-manual-code')
    }

    if (!fragmentShader) {
        fragmentShader = await getRelativeOrAbsolute('default.frag')
    }
    return fragmentShader
}

if(navigator.connection) {
    navigator.connection.addEventListener('change', () => {
        navigator.serviceWorker.controller.postMessage({type:'network-changed'})
    })
}
console.log(`paper cranes version FREE`);
