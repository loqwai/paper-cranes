import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { makeVisualizer } from './src/Visualizer.js'
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

// check if we have microphone access. If so, just run main immediately
navigator.mediaDevices
    .getUserMedia({
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            voiceIsolation: false,
            latency: 0,
            sampleRate: 44100,
            sampleSize: 16,
        },
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
                console.log('ServiceWorker registration successful with scope: ', registration.scope)
            },
            (err) => {
                console.log('ServiceWorker registration failed: ', err)
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
        // get the visualizer
        console.log('registering event', event)
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
    const audioContext = new AudioContext()
    await audioContext.resume()
    const audioOptions = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        voiceIsolation: false,
        latency: 0,
        sampleRate: 44100,

        channelCount: 1,
    }
    console.log('audioOptions', audioOptions)
    const stream = await navigator.mediaDevices.getUserMedia({audio: audioOptions, })
    const sourceNode = audioContext.createMediaStreamSource(stream)
    const historySize = parseInt(params.get('history_size') ?? '500')
    const audioProcessor = new AudioProcessor(audioContext, sourceNode, historySize)
    await audioProcessor.start()
    return audioProcessor
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
