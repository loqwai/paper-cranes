// sun-set swap: put one beat of the sun set on the wall by hot-swap, never goto.
// Every fork bakes FADE_T* and phase anchors (BUD0.., FLX2, C_FLUX0, FLUX0, FLOW0, GAL_T8) against the
// bs_* clocks of the moment it was saved, so a straight swap hides its layers until bs_time catches up.
// rewrite() re-anchors them: a layer the wall already shows keeps the wall's anchor (no jump), a layer
// the wall lacks is anchored at now + 3 s, so it cross-fades in over its own 8–240 s.
//   node setlists/sun-set/swap.mjs list
//   node setlists/sun-set/swap.mjs <n|name|next> [--cold] [--no-knobs] [--auto-story] [--hold A,B]
// The dials are driven by controllers/sun-set.js (chained after black-sun); this only tells it the beat.
// It reaches the page only through the VJ MCP (one control plane): get_state for the clocks and the
// live source, write_shader + set_shader for the swap, set_params for the beat. The re-anchored code
// is written to shaders/<LIVE>.frag (gitignored), so later beats hot-swap by HMR with no reload.
// The current beat lives in .claude/setlist-state.json, shared with scripts/vj/board-bridge.js.
//   node setlists/sun-set/swap.mjs dry <file.frag> --time T --bud B --flux F --flow W --gal G [--wall a.frag] [--hold A,B] [--cold] [--out b.frag]
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BEATS } from '../../controllers/sun-set.js'
import { connectVj } from '../../scripts/vj/mcp-client.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const STATE = join(ROOT, '.claude', 'setlist-state.json')
const LIVE = 'claude/wip/black-sun/sun-set-live'
const LEAD = 3

// Pure.
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

const CLOCKS = { time: 'bs_time', bud: 'bs_budPh', flux: 'bs_fluxPh', flow: 'bs_flowPh', gal: 'bs_galPh' }
const clocksOf = st => Object.fromEntries(Object.entries(CLOCKS).map(([k, out]) => [k, st.controller?.[out]]))
const sleep = ms => new Promise(r => setTimeout(r, ms))
const until = async (test, ms) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(500)) {
    try { if (await test()) return true } catch { /* the page is busy compiling: ask again */ }
  }
  return false
}
const bare = s => String(s).replace(/^[ \t]*\/\/.*$/gm, '')   // comment-only lines: sun/16 and 17 are sun/15 with new header comments

// Sample the clocks twice, predict them at +lead, rewrite against the code on screen, swap, set the beat.
const put = async (vj, src, opts) => {
  const a = clocksOf(await vj.call('get_state', { features: 'none' }))
  await sleep(400)
  const st = await vj.call('get_state', { features: 'none', source: true })
  const b = clocksOf(st)
  if (!(b.time > a.time)) return { ok: false, why: 'bs_time is not advancing: the controller is frozen or missing (playbook section 7)' }
  const at = Object.fromEntries(Object.keys(b).map(k => [k, b[k] + opts.lead * (b[k] - a[k]) / (b.time - a.time)]))
  // get_state.source is the code on screen; a page from before that option falls back to the file.
  const wall = st.source ?? (st.shader ? (await vj.call('read_shader', { shader: st.shader })).code : '')
  let out
  try { out = rewrite(src, { at, wall, hold: opts.hold, cold: opts.cold }) } catch (e) { return { ok: false, why: e.message } }
  const same = bare(out.src) === bare(wall)
  let swap = null
  if (!same) {
    const w = await vj.call('write_shader', { shader: LIVE, code: out.src }).catch(e => ({ error: e.message }))
    if (w.error) return { ok: false, why: 'compile', info: w.error, diff: out.diff }
    // A big fork can stall the page for seconds while it compiles, so a tool call may time out
    // while the swap is still landing: judge by the page running the written source (its hash).
    const step = st.shader !== LIVE
      ? await vj.call('set_shader', { shader: LIVE }).then(r => (r.held ? 'held' : 'set_shader'), () => 'set_shader')
      : w.displays?.[0]?.held ? 'held' : 'hot-swap'
    if (step === 'held') swap = 'held (his hands are on the dials)'
    else {
      const landed = await until(async () => (await vj.call('get_state', { features: 'none' })).shaderHash === w.hash, 60000)
      if (!landed) return { ok: false, why: `${step}: the page did not run the new source within 60 s`, diff: out.diff }
      swap = step
    }
  }
  // The dials are the sun-set controller's job: it eases them along the user's journey for this beat.
  // Pins outrank everything, so release any knob pin in the same call that sets the beat.
  const unpin = Object.fromEntries(Object.keys(st.pinned ?? {}).filter(k => k.startsWith('knob_')).map(k => [k, null]))
  const p = await vj.call('set_params', { params: { ...unpin, ...opts.features } })
  const chain = st.controllers ?? []
  const dials = chain.includes('sun-set') ? (opts.features.sunset_beat ? 'sun-set controller easing' : 'left alone') : 'NOT DRIVEN: add &controller=sun-set after black-sun'
  return { ok: true, swapped: !same, swap, held: Boolean(p.held), dials, bsTime: +b.time.toFixed(1), diff: out.diff.filter(d => d.why !== 'inherit') }
}

