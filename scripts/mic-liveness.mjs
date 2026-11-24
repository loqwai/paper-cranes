// Drives the built app with a synthetic mic and prints, per second, how many frames the
// audio features changed on, alongside AudioContext state, live mic tracks and analyser
// saturation. Used to reproduce "visuals stop reacting to the mic" and prove recovery.
//
//   node scripts/mic-liveness.mjs <firefox|chromium> <scenario> <seconds> <url>
//
// Scenarios (the event fires at t=10s):
//   steady    nothing happens; watch for drift over a long run
//   trackend  the OS takes the mic: every track the page holds is stopped
//   suspend   the OS suspends the page's AudioContext
//   flap      trackend every 15s, to count graphs and workers after repeated recoveries
import { firefox, chromium } from 'playwright'

const [browserName = 'firefox', scenario = 'steady', seconds = '30', url = 'http://127.0.0.1:4317/'] = process.argv.slice(2)

// The page's mic: pulsed noise from its own AudioContext, so it keeps playing when the page's
// context is suspended. Each getUserMedia call returns a clone, so tracks stop independently.
const fakeMic = () => {
    const ctx = new AudioContext()
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = noise
    src.loop = true
    const gain = ctx.createGain()
    const dest = ctx.createMediaStreamDestination()
    src.connect(gain).connect(dest)
    src.start()
    setInterval(() => gain.gain.setValueAtTime(Math.random() * 0.05, ctx.currentTime), 120)
    const mic = { calls: 0, tracks: [] }
    window.__mic = mic
    const getUserMedia = async () => {
        await ctx.resume()
        mic.calls++
        const stream = dest.stream.clone()
        mic.tracks.push(...stream.getAudioTracks())
        return stream
    }
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: getUserMedia })
    Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', { value: async () => [] })

    const workers = { live: 0 }
    window.__workers = workers
    const RealWorker = window.Worker
    window.Worker = class extends RealWorker {
        constructor(...args) { super(...args); workers.live++ }
        terminate() { workers.live--; super.terminate() }
    }

    const buckets = []
    window.__buckets = buckets
    let last
    let bucket
    const sample = () => {
        requestAnimationFrame(sample)
        const second = Math.floor(performance.now() / 1000)
        if (!bucket || bucket.second !== second) {
            bucket = { second, frames: 0, changed: 0 }
            buckets.push(bucket)
        }
        const raw = window.cranes?.audio?.rawFeatures
        const value = raw?.spectralCentroid?.stats?.current
        bucket.frames++
        if (value !== undefined && value !== last) bucket.changed++
        last = value
        const fft = window.cranes?.audio?.fftData
        if (fft) bucket.saturated = fft.filter(v => v === 255).length / fft.length
        bucket.ctx = window.cranes?.audioContext?.state
        bucket.liveTracks = mic.tracks.filter(t => t.readyState === 'live').length
        bucket.gum = mic.calls
        bucket.workers = workers.live
    }
    requestAnimationFrame(sample)
}

const launchers = {
    firefox: () => firefox.launch({
        firefoxUserPrefs: { 'media.autoplay.default': 0, 'media.autoplay.blocking_policy': 0, 'webgl.force-enabled': true },
    }),
    chromium: () => chromium.launch({
        args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    }),
}

const events = {
    trackend: () => window.__mic.tracks.forEach(t => t.stop()),
    suspend: () => window.cranes.audioContext.suspend(),
}

const browser = await launchers[browserName]()
const page = await browser.newPage()
page.on('console', m => { if (/mic|audio/i.test(m.text())) console.error(`[page] ${m.text()}`) })
await page.addInitScript(fakeMic)
await page.goto(url)
const t0 = Date.now()
const at = (s) => page.waitForTimeout(Math.max(0, t0 + s * 1000 - Date.now()))

if (scenario === 'flap') {
    for (let s = 10; s < Number(seconds); s += 15) {
        await at(s)
        await page.evaluate(events.trackend)
    }
} else if (events[scenario]) {
    await at(10)
    await page.evaluate(events[scenario])
}
await at(Number(seconds))

const buckets = await page.evaluate(() => window.__buckets)
const start = buckets[0].second
for (const b of buckets.slice(0, -1)) {
    const rate = b.frames ? b.changed / b.frames : 0
    const bar = '#'.repeat(Math.round(rate * 20))
    console.log(`${String(b.second - start).padStart(4)}s  ${bar.padEnd(20)} changed ${String(b.changed).padStart(3)}/${String(b.frames).padStart(3)}  ctx=${b.ctx}  tracks=${b.liveTracks}  gum=${b.gum}  workers=${b.workers}  sat=${((b.saturated ?? 0) * 100).toFixed(0)}%`)
}
await browser.close()
