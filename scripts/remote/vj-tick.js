#!/usr/bin/env node
// vj-tick: one safe remote-VJ step against a live paper-cranes page, for agents that should follow
// rules instead of improvising. Skill: .claude/skills/remote-vj/SKILL.md. Rules: vj-rules.js.
//
//   node scripts/remote/vj-tick.js [--display ID]  observe only; prints one JSON verdict
//   node scripts/remote/vj-tick.js act nudge <knob> <value>
//   node scripts/remote/vj-tick.js act gain <value>
//   node scripts/remote/vj-tick.js act release-time
//   node scripts/remote/vj-tick.js act swap <known-good shader>
//   node scripts/remote/vj-tick.js act reload [--force]   refused unless the frame counter is frozen
//   node scripts/remote/vj-tick.js act undo               revert the last change
//   node scripts/remote/vj-tick.js act panic              known-good shader, time released, loop's knobs released
//   node scripts/remote/vj-tick.js log [n]               last n changes
//
//   node scripts/remote/vj-tick.js displays             list connected display ids
//   node scripts/remote/vj-tick.js request "<words>" [--from NAME]   save a chat line as request.json, then tick
//
// --display <id>: which display (one per person/screen). Default: the only connected display;
// refused when several are connected and none is named.
// PORT: --port, else $CRANES_PORT, else $PORT, else 6977 (the live show server).
// State per display: $VJ_STATE_DIR/<display>/, else <repo>/.claude/vj/<display>/:
//   log.jsonl            every change and every refused change, with before/after
//   tick-history.jsonl   one line per tick (sustained-flicker rule reads it)
//   shots/               the last 20 tick screenshots
//   request.json         optional chat hook: {"text": "...", "from": "...", "t": <ms>}. The next tick
//                        maps it onto the fixed menu, then renames it request.done.json.
//   config.json          optional per-display overrides of vj-config.js (same shape)

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renameSync } from 'node:fs'
import { createRemote, resolveDisplay } from './client.js'
import { defaultConfig, mergeConfig } from './vj-config.js'
import { checkAct, commandFor, decide, isFrozen, summarize } from './vj-rules.js'

const here = dirname(fileURLToPath(import.meta.url))
const SCRIPT = resolve(here, 'vj-tick.js')
const argv = process.argv.slice(2)
const flags = {}
const pos = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--force') flags.force = true
  else if (a.startsWith('--')) flags[a.slice(2)] = argv[++i]
  else pos.push(a)
}
const port = flags.port ?? process.env.CRANES_PORT ?? process.env.PORT ?? '6977'
const STATE_ROOT = resolve(process.env.VJ_STATE_DIR ?? join(here, '..', '..', '.claude', 'vj'))

const out = (v) => console.log(JSON.stringify(v, null, 1))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const readJsonl = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) : [])
const appendJsonl = (f, v) => appendFileSync(f, JSON.stringify(v) + '\n')
const trimJsonl = (f, keep) => { const rows = readJsonl(f); if (rows.length > keep * 2) writeFileSync(f, rows.slice(-keep).map((r) => JSON.stringify(r)).join('\n') + '\n') }

// Everything one display owns: its paths and its config. Nothing here is shared between displays.
const session = (display) => {
  const dir = join(STATE_ROOT, display.replace(/[^\w-]/g, '_'))
  const shots = join(dir, 'shots')
  mkdirSync(shots, { recursive: true })
  const cfgFile = join(dir, 'config.json')
  const cfg = existsSync(cfgFile) ? mergeConfig(defaultConfig(), JSON.parse(readFileSync(cfgFile, 'utf8'))) : defaultConfig()
  return { display, dir, shots, log: join(dir, 'log.jsonl'), history: join(dir, 'tick-history.jsonl'), request: join(dir, 'request.json'), cfg }
}

// Connect and pick the display. Returns { remote, S } or { error, displays? }.
const connect = async () => {
  let remote
  try {
    remote = await createRemote({ port, timeoutMs: Number(flags.timeout ?? 8000) })
  } catch (e) {
    return { error: `${e.message} (dev server down?)` }
  }
  const connected = await remote.listDisplays()
  const pick = resolveDisplay(flags.display, connected)
  if (pick.error) { remote.close(); return { error: pick.error, displays: connected } }
  remote.display = pick.display
  return { remote, S: session(pick.display) }
}

