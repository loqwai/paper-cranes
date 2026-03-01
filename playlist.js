import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { makeVisualizer } from './src/Visualizer.js'
import { loadShader } from './src/shaderLoader.js'

const SEED_KEY = 'paperCranes.seeds'

const loadOrCreateSeeds = () => {
    const stored = localStorage.getItem(SEED_KEY)
    if (stored) {
        try {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed) && parsed.length === 4 && parsed.every(n => typeof n === 'number')) return parsed
        } catch { /* regenerate */ }
    }
    const seeds = Array.from({ length: 4 }, () => Math.random())
    localStorage.setItem(SEED_KEY, JSON.stringify(seeds))
    return seeds
}

const params = new URLSearchParams(window.location.search)
let startTime = 0

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
        y: 1.0 - (y - rect.top) / rect.height
    }
}

const coordsHandler = {
    coords: { x: 0.5, y: 0.5 },
    touched: false,
    updateCoords(event, element) {
        this.coords = getNormalizedCoordinates(event, element)
        this.touched = true
    },
    reset() { this.touched = false }
}

const setupCanvasEvents = (canvas) => {
    const updateCoords = (e) => coordsHandler.updateCoords(e, canvas)
    const resetTouch = () => coordsHandler.reset()
    canvas.addEventListener('touchmove', updateCoords)
    canvas.addEventListener('touchstart', updateCoords)
    canvas.addEventListener('mousemove', updateCoords)
    canvas.addEventListener('touchend', resetTouch)
    canvas.addEventListener('mouseup', resetTouch)
    canvas.addEventListener('mouseleave', resetTouch)
}

const noAudio = { getFeatures: () => ({}) }

const setupAudio = async () => {
    if (params.get('noaudio') === 'true') return noAudio

    try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices.filter(d => d.kind === 'audioinput')
        const defaultAudioInput = audioInputs[0]?.deviceId

        const audioConfig = {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: params.get('autoGainControl') !== 'false',
            latency: 0,
            sampleRate: 44100,
            sampleSize: 16,
            channelCount: 2,
        }

        await navigator.mediaDevices.getUserMedia({
            audio: {
                ...audioConfig,
                ...(audioInputs.length > 1 && defaultAudioInput ? { deviceId: { exact: defaultAudioInput } } : {})
            }
        })

        const audioContext = new AudioContext()
        await audioContext.resume()

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                ...audioConfig,
                ...(audioInputs.length > 1 && defaultAudioInput ? { deviceId: { exact: defaultAudioInput } } : {})
            }
        })

        const sourceNode = audioContext.createMediaStreamSource(stream)
        const historySize = parseInt(params.get('history_size') ?? '500')
        const fftSize = parseInt(params.get('fft_size') ?? '4096')
        const smoothing = parseFloat(params.get('smoothing') ?? '0.15')
        const audioProcessor = new AudioProcessor(audioContext, sourceNode, historySize, fftSize)
        audioProcessor.smoothingFactor = smoothing
        audioProcessor.start()
        return audioProcessor
    } catch (err) {
        console.error('Audio initialization failed:', err)
        return noAudio
    }
}

const parseUrlParams = (searchParams) => {
    const result = {}
    for (const [key, value] of searchParams) {
        const num = parseFloat(value)
        result[key] = !isNaN(num) ? num : value
    }
    return result
}

const getCranesState = () => {
    const [s1, s2, s3, s4] = window.cranes.seeds
    return {
        seed: s1, seed2: s2, seed3: s3, seed4: s4,
        ...window.cranes.measuredAudioFeatures,
        ...window.cranes.controllerFeatures,
        ...parseUrlParams(params),
        ...window.cranes.manualFeatures,
        ...window.cranes.messageParams,
        touch: [coordsHandler.coords.x, coordsHandler.coords.y],
        touched: coordsHandler.touched
    }
}

const setupCranesState = () => {
    window.cranes = {
        seeds: loadOrCreateSeeds(),
        measuredAudioFeatures: {},
        controllerFeatures: {},
        manualFeatures: {},
        messageParams: {},
        frameCount: 0,
        flattenFeatures: getCranesState
    }
    window.c = window.cranes
}

const shuffle = (arr) => {
    const shuffled = [...arr]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

const fetchFavorites = async () => {
    const res = await fetch('/shaders.json')
    const shaders = await res.json()
    return shaders.filter(s => s.favorite === true)
}

const events = ['touchstart', 'touchmove', 'touchstop', 'keydown', 'mousedown', 'resize']

const addListenersForFullscreen = (element) => {
    for (const event of events) {
        element.addEventListener(event, async () => {
            try { await document.documentElement.requestFullscreen() }
            catch (e) { console.error(`requesting fullscreen from event ${event} failed`, e) }
        }, { once: true })
    }
}

const main = async () => {
    setupCranesState()
    startTime = performance.now()

    // Remote display support
    if (params.get('remote') === 'display') {
        const { initRemoteDisplay } = await import('./src/remote/RemoteDisplay.js')
        initRemoteDisplay()
    }

    // Fetch favorites
    const favorites = await fetchFavorites()
    if (favorites.length === 0) {
        console.error('No favorite shaders found in shaders.json')
        return
    }

    const shouldShuffle = params.get('shuffle') !== 'false'
    const playlist = shouldShuffle ? shuffle(favorites) : favorites
    const duration = parseInt(params.get('duration') ?? '30') * 1000
    let currentIndex = 0

    // Load first shader
    const { code: fragmentShader } = await loadShader(playlist[0].name)
    document.title = `Paper Cranes - Playlist: ${playlist[0].displayName || playlist[0].name}`

    // Setup audio and canvas
    const audio = await setupAudio()
    const canvas = document.getElementById('visualizer')
    setupCanvasEvents(canvas)

    if (params.get('fullscreen') !== 'false') addListenersForFullscreen(canvas)

    document.addEventListener('fullscreenchange', () => {
        document.body.style.cursor = document.fullscreenElement ? 'none' : 'default'
    })

    const render = await makeVisualizer({
        canvas,
        initialImageUrl: params.get('image') ?? 'images/placeholder-image.png',
        fullscreen: true
    })

    // Animation loop
    const animate = () => {
        requestAnimationFrame(animate)
        try {
            window.cranes.measuredAudioFeatures = audio.getFeatures() || {}
            const features = window.cranes.flattenFeatures()
            window.cranes.frameCount++
            render({
                time: ((performance.now() - startTime) / 1000) % 1000,
                features,
                fragmentShader: window.cranes?.shader ?? fragmentShader,
            })
        } catch (e) {
            console.error('Shader render error:', e)
        }
    }
    requestAnimationFrame(animate)

    // Shader cycling timer
    const advanceShader = async () => {
        currentIndex = (currentIndex + 1) % playlist.length
        const shader = playlist[currentIndex]
        console.log(`Playlist: switching to ${shader.name} (${currentIndex + 1}/${playlist.length})`)
        document.title = `Paper Cranes - Playlist: ${shader.displayName || shader.name}`
        await loadShader(shader.name)
    }

    setInterval(advanceShader, duration)
}

main()
