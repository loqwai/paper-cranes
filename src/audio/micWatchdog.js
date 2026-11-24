// Keeps the mic feeding the visualizer after a phone locks, takes a call, or hands the mic to
// another app. Mobile browsers then suspend the AudioContext, or end or mute the mic track, and
// nothing in the page notices: the render loop keeps drawing frozen features.
//
// Recovery only swaps the MediaStreamSource in front of inputGain (as scripts/show/audio-swap.js
// does), so the AudioProcessor, its worklet and its workers are never rebuilt or duplicated.

const CHECK_MS = 500
const STALE_MS = 2000
// Wait before the next re-acquire while the input stays frozen, so true digital silence costs at
// most one getUserMedia every 30 s instead of a loop.
const BACKOFF_MS = [2000, 5000, 10000, 30000]

export const watchMic = ({ audioContext, inputGain, getStream, debug = false }) => {
    const probe = new AnalyserNode(audioContext, { fftSize: 32 })
    inputGain.connect(probe)
    const samples = new Float32Array(probe.fftSize)

    let signature
    let lastChange = performance.now()
    let failures = 0
    let nextAttempt = 0
    let reacquiring = false
    let recoveries = 0
    let reason = ''

    const track = () => window.cranes.audioSource?.mediaStream.getAudioTracks()[0]

    // A live mic never repeats a non-zero window exactly; a stuck graph does. Exact zeros on a
    // live, unmuted track are real silence (BlackHole between tracks), not a fault.
    const readInput = () => {
        probe.getFloatTimeDomainData(samples)
        let signature = 0
        let silent = true
        for (let i = 0; i < samples.length; i++) {
            signature += samples[i] * (i + 1)
            if (samples[i] !== 0) silent = false
        }
        return { signature, silent }
    }

    const listen = (t) => {
        for (const event of ['ended', 'mute', 'unmute']) t?.addEventListener(event, check)
    }

    const reacquire = async (why) => {
        reacquiring = true
        recoveries++
        reason = why
        console.warn(`mic watchdog: ${why}, re-acquiring the mic`)
        try {
            const old = window.cranes.audioSource
            // The device in use, which scripts/show/audio-swap.js may have changed since load
            const stream = await getStream(track()?.getSettings().deviceId)
            const source = audioContext.createMediaStreamSource(stream)
            source.connect(inputGain)
            old?.disconnect()
            old?.mediaStream.getTracks().forEach(t => t.stop())
            window.cranes.audioSource = source
            listen(track())
        } catch (err) {
            console.warn('mic watchdog: re-acquire failed', err)
        }
        nextAttempt = performance.now() + BACKOFF_MS[Math.min(failures, BACKOFF_MS.length - 1)]
        failures++
        lastChange = performance.now()
        reacquiring = false
    }

    function check() {
        const now = performance.now()
        if (document.hidden || reacquiring) {
            lastChange = now
            return
        }
        if (audioContext.state !== 'running') {
            reason = `context ${audioContext.state}`
            audioContext.resume().catch(() => {})
            lastChange = now
            return
        }
        if (track()?.readyState === 'ended') {
            if (now >= nextAttempt) reacquire('track ended')
            return
        }
        const { signature: next, silent } = readInput()
        if (next !== signature || (silent && !track()?.muted)) {
            signature = next
            lastChange = now
            failures = 0
            return
        }
        if (now - lastChange > STALE_MS && now >= nextAttempt) reacquire('input frozen')
    }

    listen(track())
    audioContext.addEventListener('statechange', check)
    for (const event of ['visibilitychange', 'pageshow', 'focus', 'pointerdown']) {
        window.addEventListener(event, check, { passive: true })
    }
    setInterval(check, CHECK_MS)

    if (debug) showReadout(() => {
        const t = track()
        const age = ((performance.now() - lastChange) / 1000).toFixed(1)
        return `ctx ${audioContext.state} · track ${t?.readyState ?? 'none'}${t?.muted ? ' muted' : ''} · input changed ${age}s ago · recoveries ${recoveries}${reason ? ` (${reason})` : ''}`
    })
}

// ?debug_audio=true: a one-line readout so a phone check shows why audio stopped, if it does.
const showReadout = (text) => {
    const el = document.createElement('div')
    el.id = 'debug-audio'
    el.style.cssText = 'position:fixed;left:0;bottom:0;z-index:9999;padding:4px 8px;font:12px monospace;color:#0f0;background:rgba(0,0,0,.7);pointer-events:none'
    document.body.append(el)
    setInterval(() => { el.textContent = text() }, 250)
}