// Everything the rules read, plus a screenshot. Never changes the page.
const observe = async (remote, S, { shot = true } = {}) => {
  const obs = { connected: false, history: readJsonl(S.history).slice(-10) }
  try {
    obs.status = (await remote.request('status')).result
    obs.connected = true
    obs.features = (await remote.request('features', { meter: 30 })).result
    if (shot) {
      const { result } = await remote.request('shot', { width: 480, quality: 0.7 })
      obs.shot = join(S.shots, `tick-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`)
      writeFileSync(obs.shot, Buffer.from(result.dataUrl.split(',')[1], 'base64'))
      const old = readdirSync(S.shots).filter((f) => f.startsWith('tick-')).sort().slice(0, -20)
      for (const f of old) unlinkSync(join(S.shots, f))
    }
    await sleep(1000)
    obs.statusEnd = (await remote.request('status')).result
  } catch (e) {
    obs.error = e.message
    if (!obs.status) obs.connected = false
  }
  return obs
}

const compact = (obs) => {
  const s = summarize(obs)
  const st = obs.status ?? {}
  const m = s.meter
  return {
    status: {
      connected: obs.connected, shader: st.shader ?? null, controllers: st.controllers ?? [], fps: st.fps ?? null,
      frameCount: st.frameCount ?? null, frozen: isFrozen(st, obs.statusEnd), visibility: st.visibility ?? null,
      audio: st.audio ? { state: st.audio.state, running: st.audio.running, energy: st.audio.energy, gain: st.audio.gain } : null,
      shaderError: st.shaderError ?? null, meterInstalled: st.vjMeter ?? false,
    },
    features: {
      energy: s.energy, energyZScore: s.energyZ, bassZScore: s.bassZ, cs_presence: s.presence, cs_kick: s.kick, cs_punch: s.punch, cs_drop: s.drop,
      knobsSet: Object.fromEntries(Object.entries(s.knobs).filter(([, v]) => v)),
    },
    meter: m && { flicker: m.flicker, clip: m.clip, motion: m.motion, lum: m.lum, lumMax: m.lumMax, motionVsEnergy: m.motionVsEnergy, secs: m.secs },
  }
}

const NEXT = {
  none: 'Do nothing. Run the next tick in about 60 s.',
  nudge: 'Run the `run` command exactly, then tell Aaron in one line what changed and why (use `reason`).',
  gain: 'Run the `run` command exactly, then tell Aaron in one line that you changed the input gain.',
  release_time: 'Run the `run` command exactly. A held time param was freezing the motion.',
  swap: 'Run the `run` command exactly, then tell Aaron in one line which shader you swapped to and why.',
  reload: 'Run the `run` command exactly. The picture is frozen. Afterwards run a tick and check audio.running is true.',
  tell_aaron: 'Do not change anything. Send Aaron the `say` line once (not again every tick while it persists).',
}

const readRequest = (S) => {
  if (!existsSync(S.request)) return null
  try {
    const r = JSON.parse(readFileSync(S.request, 'utf8'))
    return typeof r?.text === 'string' && r.text.trim() ? r : null
  } catch { return null }
}

