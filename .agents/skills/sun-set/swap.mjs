// sun-set swap: put one beat of the sun set on the wall by hot-swap, never goto.
// Every fork bakes FADE_T* and phase anchors (BUD0.., FLX2, C_FLUX0, FLUX0, FLOW0, GAL_T8) against the
// bs_* clocks of the moment it was saved, so a straight swap hides its layers until bs_time catches up.
// rewrite() re-anchors them: a layer the wall already shows keeps the wall's anchor (no jump), a layer
// the wall lacks is anchored at now + 3 s, so it cross-fades in over its own 8–240 s.
//   node .claude/skills/sun-set/swap.mjs list
//   node .claude/skills/sun-set/swap.mjs <n|name|next> [--cold] [--no-knobs] [--auto-story] [--hold A,B]
// The dials are driven by controllers/sun-set.js (chained after black-sun); this only tells it the beat.
//   node .claude/skills/sun-set/swap.mjs dry <file.frag> --time T --bud B --flux F --flow W --gal G [--wall a.frag] [--hold A,B] [--cold] [--out b.frag]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BEATS } from '../../../controllers/sun-set.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..', '..')
const SHOW = join(ROOT, 'scripts', 'vj', 'show.js')
const LEAD = 3

// Pure. It is serialised into the page eval, so it closes over nothing.
// at: clock values the fresh anchors land on ({ time, bud, flux, flow, gal }), wall: the source on the wall.
const rewrite = (src, { at, wall = '', hold = [], cold = false }) => {
  const DEF = /^(#define[ \t]+)(\w+)([ \t]+)(-?\d+(?:\.\d+)?(?:e[-+]?\d+)?)/gm
  const FIXED = ['FADE_T2', 'GAL_T2']   // both enter the sky warp tW/sw directly: moving them jumps the sky
  const HELD = 1e6
  const clockOf = name =>
    /^FADE_T\d+$/.test(name) ? 'time'
      : /^BUD\d$/.test(name) ? 'bud'
      : /^(FLX\d|C_FLUX0|FLUX0)$/.test(name) ? 'flux'
      : name === 'FLOW0' ? 'flow'
      : name === 'GAL_T8' ? 'gal'
      : null
  const need = k => {
    if (!Number.isFinite(at[k])) throw new Error(`clock ${k} missing`)
    return at[k]
  }
  const defs = text => Object.fromEntries([...text.matchAll(DEF)].map(m => [m[2], +m[4]]))
  const mine = defs(src)
  const theirs = defs(wall)
  const live = (name, k) => name in theirs && theirs[name] < HELD && theirs[name] <= need(k) + 1e-6
  const decide = name => {
    if (hold.includes(name)) return [HELD, 'held']
    if (name === 'GAL_T8') {
      const [, why] = decide('FADE_T8')   // GAL_T8 is the galPh at FADE_T8's switch; it must move with it
      if (why === 'cold') return [mine.GAL_T2, 'cold']
      if (why === 'inherit' && live('GAL_T8', 'gal')) return [theirs.GAL_T8, 'inherit']
      return [Math.max(need('gal'), mine.GAL_T2), 'fresh']
    }
    const k = clockOf(name)
    if (cold) return [k === 'time' ? -1000 : 0, 'cold']
    if (live(name, k)) return [theirs[name], 'inherit']
    return [need(k), 'fresh']
  }
  const diff = []
  let out = src.replace(DEF, (m, pre, name, gap, value) => {
    if (FIXED.includes(name) || !clockOf(name)) return m
    const [v, why] = decide(name)
    diff.push({ anchor: name, from: +value, to: v, why })
    return pre + name + gap + v.toFixed(3)   // always a float literal: GLSL ES has no int → float
  })

  // RELOAD-REBAKE guard: without max() the warp jumps when FADE_T8 lands before FADE_T2 (sun/14 lacks it)
  const GUARD = '(FADE_T8 - FADE_T2) * .06'
  if (out.includes(GUARD)) {
    out = out.replaceAll(GUARD, 'max(FADE_T8 - FADE_T2, 0.0) * .06')
    diff.push({ anchor: 'tW guard', from: 'none', to: 'max()', why: 'patch' })
  }

  // The user, 2026-10-09: "I want 100% bright all the time." K10 is PAINT on the Twister; as FADE it blacks the wall.
  const DIM = /^(#define[ \t]+FADE[ \t]+)\(1\.0 - knob_10\)/m
  if (DIM.test(out)) {
    out = out.replace(DIM, (m, pre) => `${pre}1.0`)
    diff.push({ anchor: 'FADE', from: '1 - knob_10', to: '1.0', why: 'patch' })
  }

  // SUN-CAST ramp (sun/11–13): the cast arrives one star at a time from its anchor
  const CAST = /float tc = (?:bs_time < (\d+(?:\.\d+)?) \? bs_time : bs_time - \1|max\(bs_time - (-?\d+(?:\.\d+)?), 0\.0\));/
  const mc = out.match(CAST)
  const wc = wall.match(CAST)
  const castLive = wc && (wc[1] !== undefined || +wc[2] <= need('time') + 1e-6)
  if (mc && !cold) {
    const next = castLive ? wc[0] : `float tc = max(bs_time - ${need('time').toFixed(3)}, 0.0);`
    if (next !== mc[0]) diff.push({ anchor: 'CAST tc', from: +(mc[1] ?? mc[2]), to: +(castLive ? wc[1] ?? wc[2] : need('time')), why: castLive ? 'inherit' : 'fresh' })
    out = out.replace(CAST, next)
  }

  // JS ramps that sun/10–13 baked as constants; the night eased them in from the page over these seconds
  const RAMPS = { sky_return: 90, no_space: 20, lattice_mix: 180 }
  for (const [name, secs] of Object.entries(RAMPS)) {
    const own = out.match(new RegExp(`^const float ${name} = (\\d+(?:\\.\\d+)?);.*$`, 'm'))
    if (!own || cold) continue
    if (hold.includes(name)) {
      out = out.replace(own[0], `const float ${name} = 0.0;   // SUN-SET: held off until a later beat ramps it in`)
      diff.push({ anchor: name, from: +own[1], to: 0, why: 'held' })
      continue
    }
    // the wall's line carries over only if it already has this value, or is a ramp that has started
    const wl = wall.match(new RegExp(`^(?:const float ${name} = (\\d+(?:\\.\\d+)?);|#define ${name} \\(-?[\\d.]+ \\* smoothstep\\((-?[\\d.]+),).*$`, 'm'))
    const keep = wl && (wl[1] !== undefined ? +wl[1] === +own[1] : +wl[2] <= need('time') + 1e-6)
    const t = need('time').toFixed(3)
    const line = keep ? wl[0] : `#define ${name} (${own[1]} * smoothstep(${t}, ${t} + ${secs}.0, bs_time))   // SUN-SET: re-ramped at swap, as the page eased it in that night`
    diff.push({ anchor: name, from: +own[1], to: keep ? 'wall' : `0→${own[1]} over ${secs} s`, why: keep ? 'inherit' : 'fresh' })
    out = out.replace(own[0], line)
  }
  return { src: out, diff }
}

// Runs in the show page: sample the clocks twice, predict them at +lead, rewrite, validate, swap, set the beat, URL.
const page = async (src, opts, rewrite) => {
  const read = () => {
    const f = window.cranes.controllerFeatures ?? {}
    return { time: f.bs_time, bud: f.bs_budPh, flux: f.bs_fluxPh, flow: f.bs_flowPh, gal: f.bs_galPh }
  }
  const a = read()
  await new Promise(r => setTimeout(r, 400))
  const b = read()
  if (!(b.time > a.time)) return { ok: false, why: 'bs_time is not advancing: the controller is frozen or missing (playbook section 7)', a, b }
  const at = Object.fromEntries(Object.keys(b).map(k => [k, b[k] + opts.lead * (b[k] - a[k]) / (b.time - a.time)]))
  const wall = window.cranes.shader ?? ''
  const out = (() => {
    try { return rewrite(src, { at, wall, hold: opts.hold, cold: opts.cold }) } catch (e) { return { error: e.message } }
  })()
  if (out.error) return { ok: false, why: out.error }
  const bare = s => String(s).replace(/^[ \t]*\/\/.*$/gm, '')   // comment-only lines: sun/16 and 17 are sun/15 with new header comments
  const same = bare(out.src) === bare(wall)
  if (!same) {
    const v = window.__vjValidate(out.src)
    if (!v.ok) return { ok: false, why: 'compile', info: v.info, diff: out.diff }
    window.cranes.shader = out.src
  }
  // The dials are the sun-set controller's job: it eases them along the user's journey for this beat.
  // Pad/remote pins (messageParams) outrank everything, so drop any knob pins first.
  for (const k of Object.keys(window.cranes.messageParams ?? {})) if (k.startsWith('knob_')) delete window.cranes.messageParams[k]
  for (const [k, v] of Object.entries(opts.features)) window.cranes.updateFeature(k, v)
  const dials = window.__sunSetState ? (opts.features.sunset_beat ? 'sun-set controller easing' : 'left alone') : 'NOT DRIVEN: add &controller=sun-set after black-sun'
  if (opts.path) {
    const u = new URL(location.href)
    u.searchParams.set('shader', opts.path)
    history.replaceState({}, '', u)
  }
  window.__sunSet = { beat: opts.beat, at: b.time }
  return { ok: true, beat: opts.beat, swapped: !same, dials, bsTime: +b.time.toFixed(1), diff: out.diff.filter(d => d.why !== 'inherit') }
}

const PAGE = `async (src, opts) => (${page})(src, opts, ${rewrite})`

const args = process.argv.slice(2)
const flag = name => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? undefined : args[i + 1]
}
const has = name => args.includes(`--${name}`)
// beats.json: what goes on the wall; controllers/sun-set.js: how long each beat holds and the dial journey
const beats = JSON.parse(readFileSync(join(HERE, 'beats.json'), 'utf8')).map(b => ({ ...b, hold: BEATS.find(c => c.name === b.name).hold }))
const holdFlag = () => flag('hold')?.split(',') ?? []

const show = (...argv) => {
  const out = execFileSync('node', [SHOW, ...argv], { cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 1 << 24 })
  return JSON.parse(out.trim().split('\n').pop())
}

// Beat-scoped page features. Keys another beat sets are cleared (null) so nothing leaks forward.
const featuresFor = beat => {
  const all = Object.fromEntries(beats.flatMap(b => Object.keys(b.features ?? {})).map(k => [k, null]))
  return {
    ...all,
    ...beat.features,
    sunset_beat: has('no-knobs') ? 0 : beat.n,
    sunset_auto_story: has('auto-story') ? 1 : null,
  }
}

const pad = (s, n) => String(s).padEnd(n)
const fmt = v => typeof v === 'number' ? (Math.abs(v) >= 1e5 ? 'HELD' : v.toFixed(3)) : v
const printDiff = diff => {
  for (const d of diff) console.log(`  ${pad(d.anchor, 12)} ${pad(fmt(d.from), 12)} → ${pad(fmt(d.to), 22)} ${d.why}`)
  const counts = diff.reduce((c, d) => ({ ...c, [d.why]: (c[d.why] ?? 0) + 1 }), {})
  console.log(`  ${Object.entries(counts).map(([w, n]) => `${n} ${w}`).join(', ') || 'no anchors'}`)
}

const list = () => {
  for (const b of beats) console.log(`${pad(b.n, 3)} ${pad(b.name, 12)} ${pad(b.file, 46)} ${pad(b.cue ? `${b.hold}s` : 'end', 6)} ${b.cue ?? '-'}`)
}

const dry = () => {
  const file = args[1]
  const at = { time: +flag('time') + LEAD, bud: +flag('bud'), flux: +flag('flux'), flow: +flag('flow'), gal: +flag('gal') }
  const wall = flag('wall') ? readFileSync(flag('wall'), 'utf8') : ''
  const out = rewrite(readFileSync(file, 'utf8'), { at, wall, hold: holdFlag(), cold: has('cold') })
  console.log(`${file}  bs_time ${flag('time')} (+${LEAD} s lead)  wall ${flag('wall') ?? '(none)'}`)
  printDiff(out.diff)
  if (flag('out')) writeFileSync(flag('out'), out.src)
}

const current = () => show('eval', '() => window.__sunSet?.beat ?? 0')

const run = key => {
  const target = key === 'next' ? String(current() + 1) : key
  const beat = beats.find(b => String(b.n) === target || b.name === target)
  if (!beat) throw new Error(`no beat ${target}; run: swap.mjs list`)
  const src = readFileSync(join(ROOT, beat.file), 'utf8')
  const opts = {
    lead: LEAD,
    hold: [...(beat.holdAnchors ?? []), ...holdFlag()],
    cold: has('cold'),
    features: featuresFor(beat),
    path: beat.path,
    beat: beat.n,
  }
  const res = show('eval', PAGE, JSON.stringify([src, opts]))
  console.log(`beat ${beat.n} ${beat.name}: ${res.ok ? (res.swapped ? 'swapped' : 'same code, beat only') : `REFUSED: ${res.why}`}${res.bsTime ? ` at bs_time ${res.bsTime}` : ''}${res.dials ? `; dials: ${res.dials}` : ''}`)
  if (res.info) console.log(res.info)
  if (res.diff) printDiff(res.diff)
  if (!res.ok) process.exit(1)
  const dir = join(ROOT, '.claude', 'vj-shots')
  mkdirSync(dir, { recursive: true })
  console.log(show('shot', join(dir, `sun-set-${beat.n}.png`)))
}

const commands = { list, dry }
const [cmd] = args
if (!cmd) {
  console.error('usage: swap.mjs list | dry <file.frag> --time T ... | <n|name|next> [--cold] [--no-knobs] [--auto-story] [--hold A,B]')
  process.exit(2)
}
commands[cmd] ? commands[cmd]() : run(cmd)
