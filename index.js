import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { makeVisualizer } from './src/Visualizer.js'
import './index.css'
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const events = ['click', 'touchstart', 'keydown', 'touchmove', 'touchstop']

let ranMain = false
let startTime = 0
const params = new URLSearchParams(window.location.search)

const interceptFetchAndCacheEverything = () => {
    console.log('setting up fetch interceptor')
    const originalFetch = window.fetch
    window.fetch = async (url, options) => {
        console.log('look at me, I am the fetch now')
        //if the query parameter 'debug' is set, don't cache

        if (params.has('debug')) {
            return originalFetch(url, options)
        }
        const key = `cranes-${JSON.stringify({ url, options })}`
        const cached = localStorage.getItem(key)
        if (cached) {
            console.log(`cache hit for ${url}`)
            return new Response(cached)
        }
        const response = await originalFetch(url, options)
        const responseClone = response.clone()
        const text = await responseClone.text()
        localStorage.setItem(key, text)
        return response
    }
}
interceptFetchAndCacheEverything()
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
    const shader = params.get('shader') ?? 'prev-frame-check'
    const initialImageUrl = params.get('image') ?? 'images/placeholder-image.png'

    const canvas = document.getElementById('visualizer')
    const render = await makeVisualizer({ canvas, shader, initialImageUrl })

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
    const audioProcessor = new AudioProcessor(audioContext, sourceNode)
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
