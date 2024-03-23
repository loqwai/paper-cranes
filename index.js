import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { makeVisualizer } from './src/Visualizer.js'
import './index.css'
const events = ['click', 'touchstart', 'keydown', 'touchmove', 'touchstop']

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
window.cranes.overwrittenAudioFeatures = window.cranes.overwrittenAudioFeatures || {}
window.cranes.manualFeatures = window.cranes.manualFeatures || {}

window.cranes.freezeAudioFeatures = () => {
    window.cranes.overwrittenAudioFeatures = { ...window.cranes.measuredAudioFeatures }
    return window.cranes.overwrittenAudioFeatures
}

window.cranes.saveAudioFeatures = () => {
    localStorage.setItem('overwrittenAudioFeatures', JSON.stringify(window.cranes.overwrittenAudioFeatures))
}

window.cranes.loadAudioFeatures = () => {
    window.cranes.overwrittenAudioFeatures = JSON.parse(localStorage.getItem('overwrittenAudioFeatures'))
}

window.cranes.loadManualFeatures = (name) => {
    window.cranes.manualFeatures = JSON.parse(localStorage.getItem(`manual-features-${name}`))
}

const main = async () => {
    if (ranMain) return

    window.c = cranes
    startTime = performance.now()
    const audio = await setupAudio()

    const params = new URLSearchParams(window.location.search)

    const shaderUrl = params.get('shader')
    let shader

    if (shaderUrl) {
        shader = await getShader(shaderUrl)
    }

    if (!shader) {
        shader = localStorage.getItem('cranes-manual-code')
    }

    if (!shader) {
        shader = await getShader('default')
    }

    window.shader = shader
    const initialImageUrl = params.get('image') ?? 'images/placeholder-image.png'
    const fullscreen = (params.get('fullscreen') ?? false) === 'true'
    const canvas = document.getElementById('visualizer')
    const render = await makeVisualizer({ canvas, shader, initialImageUrl, fullscreen })
    requestAnimationFrame(() => animate({ render, audio, shader }))
    ranMain = true
}

events.forEach((event) => {
    document.addEventListener(event, main, { once: true })
})

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

const getShader = async (url) => {
    //if the url is not a full url, then it's a relative url
    if (!url.includes('http')) {
        url = `/shaders/${url}.frag`
    }
    const res = await fetch(url)
    const fragmentShader = await res.text()
    return fragmentShader
}

const animate = ({ render, audio, shader }) => {
    shader = window.cranes?.shader ?? shader
    const measuredAudioFeatures = audio.getFeatures()
    const queryParamFeatures = {}
    const params = new URLSearchParams(window.location.search)
    // collect the rest of the params
    for (const [key, value] of params) {
        queryParamFeatures[key] = value
    }

    const { overwrittenAudioFeatures, manualFeatures } = window.cranes
    window.cranes.measuredAudioFeatures = measuredAudioFeatures
    const features = { ...measuredAudioFeatures, ...queryParamFeatures, ...overwrittenAudioFeatures, ...manualFeatures }
    try {
        render({ time: (performance.now() - startTime) / 1000, features, shader })
    } catch (e) {
        console.error(e)
    }
    requestAnimationFrame(() => animate({ render, audio, shader }))
}
