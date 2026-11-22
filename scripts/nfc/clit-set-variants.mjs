// Generate the clit-set NFC variants: 200 tags, clit-new/2 .. clit-new/201 (clit-new/1 is the hero link).
//
//   node scripts/nfc/clit-set-variants.mjs [--nudge-from <gate.json>]
//
// Writes shaders/clit-set/nfc-variants.json ([{n,name,title,shader,mood,knobs,voyage0,short,full}])
// and shaders/clit-set/nfc-variants.md. Deterministic: same inputs, same URLs.
//
// Recipe (see the taco and iris runs):
//   - Structure comes from the frag file (3 chromadepth, 4 nebula, 5 mandala), interleaved by weight
//     so tags written back to back alternate frags.
//   - Look comes from a named mood per frag plus golden-ratio jitter on the look knobs, clamped to the
//     safe bands (the lace turns to speckle past ~3x zoom, so ZOOM stays <= 0.4, and so on).
//   - voyage0 = frac(n * 0.618) * 6 starts each tag at its own place on the autopilot loop.
//   - No seeds in the URL: per-phone seeds keep varying palette phase, lace, rim/dust and stars (and
//     the petal count on 5), so one tag still looks different on two phones.
//   - knob_1/2/3 stay at 0 so the autopilot voyage runs.
//   - shaders/clit-set/nfc-nudges.json holds per-tag retry counts written after a render-gate failure;
//     each retry moves the tag's start place and thins the lace a little. Re-run the gate after.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const OUT_JSON = `${ROOT}/shaders/clit-set/nfc-variants.json`
const OUT_MD = `${ROOT}/shaders/clit-set/nfc-variants.md`
const NUDGES = `${ROOT}/shaders/clit-set/nfc-nudges.json`
const ORIGIN = 'https://visuals.beadfamous.com/'
const FIRST = 2, COUNT = 200
const PHI = 0.6180339887

const WAYPOINTS = ['home', 'ribbon cathedral', 'vortex eye', 'jellyfish tendrils', 'fern galaxy', 'rose carpet']

// Safe bands per knob (research note, plus k13 whose meaning is per frag but safe across 0..1)
const BANDS = {
  4: [0, 0.4], 5: [0, 1], 6: [0, 0.35], 7: [0, 0.4], 8: [0, 0.5],
  9: [0, 1], 10: [0, 0.7], 11: [0, 0.5], 12: [0.2, 0.6], 13: [0, 1], 14: [0, 0.7], 16: [0, 0.7],
}
// Jitter amplitude (±) per knob. k5 TURN and k9 HUE are stepped over their full range instead.
const JITTER = { 4: 0.1, 6: 0.08, 7: 0.1, 8: 0.12, 10: 0.15, 11: 0.12, 12: 0.1, 13: 0.2, 14: 0.15, 16: 0.15 }
const FULL_SPREAD = [5, 9]

const FRAGS = [
  {
    frag: 3, label: 'Chromadepth', weight: 60, color: 'clit-cd',
    moods: [
      { name: 'Deep Glasses', knobs: { 4: 0.15, 6: 0.1, 7: 0.1, 8: 0.1, 10: 0.5, 11: 0.2, 12: 0.35, 13: 0.4, 14: 0.3, 16: 0.35 } },
      { name: 'Ember Lace', knobs: { 6: 0.2, 8: 0.25, 10: 0.3, 11: 0.3, 12: 0.4, 13: 0.2, 14: 0.45, 16: 0.55 } },
      { name: 'Coral Reef', knobs: { 4: 0.28, 6: 0.28, 7: 0.25, 8: 0.35, 10: 0.6, 11: 0.15, 12: 0.3, 13: 0.6, 16: 0.4 } },
    ],
  },
  {
    frag: 4, label: 'Nebula', weight: 70, color: 'clit-neb',
    moods: [
      { name: 'Emission Gas', knobs: { 6: 0.1, 8: 0.15, 10: 0.65, 11: 0.25, 12: 0.35, 13: 0.3, 16: 0.3 } },
      { name: 'Filament Storm', knobs: { 6: 0.25, 8: 0.35, 10: 0.4, 11: 0.35, 12: 0.45, 13: 0.8, 16: 0.55 } },
      { name: 'Quiet Drift', knobs: { 4: 0.25, 7: 0.2, 10: 0.6, 11: 0.45, 12: 0.25, 13: 0.5, 16: 0.2 } },
    ],
  },
  {
    frag: 5, label: 'Mandala', weight: 70, color: 'clit-man',
    moods: [
      { name: 'Rose Window', knobs: { 4: 0.1, 10: 0.5, 12: 0.35, 13: 0.4, 16: 0.3 } },
      { name: 'Spinning Lotus', knobs: { 6: 0.15, 8: 0.3, 11: 0.3, 12: 0.4, 13: 0.7, 16: 0.45 } },
      { name: 'Jewel Box', knobs: { 4: 0.3, 6: 0.3, 7: 0.2, 10: 0.6, 12: 0.3, 13: 0.9, 16: 0.5 } },
    ],
  },
]

