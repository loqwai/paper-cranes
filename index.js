import * as THREE from 'three'
import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { makeVisualizer } from './src/Visualizer.js'

const events = ['click', 'touchstart', 'keydown']

const main = async () => {
    if (window.viz) return // Prevent multiple calls
    const audio = await setupAudio()

    const params = new URLSearchParams(window.location.search)
    const shader = params.get('shader') ?? 'beat-trip'
    const initialImageUrl = params.get('image')

    const canvas = document.getElementById('visualizer')
    const render = await makeVisualizer({ canvas, shader })

    updateUI()

    requestAnimationFrame(() => animate({ render, audio }))
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

const updateUI = () => {}

const animate = ({ render, audio }) => {
    const audioFeatures = audio.features
    render({ time: performance.now(), audioFeatures })
    requestAnimationFrame(() => animate({ render, audio }))
}