const tick = async () => {
  const c0 = await connect()
  if (c0.error) {
    const v = decide({ connected: false, error: c0.error }, defaultConfig())
    const many = (c0.displays?.length ?? 0) > 1
    return out({
      t: new Date().toISOString(), port, display: null, displays: c0.displays ?? [],
      verdict: { action: many ? 'none' : v.action, rule: many ? 'pick-display' : v.rule, reason: c0.error, args: many ? {} : v.args },
      run: null, blocked: null, say: many ? null : v.args.message,
      next: many ? 'Several displays are connected. Re-run with --display <id> for the display you were assigned.' : NEXT.tell_aaron,
      error: c0.error,
    })
  }
  const { remote, S } = c0
  const obs = await observe(remote, S)
  remote.close()
  obs.request = readRequest(S)
  const v = decide(obs, S.cfg)
  const c = compact(obs)
  const target = `--display ${S.display}`
  let run = commandFor(v, { script: `${SCRIPT} ${target}`, port })
  let blocked = null
  if (run) {
    const g = checkAct({ action: v.action, args: v.args }, { now: Date.now(), log: readJsonl(S.log), obs, cfg: S.cfg })
    if (!g.ok) { blocked = g.why; run = null }
  }
  // A request is consumed once a tick has answered it (applied, refused, or not understood).
  if (obs.request && v.request) renameSync(S.request, join(S.dir, 'request.done.json'))
  appendJsonl(S.history, { t: Date.now(), rule: v.rule, action: v.action, flicker: c.meter?.flicker ?? null, motion: c.meter?.motion ?? null, energy: c.features.energy })
  trimJsonl(S.history, 100)
  out({
    t: new Date().toISOString(),
    port,
    display: S.display,
    ...c,
    shot: obs.shot ?? null,
    request: v.request ?? null,
    verdict: { action: v.action, rule: v.rule, reason: v.reason, args: v.args },
    run,
    blocked,
    say: v.action === 'tell_aaron' ? v.args.message : v.request ? requestReply(v, blocked) : null,
    next: blocked ? `Do not run anything: ${blocked}. ${v.request ? 'Send the person the `say` line. ' : ''}Run the next tick in about 60 s.` : NEXT[v.action],
    error: obs.error ?? null,
  })
}

const requestReply = (v, blocked) => {
  if (blocked) return `Not right now (${blocked}).`
  if (v.action === 'none') return `Can't do that: ${v.reason.replace(/^request "[^"]*":\s*/, '')}.`
  if (v.action === 'swap') return `Switching the visual to ${v.args.shader}.`
  return `On it: ${v.rule.replace('request-', '')}.`
}

// ---------------------------------------------------------------------------------------------
const knobOf = (obs, k) => obs.features?.knobs?.[k] ?? null
const evalGain = (v) => `() => { const g = window.cranes.inputGain; if (!g) throw new Error('no inputGain node'); g.gain.value = ${Number(v)}; return g.gain.value }`

const swapTo = async (remote, shader, controller, st) => {
  const done = { shader: (await remote.request('shader', { path: shader })).result }
  if (controller && !(st.controllers ?? []).includes(controller)) done.controller = (await remote.request('controller', { names: [controller] })).result
  return done
}

const apply = async (remote, S, action, args, obs) => {
  const st = obs.status
  switch (action) {
    case 'nudge':
      return { before: { value: knobOf(obs, args.knob) ?? 0, raw: knobOf(obs, args.knob) }, result: (await remote.request('set', { params: { [args.knob]: args.value } })).result }
    case 'gain':
      return { before: { value: st.audio?.gain ?? null }, result: (await remote.request('eval', { src: evalGain(args.value) })).result }
    case 'release_time':
      return { before: { time: st.manual?.time ?? null }, result: (await remote.request('time', { seconds: null })).result }
    case 'swap': {
      const target = S.cfg.knownGood.find((k) => k.shader === args.shader)
      return { before: { shader: st.shader, controllers: st.controllers }, result: await swapTo(remote, target.shader, target.controller, st) }
    }
    case 'reload':
      return { before: { frameCount: st.frameCount, href: st.href }, result: (await remote.request('reload')).result }
    case 'panic': {
      const kg = S.cfg.knownGood[0]
      const touched = [...new Set(readJsonl(S.log).filter((e) => e.ok && e.action === 'nudge').map((e) => e.args.knob))]
      const result = { swap: await swapTo(remote, kg.shader, kg.controller, st), time: (await remote.request('time', { seconds: null })).result }
      if (touched.length) result.released = (await remote.request('set', { params: Object.fromEntries(touched.map((k) => [k, null])) })).result
      return { before: { shader: st.shader, controllers: st.controllers, knobs: obs.features?.knobs }, result }
    }
    case 'undo': {
      const last = readJsonl(S.log).filter((e) => e.ok && ['nudge', 'gain', 'swap'].includes(e.action)).at(-1)
      if (!last) throw new Error('nothing to undo')
      if (last.undone) throw new Error('the last change was already undone')
      let result
      if (last.action === 'nudge') result = (await remote.request('set', { params: { [last.args.knob]: last.before.raw ?? null } })).result
      if (last.action === 'gain') result = (await remote.request('eval', { src: evalGain(last.before.value ?? 1) })).result
      if (last.action === 'swap') result = await swapTo(remote, last.before.shader, last.before.controllers?.[0], st)
      return { before: { undoing: last.t, action: last.action }, result }
    }
  }
}