const frac = x => x - Math.floor(x)
const clamp = (x, [lo, hi]) => Math.min(hi, Math.max(lo, x))
const r3 = x => Math.round(x * 1000) / 1000

// Smooth weighted round-robin: frags interleave in proportion to weight, never in long runs
const schedule = (count) => {
  const total = FRAGS.reduce((s, f) => s + f.weight, 0)
  const cur = FRAGS.map(() => 0)
  const out = []
  for (let i = 0; i < count; i++) {
    FRAGS.forEach((f, j) => { cur[j] += f.weight })
    const j = cur.indexOf(Math.max(...cur))
    cur[j] -= total
    out.push(FRAGS[j])
  }
  return out
}

// A distinct irrational step per knob, so knobs do not move in lockstep across tags
const step = k => frac(PHI * (k + 1) * 1.37 + Math.SQRT2 * k)

const nudges = existsSync(NUDGES) ? JSON.parse(readFileSync(NUDGES, 'utf8')) : {}
// --nudge-from <gate.json>: every tag that failed the render gate gets one more retry
const gateIdx = process.argv.indexOf('--nudge-from')
if (gateIdx > 0) {
  const failed = JSON.parse(readFileSync(process.argv[gateIdx + 1], 'utf8')).filter(r => !r.pass).map(r => r.n)
  for (const n of failed) nudges[n] = (nudges[n] ?? 0) + 1
  writeFileSync(NUDGES, JSON.stringify(Object.fromEntries(Object.entries(nudges).sort((a, b) => a[0] - b[0]))) + '\n')
  console.log(`nudged ${failed.length}: ${failed.join(',')}`)
}

const build = () => {
  const order = schedule(COUNT)
  const perFrag = new Map()
  return order.map((F, i) => {
    const n = FIRST + i
    const idx = perFrag.get(F.frag) ?? 0
    perFrag.set(F.frag, idx + 1)
    const mood = F.moods[idx % F.moods.length]
    const tries = nudges[n] ?? 0

    const knobs = {}
    for (const k of Object.keys(BANDS).map(Number)) {
      const base = mood.knobs[k] ?? 0
      let v
      if (FULL_SPREAD.includes(k)) v = frac(base + n * step(k))
      else if (JITTER[k] && (base > 0 || k === 16 || k === 10)) v = base + (frac(n * step(k) + 0.5 * PHI) - 0.5) * 2 * JITTER[k]
      else v = base
      if (k === 16) v -= tries * 0.12                       // retry: thinner lace
      if (k === 4) v -= tries * 0.08                        // retry: less zoom
      v = r3(clamp(v, BANDS[k]))
      if (v > 0) knobs[k] = v
    }
    const voyage0 = r3(frac(n * PHI + tries * 0.37) * 6)
    const wp = WAYPOINTS[Math.floor(voyage0 % 6)]

    // Built by hand (not URLSearchParams) so the shader path keeps its literal slash
    const q = [`shader=clit-set/${F.frag}`, 'controller=clit-set', 'fft_size=2048', 'smoothing=0.3', `voyage0=${voyage0}`,
      ...Object.entries(knobs).map(([k, v]) => `knob_${k}=${v}`)].join('&')
    return {
      n,
      name: `clit-new-${n}`,
      title: `${F.label} · ${mood.name} · ${wp}`,
      shader: `clit-set/${F.frag}`,
      color: F.color,
      mood: mood.name,
      knobs,
      voyage0,
      short: `https://2cb.pw/clit-new/${n}`,
      full: `${ORIGIN}?${q}`,
    }
  })
}

const variants = build()
writeFileSync(OUT_JSON, JSON.stringify(variants, null, 1) + '\n')

const counts = Object.fromEntries(FRAGS.map(f => [f.label, variants.filter(v => v.shader === `clit-set/${f.frag}`).length]))
const md = [
  '# clit-set NFC variants',
  '',
  `Generated by \`node scripts/nfc/clit-set-variants.mjs\`. ${variants.length} tags, \`clit-new/${FIRST}\` to \`clit-new/${FIRST + COUNT - 1}\`.`,
  `\`clit-new/1\` is the hero link (clit-set/2) and is not part of this set.`,
  '',
  `Per frag: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}. Longest URL: ${Math.max(...variants.map(v => v.full.length))} chars.`,
  '',
  '| n | short | frag | title | voyage0 | open |',
  '|---|-------|------|-------|---------|------|',
  ...variants.map(v => `| ${v.n} | [clit-new/${v.n}](${v.short}) | ${v.shader} | ${v.title} | ${v.voyage0} | [full](${v.full}) |`),
  '',
].join('\n')
writeFileSync(OUT_MD, md)
console.log(JSON.stringify({ count: variants.length, counts, nudged: Object.keys(nudges).length, longest: Math.max(...variants.map(v => v.full.length)) }))
