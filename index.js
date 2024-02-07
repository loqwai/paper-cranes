import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { makeVisualizer } from './src/Visualizer.js'
import './index.css'
const events = ['click', 'touchstart', 'keydown', 'touchmove', 'touchstop']

let ranMain = false
let startTime = 0
const params = new URLSearchParams(window.location.search)
// check if we have microphone access. If so, just run main immediately
navigator.mediaDevices
    .getUserMedia({ audio: true })
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
const main = async () => {
    if (ranMain) return
    window.cranes = window.cranes || {}
    window.cranes.overwrittenAudioFeatures = window.cranes.overwrittenAudioFeatures || {}
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
    startTime = performance.now()
    const audio = await setupAudio()

    const params = new URLSearchParams(window.location.search)
    const shader = params.get('shader') ?? 'warp-emitter'
    const initialImageUrl = params.get('image') ?? 'images/placeholder-image.png'
    const fullscreen = (params.get('fullscreen') ?? false) === 'true'

    const canvas = document.getElementById('visualizer')
    const render = await makeVisualizer({ canvas, shader, initialImageUrl, fullscreen })

    updateUI()
    requestAnimationFrame(() => animate({ render, audio }))
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
    const historySize = parseInt(params.get('history-size') ?? '500')
    const audioProcessor = new AudioProcessor(audioContext, sourceNode, historySize)
    await audioProcessor.start()
    return audioProcessor
}

const updateUI = () => {
    const body = document.querySelector('body')
    body.classList.add('ready')
}

const animate = ({ render, audio }) => {
    const measuredAudioFeatures = audio.getFeatures()
    const { overwrittenAudioFeatures } = window.cranes
    window.cranes.measuredAudioFeatures = measuredAudioFeatures

    const audioFeatures = { ...measuredAudioFeatures, ...overwrittenAudioFeatures }
    render({ time: (performance.now() - startTime) / 1000, audioFeatures })
    requestAnimationFrame(() => animate({ render, audio }))
}