const readState = () => {
  try { return JSON.parse(readFileSync(STATE, 'utf8')) } catch { return {} }
}

const args = process.argv.slice(2)
const flag = name => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? undefined : args[i + 1]
}
const has = name => args.includes(`--${name}`)
// ../sun-set.json beats: what goes on the wall; controllers/sun-set.js: how long each beat holds and the dial journey
const beats = JSON.parse(readFileSync(join(HERE, '..', 'sun-set.json'), 'utf8')).beats.map(b => ({ ...b, hold: BEATS.find(c => c.name === b.name).hold }))
const holdFlag = () => flag('hold')?.split(',') ?? []

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

const current = () => {
  const st = readState()
  return st.setlist === 'sun-set' ? st.n : 0
}

const run = async key => {
  const target = key === 'next' ? String(current() + 1) : key === 'prev' ? String(Math.max(1, current() - 1)) : key
  const beat = beats.find(b => String(b.n) === target || b.name === target)
  if (!beat) throw new Error(`no beat ${target}; run: swap.mjs list`)
  const src = readFileSync(join(ROOT, beat.file), 'utf8')
  const opts = {
    lead: LEAD,
    hold: [...(beat.holdAnchors ?? []), ...holdFlag()],
    cold: has('cold'),
    features: featuresFor(beat),
  }
  const vj = await connectVj({ name: 'sun-set-swap' })
  try {
    const res = await put(vj, src, opts)
    console.log(`beat ${beat.n} ${beat.name}: ${res.ok ? (res.swapped ? `swapped (${res.swap})` : 'same code, beat only') : `REFUSED: ${res.why}`}${res.bsTime ? ` at bs_time ${res.bsTime}` : ''}${res.dials ? `; dials: ${res.dials}` : ''}${res.held ? '; beat params held until his hands let go' : ''}`)
    if (res.info) console.log(res.info)
    if (res.diff) printDiff(res.diff)
    if (!res.ok) process.exit(1)
    writeFileSync(STATE, JSON.stringify({ setlist: 'sun-set', n: beat.n, name: beat.name, t: new Date().toISOString(), bsTime: res.bsTime }) + '\n')
    // A small picture for the record, saved for a person or the board; no model has to look at it.
    const shot = await vj.call('screenshot', { width: 480 })
    const dir = join(ROOT, '.claude', 'vj-shots')
    mkdirSync(dir, { recursive: true })
    const file = join(dir, `sun-set-${beat.n}.jpg`)
    if (shot.images?.[0]) writeFileSync(file, Buffer.from(shot.images[0].data, 'base64'))
    console.log(file)
  } finally {
    await vj.close()
  }
}

const commands = { list, dry }
if (!existsSync(join(ROOT, '.claude'))) mkdirSync(join(ROOT, '.claude'), { recursive: true })
const [cmd] = args
if (!cmd) {
  console.error('usage: swap.mjs list | dry <file.frag> --time T ... | <n|name|next> [--cold] [--no-knobs] [--auto-story] [--hold A,B]')
  process.exit(2)
}
commands[cmd] ? commands[cmd]() : await run(cmd)
