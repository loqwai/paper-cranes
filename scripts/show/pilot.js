#!/usr/bin/env node
// Fly the clit-set wall from the music, through the same knob channel the Twister writes.
//   node scripts/show/pilot.js [--minutes 15] [--seed N]      (or: npm run pilot -- --minutes 15)
// Stop with Ctrl-C or `kill <pid>`: the knobs stay where they are and are printed, so the dials
// carry on from there. The decisions live in pilot-brain.js; this file is only the CDP loop.
import { chromium } from 'playwright'
import { init, step, meter, takeNotes, setCoaster, FEATURES, NAMES } from '../../controllers/pilot-brain.js'

const CDP_URL = `http://127.0.0.1:${process.env.SHOW_CDP_PORT || '9333'}`
const HZ = 15
const LOG_SECS = 10
const USAGE = 'usage: pilot.js [--minutes N] [--seed N]'

const parseArgs = argv => {
  const opts = { minutes: 15, seed: Date.now() % 100000 }
  for (let i = 0; i < argv.length; i += 2) {
    const value = Number(argv[i + 1])
    if (!['--minutes', '--seed'].includes(argv[i]) || !(value > 0)) {
      console.error(USAGE)
      process.exit(2)
    }
    opts[argv[i].slice(2)] = value
  }
  return opts
}

// One round trip per tick: apply last tick's writes, then read features, live knobs and (every
// LOG_SECS) the meter. Writes go to manualFeatures, the Twister's channel; messageParams outrank
// it, so a knob pinned there reads back unchanged and the brain yields it like a hand.
const TICK = ({ writes, features, wantMeter }) => {
  for (const [n, v] of Object.entries(writes)) window.cranes.manualFeatures['knob_' + n] = v
  const all = window.cranes.flattenFeatures()
  const f = {}
  const missing = []
  for (const k of features) {
    if (typeof all[k] !== 'number' || Number.isNaN(all[k])) missing.push(k)
    f[k] = all[k]
  }
  const live = {}
  for (let n = 1; n <= 16; n++) live[n] = +(all['knob_' + n] ?? 0)
  const pinned = Object.keys(window.cranes.messageParams || {}).filter(k => k.startsWith('knob_'))
  const m = wantMeter ? window.__vjMeter?.summary(10) : null
  return { f, live, missing, pinned, coaster: all.coaster > 0.5, meter: m ? { flicker: m.flicker, lumMin: m.lumMin, lum: m.lum } : null, jankMed: wantMeter ? window.__vjJank?.summary?.()?.med ?? null : null, href: location.href }
}

const connect = async () => {
  const browser = await chromium.connectOverCDP(CDP_URL)
  const pages = browser.contexts()[0].pages()
  if (pages.length !== 1) throw new Error(`show browser must have exactly one page, has ${pages.length}`)
  return { browser, page: pages[0] }
}

const fmt = (live, ns) => ns.map(n => `${NAMES[n]}${live[n].toFixed(2)}`).join(' ')

const main = async () => {
  const { minutes, seed } = parseArgs(process.argv.slice(2))
  const { browser, page } = await connect()
  let first = await page.evaluate(TICK, { writes: {}, features: FEATURES, wantMeter: true })
  if (first.missing.length) throw new Error(`page lacks ${first.missing.join(', ')}: needs ?controller=clit-set&wavelet=true on the clit-set shader (${first.href})`)
  if (!first.meter) throw new Error(`no window.__vjMeter: the show URL needs ?vj=1 (${first.href})`)
  const s = init(first.live, seed, first.f, { coaster: first.coaster })
  console.log(`pilot: seed ${seed}, ${minutes} min, ${s.coaster ? 'coaster (k4 throttle, k1/k2 steer)' : 'position'} mode, voyage ${s.voyage}${first.pinned.length ? `, pinned by remote: ${first.pinned.join(' ')}` : ''}`)
  console.log(`start knobs: ${fmt(first.live, [1, 2, 3, 4, 5, 6, 7, 8])} | ${fmt(first.live, [9, 10, 11, 12, 13, 14, 15, 16])}`)

  let stopping = false
  const stop = reason => {
    if (stopping) return
    stopping = true
    console.log(`pilot: stopping (${reason})`)
  }
  process.on('SIGINT', () => stop('SIGINT'))
  process.on('SIGTERM', () => stop('SIGTERM'))

  const t0 = Date.now()
  let last = t0
  let lastLog = t0
  let writes = {}
  let live = first.live
  let retryMs = 0
  const resync = async (why) => {
    // The show page reloaded (a hot reload or an input swap): wait for it, then resync from whatever it
    // now shows rather than reading the change as a hand on every dial.
    retryMs = Math.min(8000, retryMs ? retryMs * 2 : 500)
    console.log(`pilot: ${why}, retrying in ${retryMs} ms`)
    await new Promise(res => setTimeout(res, retryMs))
    for (const k of Object.values(s.knobs)) k.written = null
    writes = {}
  }
  while (!stopping) {
    const now = Date.now()
    if (now - t0 > minutes * 60000) {
      stop(`${minutes} min up`)
      break
    }
    const wantMeter = now - lastLog > LOG_SECS * 1000
    let r
    try {
      r = await page.evaluate(TICK, { writes, features: FEATURES, wantMeter })
    } catch (err) {
      await resync(`page eval failed (${err.message.split('\n')[0]})`)
      continue
    }
    if (r.missing.length) {
      await resync(`page lost ${r.missing.join(', ')} (${r.href})`)
      continue
    }
    retryMs = 0
    setCoaster(s, r.coaster)
    live = r.live
    const dt = Math.min(0.5, (now - last) / 1000)
    last = now
    writes = step(s, r.f, live, dt).writes
    for (const n of takeNotes(s)) console.log(`  ${n}`)
    if (wantMeter) {
      lastLog = now
      meter(s, { flicker: r.meter.flicker, lumMin: r.meter.lumMin, jankMed: r.jankMed ?? 0 })
      for (const n of takeNotes(s)) console.log(`  ${n}`)
      const f = r.f
      const mood = s.ev.breakdown ? 'breakdown' : f.cs_build > 0.3 ? `building ${f.cs_build.toFixed(2)}` : f.cs_drop > 0.3 ? 'drop' : 'cruise'
      console.log(`${s.t.toFixed(0)}s ${mood} E${f.energy.toFixed(3)} z${f.energyZScore.toFixed(2)} | ${fmt(live, [1, 2, 3, 4, 5, 6, 7, 8])} | ${fmt(live, [9, 10, 11, 12, 13, 14, 15, 16])} | flicker ${r.meter.flicker} lumMin ${r.meter.lumMin} frame ${r.jankMed ?? '?'}ms`)
    }
    const wait = 1000 / HZ - (Date.now() - now)
    if (wait > 0) await new Promise(res => setTimeout(res, wait))
  }
  if (Object.keys(writes).length) await page.evaluate(TICK, { writes, features: FEATURES, wantMeter: false })
  console.log(`end knobs (left in place): ${fmt(live, [1, 2, 3, 4, 5, 6, 7, 8])} | ${fmt(live, [9, 10, 11, 12, 13, 14, 15, 16])}`)
  await browser.close()
}

main().catch(err => {
  console.error(`pilot: ${err.message}`)
  process.exit(1)
})
