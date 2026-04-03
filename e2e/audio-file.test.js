import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { swing, mean, stddev, maxConsecutiveDiff } from './helpers.js'

let server, port, browser, page

const STABILIZE_MS = 4000

beforeAll(async () => {
  server = await createServer({
    configFile: new URL('../vite.config.js', import.meta.url).pathname,
    server: { port: 0, host: '127.0.0.1', strictPort: false },
    logLevel: 'silent',
  })
  await server.listen()
  port = server.httpServer.address().port

  browser = await chromium.launch({
    channel: 'chrome',
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  page = await browser.newPage()
})

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

const baseUrl = () => `http://127.0.0.1:${port}`

const loadAtTime = async (audioTime) => {
  await page.goto(
    `${baseUrl()}/?shader=subtronics-eye2&image=images/subtronics.jpg&audio_file=test-audio/imaginary-friends.mp3&audioTime=${audioTime}`,
    { waitUntil: 'load' },
  )
  // Wait for audio processing pipeline to produce real features
  await page.evaluate((ms) => new Promise((resolve, reject) => {
    const deadline = Date.now() + ms
    const check = () => {
      const f = window.cranes?.flattenFeatures?.()
      if (f && typeof f.energyNormalized === 'number' && window.cranes?.audioBuffer) return resolve()
      if (Date.now() > deadline) return reject(new Error('Audio never started'))
      setTimeout(check, 200)
    }
    check()
  }), 15_000)
  await page.waitForTimeout(STABILIZE_MS)
}

const collectSamples = (count = 10, intervalMs = 100) =>
  page.evaluate(({ count, intervalMs }) => new Promise(resolve => {
    const samples = []
    let i = 0
    const interval = setInterval(() => {
      const f = window.cranes.flattenFeatures()
      samples.push({
        eN: +(f.energyNormalized?.toFixed(4) ?? 0),
        bN: +(f.bassNormalized?.toFixed(4) ?? 0),
        tN: +(f.trebleNormalized?.toFixed(4) ?? 0),
        mN: +(f.midsNormalized?.toFixed(4) ?? 0),
        fN: +(f.spectralFluxNormalized?.toFixed(4) ?? 0),
        eZ: +(f.energyZScore?.toFixed(4) ?? 0),
        bZ: +(f.bassZScore?.toFixed(4) ?? 0),
        r2: +(f.energyRSquared?.toFixed(4) ?? 0),
      })
      if (++i >= count) { clearInterval(interval); resolve(samples) }
    }, intervalMs)
  }), { count, intervalMs })

const captureFrameMAEs = (count = 5, intervalMs = 200) =>
  page.evaluate(({ count, intervalMs }) => new Promise(resolve => {
    const canvas = document.getElementById('visualizer')
    if (!canvas) return resolve({ maes: [], meanMAE: 0, maxMAE: 0 })
    const w = Math.min(canvas.width, 200)
    const h = Math.min(canvas.height, 150)
    const off = document.createElement('canvas')
    off.width = w; off.height = h
    const ctx = off.getContext('2d')
    const frames = []
    let i = 0
    const grab = () => {
      ctx.drawImage(canvas, 0, 0, w, h)
      frames.push(ctx.getImageData(0, 0, w, h).data)
      if (++i >= count) {
        const maes = []
        for (let j = 0; j < frames.length - 1; j++) {
          const a = frames[j], b = frames[j + 1]
          let total = 0
          for (let p = 0; p < a.length; p += 4) {
            total += Math.abs(a[p] - b[p]) + Math.abs(a[p+1] - b[p+1]) + Math.abs(a[p+2] - b[p+2])
          }
          maes.push(total / (w * h * 3))
        }
        resolve({
          maes,
          meanMAE: maes.reduce((a, b) => a + b, 0) / maes.length,
          maxMAE: Math.max(...maes),
        })
        return
      }
      setTimeout(grab, intervalMs)
    }
    grab()
  }), { count, intervalMs })


// ═══════════════════════════════════════════════════════════════════════════
//  SMOKE
// ═══════════════════════════════════════════════════════════════════════════

describe('smoke: audio file loads and plays', () => {
  beforeAll(() => loadAtTime(27))

  it('audioBuffer is present on window.cranes', async () => {
    const has = await page.evaluate(() => !!window.cranes?.audioBuffer)
    expect(has).toBe(true)
  })

  it('startSource function is available', async () => {
    const t = await page.evaluate(() => typeof window.cranes?.startSource)
    expect(t).toBe('function')
  })

  it('features are numeric', async () => {
    const t = await page.evaluate(() => typeof window.cranes.flattenFeatures().energyNormalized)
    expect(t).toBe('number')
  })
})


// ═══════════════════════════════════════════════════════════════════════════
//  QUIET INTRO (0–2s) — low energy, some movement OK (song starts quiet,
//  not fully silent, and the history buffer is still building)
// ═══════════════════════════════════════════════════════════════════════════

describe('quiet intro (0–2s)', () => {
  let samples, frameSim

  beforeAll(async () => {
    await loadAtTime(0)
    samples = await collectSamples()
    frameSim = await captureFrameMAEs()
  })

  describe('feature stability', () => {
    it('energyNormalized swing < 0.6', () => {
      expect(swing(samples, 'eN')).toBeLessThan(0.6)
    })

    it('bassNormalized swing < 0.6', () => {
      expect(swing(samples, 'bN')).toBeLessThan(0.6)
    })

    it('no NaN in any sample', () => {
      expect(samples.every(s => Object.values(s).every(v => !isNaN(v)))).toBe(true)
    })
  })

  describe('visual behavior', () => {
    it('frames are not wildly flickering (meanMAE < 100)', () => {
      expect(frameSim.meanMAE).toBeLessThan(100)
    })
  })
})


// ═══════════════════════════════════════════════════════════════════════════
//  FULL ENERGY (27–30s) — loud, reactive
// ═══════════════════════════════════════════════════════════════════════════

describe('full energy section (27–30s)', () => {
  let samples, frameSim

  beforeAll(async () => {
    await loadAtTime(27)
    samples = await collectSamples()
    frameSim = await captureFrameMAEs()
  })

  describe('feature reactivity', () => {
    it('energyNormalized mean > 0.1', () => {
      expect(mean(samples, 'eN')).toBeGreaterThan(0.1)
    })

    it('features are varying (energy swing > 0.05)', () => {
      expect(swing(samples, 'eN')).toBeGreaterThan(0.05)
    })

    it('no NaN in any sample', () => {
      expect(samples.every(s => Object.values(s).every(v => !isNaN(v)))).toBe(true)
    })
  })

  describe('visual behavior', () => {
    it('frames are changing (meanMAE > 0)', () => {
      expect(frameSim.meanMAE).toBeGreaterThan(0)
    })

    it('no extreme frame spikes (maxMAE < 120)', () => {
      expect(frameSim.maxMAE).toBeLessThan(120)
    })
  })
})


// ═══════════════════════════════════════════════════════════════════════════
//  DROP (76–78s) — smooth transition, no snapping
// ═══════════════════════════════════════════════════════════════════════════

describe('drop section (76–78s)', () => {
  let samples

  beforeAll(async () => {
    await loadAtTime(76)
    samples = await collectSamples(20, 100)
  })

  it('no NaN across 20 samples', () => {
    expect(samples.every(s => Object.values(s).every(v => !isNaN(v)))).toBe(true)
  })

  it('energy does not snap between extremes (max consecutive diff < 0.5)', () => {
    expect(maxConsecutiveDiff(samples, 'eN')).toBeLessThan(0.5)
  })

  it('bass does not snap between extremes', () => {
    expect(maxConsecutiveDiff(samples, 'bN')).toBeLessThan(0.5)
  })
})


// ═══════════════════════════════════════════════════════════════════════════
//  QUIET → LOUD (419–422s) — transition responsiveness
// ═══════════════════════════════════════════════════════════════════════════

describe('quiet→loud transition (419–422s)', () => {
  let earlyFeatures, lateFeatures

  beforeAll(async () => {
    await loadAtTime(419)
    earlyFeatures = await collectSamples(5, 100)
    await page.waitForTimeout(3000)
    lateFeatures = await collectSamples(5, 100)
  })

  it('no NaN in early samples', () => {
    expect(earlyFeatures.every(s => Object.values(s).every(v => !isNaN(v)))).toBe(true)
  })

  it('no NaN in late samples', () => {
    expect(lateFeatures.every(s => Object.values(s).every(v => !isNaN(v)))).toBe(true)
  })

  it('energy changes between early and late', () => {
    const earlyMean = mean(earlyFeatures, 'eN')
    const lateMean = mean(lateFeatures, 'eN')
    expect(Math.abs(lateMean - earlyMean)).toBeGreaterThan(0.01)
  })
})
