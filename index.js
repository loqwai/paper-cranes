import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { makeVisualizer } from './src/Visualizer.js'
console.log(`paper cranes version ${CACHE_NAME}`);
import './index.css'
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
            ...(audioInputs.length > 1 ? { deviceId: { exact: 'default' } } : {})
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

// Check microphone access and initialize
const initializeAudio = async () => {
    try {
        await getAudioStream(audioConfig);
        main();
    } catch (err) {
        document.querySelector('body').classList.remove('ready');
        console.error('Audio initialization failed:', err);
    }
};

const setupAudio = async () => {
    const audioContext = new AudioContext();
    await audioContext.resume();

    const stream = await getAudioStream(audioConfig);
    const sourceNode = audioContext.createMediaStreamSource(stream);
    const historySize = parseInt(params.get('history_size') ?? '500');
    const audioProcessor = new AudioProcessor(audioContext, sourceNode, historySize);
    await audioProcessor.start();

    return audioProcessor;
};

const main = async () => {
    try {
        if (ranMain) return;
        ranMain = true;

        window.c = cranes;
        startTime = performance.now();
        const audio = await setupAudio();

        const [fragmentShader, vertexShader] = await Promise.all([
            getFragmentShader(),
            getVertexShader()
        ]);

        window.shader = fragmentShader;
        const canvas = getVisualizerDOMElement();
        setupCanvasEvents(canvas);

        const visualizerConfig = {
            canvas,
            initialImageUrl: params.get('image') ?? 'images/placeholder-image.png',
            fullscreen: (params.get('fullscreen') ?? false) === 'true'
        };

        const render = await makeVisualizer(visualizerConfig);
        requestAnimationFrame(() => animate({ render, audio, fragmentShader, vertexShader }));
    } catch (e) {
        console.error('Main initialization error:', e);
    }
};

const animate = ({ render, audio, fragmentShader, vertexShader }) => {
    requestAnimationFrame(() => animate({ render, audio, fragmentShader, vertexShader }));

    const features = {
        ...audio.getFeatures(),
        ...Object.fromEntries(params),
        ...window.cranes.manualFeatures,
        touchX: coordsHandler.coords.x,
        touchY: coordsHandler.coords.y,
        touched: coordsHandler.touched
    };

    window.cranes.measuredAudioFeatures = features;

    try {
        render({
            time: (performance.now() - startTime) / 1000,
            features,
            fragmentShader: window.cranes?.shader ?? fragmentShader,
            vertexShader
        });
    } catch (e) {
        console.error('Render error:', e);
    }
};

// Initialize
if (!window.location.href.includes('edit')) {
    for (const event of events) {
        const visualizer = getVisualizerDOMElement();
        visualizer.addEventListener(event, initializeAudio, { once: true });
        visualizer.addEventListener(event, async () => {
            try {
                await document.documentElement.requestFullscreen();
            } catch (e) {
                console.error(`Fullscreen request failed on ${event}:`, e);
            }
        }, { once: true });
    }
}

if ('serviceWorker' in navigator) {

    window.addEventListener('load', () => {
        navigator.serviceWorker.register(new URL('/service-worker.js', import.meta.url)).then(
            (registration) => {
                console.log(`ServiceWorker:enabled. Cache: ${CACHE_NAME}`)
            },
            (err) => {
                console.log(`ServiceWorker:could not register. Cache: ${CACHE_NAME}`)
            },
        )
    })
}

window.cranes = {
    manualFeatures: {}
}

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

const getVertexShader = async () => {
    const shaderUrl = params.get('vertex_shader')
    let vertexShader
    if (shaderUrl) {
        vertexShader = await getRelativeOrAbsolute(`${shaderUrl}.vert`)
    }

    if (!vertexShader) {
        vertexShader = localStorage.getItem('cranes-manual-code-vertex')
    }

    if (!vertexShader) {
        vertexShader = await getRelativeOrAbsolute('default.vert')
    }
    return vertexShader
}

if(process.env.LIVE_RELOAD) {
    new EventSource('/esbuild').addEventListener('change', () => location.reload());
}
