import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { makeVisualizer } from './src/Visualizer.js'

let ranMain = false
let startTime = 0
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
    // const audio = await setupAudio()

    const params = new URLSearchParams(window.location.search)
    const shader = params.get('shader') ?? 'prev-frame-check'
    const initialImageUrl = params.get('image') ?? 'images/placeholder-image.png'

    const canvas = document.getElementById('visualizer')
    const render = await makeVisualizer({ canvas, shader, initialImageUrl })
    const audio = {
        getFeatures: () => {
            return window.cranes.overwrittenAudioFeatures
        },
    }
    requestAnimationFrame(() => animate({ render, audio }))
    window.cranes.loadAudioFeatures()
    ranMain = true
}
const animate = ({ render, audio }) => {
    const measuredAudioFeatures = audio.getFeatures()
    const { overwrittenAudioFeatures } = window.cranes
    window.cranes.measuredAudioFeatures = measuredAudioFeatures

    const audioFeatures = { ...measuredAudioFeatures, ...overwrittenAudioFeatures }
    render({ time: (performance.now() - startTime) / 1000, audioFeatures })
    requestAnimationFrame(() => animate({ render, audio }))
}

main()
