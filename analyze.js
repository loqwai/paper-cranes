import { render } from 'preact'
import { useState, useRef } from 'preact/hooks'
import { html } from 'htm/preact'
import { AudioProcessor } from './src/audio/AudioProcessor.js'
import { normalizeAnalysisData } from './src/audio/normalizer.js'
import BarGraph from './src/components/BarGraph.js'

const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const Analyzer = () => {
    // UI State
    const [status, setStatus] = useState('Upload an MP3 file to begin')
    const [progress, setProgress] = useState(0)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [hasResults, setHasResults] = useState(false)
    const [inputFileName, setInputFileName] = useState('audio')
    const [timeInfo, setTimeInfo] = useState({
        current: '0:00',
        start: '0:00',
        end: '0:00',
    })
    const [currentFeatures, setCurrentFeatures] = useState({ ready: 0 })

    // Audio State
    const analysisResults = useRef([])
    const audioContext = useRef(null)
    const source = useRef(null)
    const processor = useRef(null)

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) {
            setStatus('Upload an MP3 file to begin')
            return
        }

        const fullName = file.name
        setInputFileName(fullName.substring(0, fullName.lastIndexOf('.')) || fullName)
        setHasResults(false)
        setStatus('Click Analyze to begin')
    }

    const cleanup = () => {
        source.current?.stop()
        audioContext.current?.close()
        source.current = null
        audioContext.current = null
        processor.current = null
    }

    const handleAnalyze = async (e) => {
        const fileInput = e.target.form.querySelector('input[type="file"]')
        if (!fileInput.files?.length) return

        setIsAnalyzing(true)
        setStatus('Analyzing...')
        setProgress(0)
        analysisResults.current = []

        try {
            // Setup audio processing
            audioContext.current = new AudioContext()
            const file = fileInput.files[0]
            const buffer = await file.arrayBuffer()
            const decodedBuffer = await audioContext.current.decodeAudioData(buffer)

            source.current = audioContext.current.createBufferSource()
            source.current.buffer = decodedBuffer

            processor.current = new AudioProcessor(audioContext.current, source.current, 500)
            await processor.current.start()

            // Connect and start playback
            source.current.connect(audioContext.current.destination)
            source.current.start()

            const startTime = performance.now()
            const duration = decodedBuffer.duration * 1000
            setTimeInfo({ current: '0:00', start: '0:00', end: formatTime(duration) })

            // Analysis loop - Fixed version
            await new Promise((resolve) => {
                const analyze = async () => {
                    const currentTime = performance.now() - startTime
                    const progress = currentTime / duration

                    setProgress(Math.min(progress * 100, 100))
                    setTimeInfo(prev => ({ ...prev, current: formatTime(currentTime) }))

                    const features = await processor.current.getFeatures()
                    analysisResults.current.push({ timestamp: currentTime, features })
                    setCurrentFeatures(features)

                    if (progress >= 1) {
                        cleanup()
                        resolve()
                    } else {
                        requestAnimationFrame(analyze)
                    }
                }
                requestAnimationFrame(analyze)
            })

            setStatus('Analysis complete!')
            setHasResults(true)
        } catch (error) {
            console.error(error)
            setStatus(`Error: ${error.message}`)
            cleanup()
        } finally {
            setIsAnalyzing(false)
        }
    }

    const downloadData = (data, filename) => {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleDownload = () => {
        downloadData(analysisResults.current, `${inputFileName}-analysis.json`)
    }

    const handleDownloadNormalized = () => {
        const { normalized, ranges } = normalizeAnalysisData(analysisResults.current)
        downloadData(normalized, `${inputFileName}-normalized.json`)
        downloadData(ranges, `${inputFileName}-normalized-ranges.json`)
    }

    return html`
        <div class="container">
            <form class="upload-section">
                <input type="file" accept="audio/mp3" onChange=${handleFileChange} disabled=${isAnalyzing} />
                <button type="button" onClick=${handleAnalyze} disabled=${isAnalyzing}>Analyze</button>
                <div class="download-buttons">
                    <button type="button" onClick=${handleDownload} disabled=${!hasResults}>Download Results</button>
                    <button type="button" onClick=${handleDownloadNormalized} disabled=${!hasResults}>Download Normalized</button>
                </div>
            </form>

            <div class="progress-section">
                <div class="progress-bar-container">
                    <span class="time-label">${timeInfo.start}</span>
                    <div class="progress-bar">
                        <div class="progress" style=${`width: ${progress}%`} />
                    </div>
                    <span class="time-label">${timeInfo.end}</span>
                </div>
                <div class="time-current">${timeInfo.current}</div>
                <div id="status">${status}</div>
            </div>

            <${BarGraph} features=${currentFeatures} />
            <pre class="analysis-display">
                ${JSON.stringify(currentFeatures, null, 2)}
            </pre
            >
        </div>
    `
}

render(html`<${Analyzer} />`, document.body)
