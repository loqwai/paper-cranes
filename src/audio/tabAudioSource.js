// Tab-audio capture via getDisplayMedia.
//
// Lets users visualize Spotify (or any tab/app) without installing a loopback
// audio driver. User clicks a button, picks a tab in the browser's share
// sheet, and we pull the audio track out of the resulting MediaStream and
// feed it into AudioProcessor exactly like a mic stream.
//
// Must be called from a user gesture (click/keydown) — browsers reject
// getDisplayMedia otherwise. Chrome/Edge support tab audio; Firefox/Safari
// currently do not expose audio tracks from getDisplayMedia.

export const isTabAudioSupported = () =>
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function'

// Chrome requires { video: true } to surface audio from getDisplayMedia.
// We immediately drop the video track after acquisition so nothing renders it.
export const captureTabAudioStream = async () => {
    if (!isTabAudioSupported()) {
        throw new Error('Tab audio capture is not supported in this browser. Try Chrome or Edge on desktop.')
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
        },
        // Hint the picker toward tab/window sharing so users don't accidentally
        // share an entire screen (which captures system audio on some OSes but
        // not on others). Supported in Chromium; ignored elsewhere.
        preferCurrentTab: false,
        selfBrowserSurface: 'exclude',
        surfaceSwitching: 'include',
        systemAudio: 'include',
    })

    for (const track of stream.getVideoTracks()) track.stop()

    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length === 0) {
        for (const track of stream.getTracks()) track.stop()
        throw new Error('No audio track in shared surface. When sharing, check the "Share tab audio" box in the picker.')
    }

    return stream
}

// Build an AudioContext + source node from a shared-tab MediaStream, wired up
// the same way the mic path wires itself. Returns the pieces AudioProcessor
// needs, plus an onEnded hook for when the user stops sharing.
export const makeTabAudioSource = (stream) => {
    const audioContext = new AudioContext()
    const sourceNode = audioContext.createMediaStreamSource(stream)

    const onEnded = (cb) => {
        const track = stream.getAudioTracks()[0]
        if (!track) return
        track.addEventListener('ended', cb, { once: true })
    }

    return { audioContext, sourceNode, stream, onEnded }
}

// Entry point called from index.js when ?audio=tab is set.
// Returns a holder that mimics AudioProcessor's getFeatures shape immediately
// so the render loop can start, then swaps in the real processor once the
// user clicks the share button. Only loaded (dynamic import) when opted in.
export const setupTabAudio = ({ params, AudioProcessor }) => {
    const holder = { getFeatures: () => ({}) }

    const run = async () => {
        try {
            const { promptForTabAudio } = await import('./tabAudioButton.js')
            const stream = await promptForTabAudio()
            const { audioContext, sourceNode, onEnded } = makeTabAudioSource(stream)
            await audioContext.resume()

            const historySize = parseInt(params.get('history_size') ?? '500')
            const fftSize = parseInt(params.get('fft_size') ?? '4096')
            const smoothing = parseFloat(params.get('smoothing') ?? '0.15')

            const processor = new AudioProcessor(audioContext, sourceNode, historySize, fftSize)
            processor.smoothingFactor = smoothing
            await processor.start()

            holder.getFeatures = processor.getFeatures

            // If the user clicks "Stop sharing" in the browser, re-prompt so
            // they can pick another tab without reloading the page.
            onEnded(() => {
                holder.getFeatures = () => ({})
                processor.cleanup()
                audioContext.close().catch(() => {})
                run()
            })
        } catch (err) {
            console.error('Tab audio flow failed:', err)
        }
    }
    run()

    return holder
}