const act = async ([name, ...rest]) => {
  const action = name === 'release-time' ? 'release_time' : name
  const args = {}
  if (action === 'nudge') Object.assign(args, { knob: rest[0], value: Number(rest[1]) })
  if (action === 'gain') args.value = Number(rest[0])
  if (action === 'swap') args.shader = rest[0]?.replace(/\.frag$/, '').replace(/^shaders\//, '')
  const c0 = await connect()
  if (c0.error) { out({ ok: false, refused: c0.error, displays: c0.displays ?? [] }); process.exit(2) }
  const { remote, S } = c0
  const obs = await observe(remote, S, { shot: false })
  const entry = { t: Date.now(), display: S.display, action, args, force: Boolean(flags.force) }
  const g = checkAct({ action, args, force: flags.force }, { now: entry.t, log: readJsonl(S.log), obs, cfg: S.cfg })
  if (!g.ok) {
    appendJsonl(S.log, { ...entry, ok: false, why: g.why })
    out({ ok: false, action, refused: g.why })
    remote.close()
    process.exit(2)
  }
  try {
    const { before, result } = await apply(remote, S, action, args, obs)
    let after = result
    if (action !== 'reload') {
      await sleep(500)
      const st = (await remote.request('status')).result
      after = { result, shader: st.shader, controllers: st.controllers, gain: st.audio?.gain, manual: st.manual, shaderError: st.shaderError ?? null }
    }
    appendJsonl(S.log, { ...entry, ok: true, before, after })
    if (action === 'undo') {
      const rows = readJsonl(S.log)
      const target = rows.findLast((e) => e.t === before.undoing)
      if (target) { target.undone = true; writeFileSync(S.log, rows.map((r) => JSON.stringify(r)).join('\n') + '\n') }
    }
    out({ ok: true, action, args, before, after })
  } catch (e) {
    appendJsonl(S.log, { ...entry, ok: false, why: e.message })
    out({ ok: false, action, error: e.message })
    process.exitCode = 1
  }
  remote.close()
}

const main = async () => {
  const [cmd = 'tick', ...rest] = pos
  if (cmd === 'tick') return tick()
  if (cmd === 'request') {
    const text = rest.join(' ').trim()
    if (!text) { console.error('usage: vj-tick.js request "<their words>" [--from NAME] [--display ID]'); process.exit(1) }
    const c0 = await connect()
    c0.remote?.close()
    if (c0.error) return out({ ok: false, error: c0.error, displays: c0.displays ?? [] })
    writeFileSync(c0.S.request, JSON.stringify({ text, from: flags.from ?? null, t: Date.now() }) + '\n')
    return tick()
  }
  if (cmd === 'act') return act(rest)
  if (cmd === 'displays') {
    const remote = await createRemote({ port }).catch((e) => ({ error: e.message }))
    if (remote.error) return out({ displays: [], error: remote.error })
    const displays = await remote.listDisplays()
    remote.close()
    return out({ displays })
  }
  if (cmd === 'log') {
    const c0 = await connect()
    const display = c0.S?.display ?? flags.display
    c0.remote?.close()
    if (!display) return out({ error: c0.error })
    return readJsonl(session(display).log).slice(-Number(rest[0] ?? 10)).forEach((e) => console.log(JSON.stringify(e)))
  }
  console.error('usage: vj-tick.js [tick] | act <nudge|gain|release-time|swap|reload|undo|panic> ... | log [n] | displays   (all take --display <id>)')
  process.exit(1)
}

main().then(() => setTimeout(() => process.exit(process.exitCode ?? 0), 50)).catch((e) => { out({ ok: false, error: e.message }); process.exit(1) })
