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
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    latency: params.get('latency') ? parseFloat(params.get('latency')) : 0,
    sampleRate: params.get('sampleRate') ? parseInt(params.get('sampleRate')) : 44100,
    sampleSize: params.get('sampleSize') ? parseInt(params.get('sampleSize')) : 16,
    channelCount: params.get('channelCount') ? parseInt(params.get('channelCount')) : 2
}

// Override with URL parameters if specified
if (params.get('echoCancellation') === 'true') audioConfig.echoCancellation = true;
if (params.get('noiseSuppression') === 'true') audioConfig.noiseSuppression = true;
if (params.get('autoGainControl') === 'true') audioConfig.autoGainControl = true;
if (params.get('voiceIsolation') === 'true') audioConfig.voiceIsolation = true;

// check if we have microphone access. If so, just run main immediately
navigator.mediaDevices
    .getUserMedia({
        audio: {
            // Only request basic audio access for permission check
            echoCancellation: true,  // Use system defaults for permission check
            noiseSuppression: true,
            autoGainControl: true
        }
    })
    .then(() => main())
    .catch(() => {
        const body = document.querySelector('body')
        body.classList.remove('ready')
    })

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

const main = async () => {
    try {
        if (ranMain) return
        ranMain = true
        window.c = cranes
        startTime = performance.now()
        const audio = await setupAudio()

        const fragmentShader = await getFragmentShader()
        const vertexShader = await getVertexShader()

        window.shader = fragmentShader
        const initialImageUrl = params.get('image') ?? 'images/placeholder-image.png'
        const fullscreen = (params.get('fullscreen') ?? false) === 'true'
        const canvas = getVisualizerDOMElement()

        // Add touch and mouse event listeners// Default center position
        window.touched = false
        window.coords = { x: 0.5, y: 0.5 }
        const updateCoords = (e) => {
            window.coords = getNormalizedCoordinates(e, canvas)
            window.touched = true
        }

        canvas.addEventListener('touchmove', updateCoords)
        canvas.addEventListener('touchstart', updateCoords)

        canvas.addEventListener('mousemove', updateCoords)

        // Reset touched state when touch/click ends
        const resetTouch = () => {
            window.touched = false
        }

        canvas.addEventListener('touchend', resetTouch)
        canvas.addEventListener('mouseup', resetTouch)
        canvas.addEventListener('mouseleave', resetTouch)

        const render = await makeVisualizer({ canvas, initialImageUrl, fullscreen })
        requestAnimationFrame(() => animate({ render, audio, fragmentShader, vertexShader }))
    } catch (e) {
        console.error(`main error: ${e}`)
    }
}

// if the url contains the string 'edit', don't do this.
if (!window.location.href.includes('edit')) {
    for(const event of events) {
        const visualizer = getVisualizerDOMElement()
        visualizer.addEventListener(event, main, { once: true })
        visualizer.addEventListener(event, async()=>{
            try {
                await document.documentElement.requestFullscreen()
            } catch (e) {
                console.error(`requesting fullscreen from event ${event} failed`, e)
            }
        }, {once: true})
    }
}
const setupAudio = async () => {
    try {
        const audioContext = new AudioContext({
            latencyHint: 'interactive',
            sampleRate: 44100
        })
        await audioContext.resume()

        // Get list of audio devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => device.kind === 'audioinput');

        console.log('Available audio devices:', audioDevices.map(d => ({
            label: d.label,
            id: d.deviceId
        })));

        // Function to get microphone stream with device selection
        const getMicrophoneStream = async (retries = 3) => {
            // Log available devices but don't force selection
            const preferredDevices = audioDevices.filter(d =>
                !d.label.toLowerCase().includes('virtual') &&
                !d.label.toLowerCase().includes('blackhole')
            );

            console.log('Available microphones:', preferredDevices.map(d => d.label));

            // If we have preferred devices, use the first one
            const constraints = preferredDevices.length > 0 ? {
                audio: {
                    deviceId: { exact: preferredDevices[0].deviceId },
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            } : {
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            };

            for (let i = 0; i < retries; i++) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    const track = stream.getAudioTracks()[0];
                    console.log('Using microphone:', {
                        label: track.label,
                        enabled: track.enabled,
                        muted: track.muted,
                        readyState: track.readyState,
                        settings: track.getSettings()
                    });

                    return stream;
                } catch (error) {
                    console.warn(`Attempt ${i + 1} failed:`, error);
                    if (i === retries - 1) throw error;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        };

        const stream = await getMicrophoneStream();
        const sourceNode = audioContext.createMediaStreamSource(stream);

        // Test audio with longer timeout and volume monitoring
        const testNode = audioContext.createScriptProcessor(1024, 1, 1);
        let maxVolume = 0;
        let samplesProcessed = 0;

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.warn('Audio test results:', {
                    maxVolume,
                    samplesProcessed,
                    avgVolume: maxVolume / samplesProcessed
                });
                // Don't reject, just warn
                resolve();
            }, 3000);

            testNode.onaudioprocess = (e) => {
                const input = e.inputBuffer.getChannelData(0);
                const sum = input.reduce((a,b) => a + Math.abs(b), 0);
                maxVolume = Math.max(maxVolume, sum);
                samplesProcessed++;

                if (sum > 0) {
                    console.log('Received audio data:', {
                        sum,
                        maxVolume,
                        samplesProcessed,
                        sampleRate: audioContext.sampleRate
                    });
                }
            };

            sourceNode.connect(testNode);
            testNode.connect(audioContext.destination);
        });

        // Clean up test node
        sourceNode.disconnect(testNode);
        testNode.disconnect();

        const historySize = parseInt(params.get('history_size') ?? '500')
        const audioProcessor = new AudioProcessor(audioContext, sourceNode, historySize)
        await audioProcessor.start()
        return audioProcessor
    } catch (error) {
        console.error('Audio setup failed:', error);
        throw error;
    }
}

const animate = ({ render, audio, fragmentShader, vertexShader }) => {
    requestAnimationFrame(() => animate({ render, audio, fragmentShader, vertexShader }))
    fragmentShader = window.cranes?.shader ?? fragmentShader
    const measuredAudioFeatures = audio.getFeatures()
    const queryParamFeatures = {}

    for (const [key, value] of params) {
        queryParamFeatures[key] = value
    }

    const { manualFeatures } = window.cranes
    window.cranes.measuredAudioFeatures = measuredAudioFeatures
    const features = {
        ...measuredAudioFeatures,
        ...queryParamFeatures,
        ...manualFeatures,
        touchX: window.coords?.x ?? 0.5,
        touchY: window.coords?.y ?? 0.5,
        touched: window.touched ?? false  // Add touched state to features
    }

    try {
        render({ time: (performance.now() - startTime) / 1000, features, fragmentShader, vertexShader })
    } catch (e) {
        console.error(e)
    }
}

if(process.env.LIVE_RELOAD) {
    new EventSource('/esbuild').addEventListener('change', () => location.reload());
}
