import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { makeVisualizer } from './src/Visualizer.js'
import './index.css'
const events = ['touchstart', 'touchmove', 'touchstop', 'click', 'keydown', 'mousemove', 'mousedown', 'mouseup', 'resize']
let ranMain = false
let startTime = 0
const params = new URLSearchParams(window.location.search)
// check if we have microphone access. If so, just run main immediately
navigator.mediaDevices
    .getUserMedia({
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
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
window.cranes = window.cranes || {}

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
    if (ranMain) return

    window.c = cranes
    startTime = performance.now()
    const audio = await setupAudio()

    const params = new URLSearchParams(window.location.search)
    const fragmentShader = await getFragmentShader()
    const vertexShader = await getVertexShader()

    window.shader = fragmentShader
    const initialImageUrl = params.get('image') ?? 'images/placeholder-image.png'
    const fullscreen = (params.get('fullscreen') ?? false) === 'true'
    const canvas = document.getElementById('visualizer')
    const render = await makeVisualizer({ canvas, initialImageUrl, fullscreen })
    requestAnimationFrame(() => animate({ render, audio, fragmentShader, vertexShader }))

    ranMain = true
}

// if the url contains the string 'edit', don't do this.
if (!window.location.href.includes('edit')) {
    events.forEach((event) => {
        // get the visualizer
        const visualizer = document.getElementById('visualizer')
        visualizer.addEventListener(event, main, { once: true })
        visualizer.addEventListener(
            event,
            () => {
                document.documentElement.requestFullscreen()
            },
            { once: true },
        )
    })
}
const setupAudio = async () => {
    const audioContext = new AudioContext()
    await audioContext.resume()
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const sourceNode = audioContext.createMediaStreamSource(stream)
    const historySize = parseInt(params.get('history_size') ?? '500')
    const audioProcessor = new AudioProcessor(audioContext, sourceNode, historySize)
    await audioProcessor.start()
    return audioProcessor
}

const animate = ({ render, audio, fragmentShader, vertexShader }) => {
    fragmentShader = window.cranes?.shader ?? fragmentShader
    const measuredAudioFeatures = audio.getFeatures()
    const queryParamFeatures = {}
    const params = new URLSearchParams(window.location.search)
    // collect the rest of the params
    for (const [key, value] of params) {
        queryParamFeatures[key] = value
    }

    window.cranes.measuredAudioFeatures = measuredAudioFeatures
    const features = { ...measuredAudioFeatures, ...queryParamFeatures }
    try {
        render({ time: (performance.now() - startTime) / 1000, features, fragmentShader, vertexShader })
    } catch (e) {
        console.error(e)
    }
    requestAnimationFrame(() => animate({ render, audio, fragmentShader, vertexShader }))
}
