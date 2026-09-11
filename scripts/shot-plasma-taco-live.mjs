// Headless A/B shots for claude/wip/plasma-taco-live vs the original redaphid/taco/plasma.
// Follows docs/advanced-shader-techniques.md §10: there is no mic in headless, so we inject
// features into window.cranes.manualFeatures (which overrides controllerFeatures) and capture
// a "quiet" frame vs a "loud/drop" frame to prove the reactivity is real.
//
//   node scripts/shot-plasma-taco-live.mjs      (dev server must be on :6969)
import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'

const OUT = 'D:/projects/paper-cranes/tmp/taco-live-shots-newpath'
const IMG = 'image=images/taco-stencil.png'
const SEEDS = 'seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029'

// A good-looking knob preset for the new shader (all knobs default to 0 and still look fine,
// but this is the tuned starting point quoted in the .frag header).
const KNOBS = 'knob_1=0.45&knob_2=0.25&knob_3=0.35&knob_4=0.6&knob_5=0.6&knob_6=0&knob_7=0.5&knob_8=0.5&knob_9=0.5&knob_10=0.3'

// LOUD: what the wavelet-ease controller emits mid-drop. Smooth springs high, gate open.
const LOUD = {
    quietGate: 1.0,
    energySpring: 0.72,
    waveletBassSpring: 0.85,
    waveletBand2Spring: 0.60,
    waveletBand3Spring: 0.55,
    waveletBand5Spring: 0.62,
    waveletCentroidSpring: 0.55,
    melodyFlow: 0.70,
    tonalStrength: 0.60,
    spectralCrestSmooth: 0.55,
    spectralRoughnessSmooth: 0.40,
    spectralEntropySmooth: 0.45,
    wubDepth: 0.35,
    waveletTiltNormalized: 0.60,
    evoWarp: 0.55,
    evoPlasma: 0.60,
    sectionMode: 0,
    sectionMix: 1,
}
// DROP: loud + the raw transients (kick) + a section change part-way through its crossfade.
const DROP = { ...LOUD, waveletBassZScore: 1.0, wavelet_bassHit: 1.0, sectionMode: 2, sectionMix: 0.45, energySpring: 0.9 }

// The ORIGINAL plasma taco runs on the taco-kandi controller — different uniform names.
const LOUD_ORIG = {
    bass_smooth: 0.85, drop_glow: 0.7, beat_pulse: 0.9,
    energyNormalized: 0.8, energyZScore: 0.9, midsNormalized: 0.6, trebleZScore: 0.7,
    spectralCentroidNormalized: 0.5, spectralFluxNormalized: 0.6, spectralFluxZScore: 0.8,
    spectralRoughnessZScore: 0.5, spectralEntropyNormalized: 0.5, pitchClassNormalized: 0.4,
}

const shots = [
    { tag: 'live-quiet', url: `/?shader=redaphid/taco/plasma-taco-live&${IMG}&wavelet=true&controller=wavelet-ease&fullscreen=true&noaudio=true&${SEEDS}&${KNOBS}`, inject: null },
    { tag: 'live-loud', url: `/?shader=redaphid/taco/plasma-taco-live&${IMG}&wavelet=true&controller=wavelet-ease&fullscreen=true&noaudio=true&${SEEDS}&${KNOBS}`, inject: LOUD },
    { tag: 'live-drop', url: `/?shader=redaphid/taco/plasma-taco-live&${IMG}&wavelet=true&controller=wavelet-ease&fullscreen=true&noaudio=true&${SEEDS}&${KNOBS}`, inject: DROP },
    { tag: 'live-defaultknobs-loud', url: `/?shader=redaphid/taco/plasma-taco-live&${IMG}&wavelet=true&controller=wavelet-ease&fullscreen=true&noaudio=true&${SEEDS}`, inject: LOUD },
    { tag: 'orig-quiet', url: `/?shader=redaphid/taco/plasma&${IMG}&controller=taco-kandi&fullscreen=true&noaudio=true&${SEEDS}`, inject: null },
    { tag: 'orig-loud', url: `/?shader=redaphid/taco/plasma&${IMG}&controller=taco-kandi&fullscreen=true&noaudio=true&${SEEDS}`, inject: LOUD_ORIG },
]

await mkdir(OUT, { recursive: true })
const b = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const ctx = await b.newContext({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const errs = []
page.on('console', m => { if (m.type() === 'error') { errs.push(m.text()); console.log('[console error]', m.text()) } })
page.on('pageerror', e => { errs.push(String(e)); console.log('[page error]', String(e)) })

for (const s of shots) {
    await page.goto('http://localhost:6969' + s.url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2500)
    if (s.inject) {
        await page.evaluate(f => Object.assign(window.cranes.manualFeatures, f), s.inject)
        await page.waitForTimeout(1800) // let the frame-feedback trail settle into the new state
    }
    // sanity: is the canvas actually painting anything, or is it a black rectangle?
    const stats = await page.evaluate(() => {
        const c = document.querySelector('canvas')
        if (!c) return { error: 'no canvas' }
        const o = document.createElement('canvas')
        o.width = 160; o.height = 160
        const g = o.getContext('2d')
        g.drawImage(c, 0, 0, 160, 160)
        const d = g.getImageData(0, 0, 160, 160).data
        let sum = 0, max = 0, lit = 0
        for (let i = 0; i < d.length; i += 4) {
            const v = (d[i] + d[i + 1] + d[i + 2]) / 3
            sum += v; if (v > max) max = v; if (v > 12) lit++
        }
        return { mean: +(sum / (d.length / 4)).toFixed(2), max, litPct: +(100 * lit / (d.length / 4)).toFixed(1) }
    })
    await page.screenshot({ path: `${OUT}/${s.tag}.png` })
    console.log(`OK ${s.tag}  mean=${stats.mean} max=${stats.max} lit=${stats.litPct}%`)
}
await b.close()
console.log(errs.length ? `\n${errs.length} console/page errors (see above)` : '\nno console errors')
