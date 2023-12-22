import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { makeVisualizer } from './src/Visualizer.js'

const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const events = ['click', 'touchstart', 'keydown', 'touchmove', 'touchstop']

let ranMain = false
let startTime = 0
const main = async () => {
    if (ranMain) return
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
    await timeout(100)
    return audioProcessor
}

const updateUI = () => {
    const body = document.querySelector('body')
    body.classList.add('ready')
}

const animate = ({ render, audio }) => {
    const audioFeatures = audio.getFeatures()
    render({ time: (performance.now() - startTime) / 1000, audioFeatures })
    requestAnimationFrame(() => animate({ render, audio }))
}
