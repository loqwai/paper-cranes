#!/usr/bin/env node
// cranes-remote: inspect and change a paper-cranes page running on another device (e.g. a phone
// on the cranes-local tunnel) through the dev server's /ws. See docs/remote-inspect.md.
//
//   node scripts/remote/cranes-remote.js [--port N] [--display ID] [--timeout MS] <cmd> [args]
//
//   ping | status | logs [n]
//   features [--all] [--keys 'bass*,cs_*'] [--meter SECS]
//   shot [out.jpg] [--width 480] [--quality 0.7]
//   set <key> <value> [<key> <value> ...]       value "null" releases the key
//   time <seconds|off>                           freeze/unfreeze time + iTime
//   shader <path>                                e.g. clit-set/2 (hot swap, no reload)
//   code <file.frag>                             hot swap raw GLSL from a local file
//   controller [name ...]                        replace the controller chain (none = clear)
//   navigate '<url or ?query>' [--reload]        in place when only shader/controller/knobs change
//   reload                                       full page reload (loses fullscreen, see docs)
//   eval '<js expression or fn>'                 dev server only, signed
//   watch features [1s] [--keys ...]             stream samples (one JSON line each)
//   watch midi                                   stream MIDI events from the display
//   token [show|rotate]
//
// PORT: --port, else $CRANES_PORT, else $PORT, else 6969. The live show server is usually 6977.

import { writeFileSync, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { signPayload } from '../../src/remote/inspectAuth.js'
import { readInspectToken, writeInspectToken, TOKEN_FILE } from './token.js'

const argv = process.argv.slice(2)
const flags = {}
const pos = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--all' || a === '--reload' || a === '--json') flags[a.slice(2)] = true
  else if (a.startsWith('--')) flags[a.slice(2)] = argv[++i]
  else pos.push(a)
}
const port = flags.port ?? process.env.CRANES_PORT ?? process.env.PORT ?? '6969'
const wsUrl = flags.url ?? `ws://127.0.0.1:${port}/ws`
const timeoutMs = Number(flags.timeout ?? 10_000)
const die = (msg) => { console.error(msg); process.exit(1) }

const connect = () => new Promise((resolve, reject) => {
  const ws = new WebSocket(wsUrl)
  ws.addEventListener('open', () => resolve(ws), { once: true })
  ws.addEventListener('error', () => reject(new Error(`cannot connect to ${wsUrl}`)), { once: true })
})

const onMessage = (ws, fn) => ws.addEventListener('message', (ev) => {
  let m
  try { m = JSON.parse(ev.data) } catch { return }
  fn(m)
})

let clockOffset = 0 // display clock minus ours, learned from a `stale` reply

// Send one signed request and resolve with the first reply (or the one from --display).
const request = async (ws, cmd, args = {}, { retried = false } = {}) => {
  const token = readInspectToken()
  const id = randomUUID()
  const payload = JSON.stringify({ id, ts: Date.now() + clockOffset, cmd, args })
  const sig = await signPayload(token, payload)
  const reply = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no reply to ${cmd} within ${timeoutMs} ms (is a display connected on port ${port}?)`)), timeoutMs)
    onMessage(ws, (m) => {
      if (m.type !== 'inspect-reply' || m.data?.id !== id) return
      if (flags.display && m.data.display !== flags.display) return
      clearTimeout(timer)
      resolve(m.data)
    })
    ws.send(JSON.stringify({ type: 'inspect', data: { payload, sig } }))
  })
  if (!reply.ok && reply.error === 'stale' && !retried && reply.now) {
    clockOffset = reply.now - Date.now()
    console.error(`[cranes-remote] clock skew ${clockOffset} ms vs display; retrying`)
    return request(ws, cmd, args, { retried: true })
  }
  if (!reply.ok) throw new Error(`display ${reply.display}: ${reply.error}`)
  return reply
}

const print = (v) => console.log(JSON.stringify(v, null, flags.json ? 0 : 2))
const parseValue = (v) => (v === 'null' ? null : Number.isNaN(Number(v)) ? v : Number(v))
const intervalMs = (s = '1s') => {
  const m = /^(\d+(?:\.\d+)?)(ms|s)?$/.exec(s)
  if (!m) die(`bad interval ${s}`)
  return Number(m[1]) * (m[2] === 'ms' ? 1 : 1000)
}
const featureArgs = () => ({
  all: flags.all,
  keys: flags.keys?.split(',').map((s) => s.trim()).filter(Boolean),
  meter: flags.meter ? Number(flags.meter) : undefined,
})

const run = async (ws, cmd, rest) => {
  switch (cmd) {
    case 'ping':
    case 'status':
      return print((await request(ws, cmd)).result)
    case 'logs':
      for (const l of (await request(ws, 'logs', { n: Number(rest[0] ?? 50) })).result)
        console.log(`${new Date(l.t).toISOString().slice(11, 23)} ${l.level.padEnd(5)} ${l.msg}`)
      return
    case 'features':
      return print((await request(ws, 'features', featureArgs())).result)
    case 'shot': {
      const file = rest[0] ?? 'cranes-shot.jpg'
      const { result, display } = await request(ws, 'shot', { width: Number(flags.width ?? 480), quality: Number(flags.quality ?? 0.7) })
      const buf = Buffer.from(result.dataUrl.split(',')[1], 'base64')
      writeFileSync(file, buf)
      return print({ file, bytes: buf.length, w: result.w, h: result.h, canvas: `${result.srcW}x${result.srcH}`, display })
    }
    case 'set': {
      if (!rest.length || rest.length % 2) die('usage: set <key> <value> [<key> <value> ...]')
      const kv = {}
      for (let i = 0; i < rest.length; i += 2) kv[rest[i]] = parseValue(rest[i + 1])
      return print((await request(ws, 'set', { params: kv })).result)
    }
    case 'time':
      if (!rest[0]) die('usage: time <seconds|off>')
      return print((await request(ws, 'time', { seconds: rest[0] === 'off' ? null : Number(rest[0]) })).result)
    case 'shader':
      if (!rest[0]) die('usage: shader <path>')
      return print((await request(ws, 'shader', { path: rest[0].replace(/\.frag$/, '').replace(/^shaders\//, '') })).result)
    case 'code':
      if (!rest[0]) die('usage: code <file.frag>')
      return print((await request(ws, 'code', { code: readFileSync(rest[0], 'utf8') })).result)
    case 'controller':
      return print((await request(ws, 'controller', { names: rest })).result)
    case 'navigate':
      if (!rest[0]) die('usage: navigate <url or ?query>')
      return print((await request(ws, 'navigate', { url: rest[0], reload: flags.reload })).result)
    case 'reload':
      return print((await request(ws, 'reload')).result)
    case 'eval':
      if (!rest[0]) die("usage: eval '<js>'")
      return print((await request(ws, 'eval', { src: rest[0] })).result)
    case 'watch':
      return watch(ws, rest)
    default:
      die(`unknown command ${cmd}; see the header of scripts/remote/cranes-remote.js`)
  }
}

const watch = async (ws, [what, every]) => {
  if (what === 'midi') {
    console.error('[cranes-remote] streaming MIDI (ctrl-c to stop)')
    onMessage(ws, (m) => {
      if (m.type === 'midi-event') console.log(JSON.stringify(m.data))
      if (m.type === 'inspect-hello') console.error(`[cranes-remote] display ${m.data.display} connected`)
    })
    return new Promise(() => {})
  }
  if (what !== 'features') die('usage: watch features [1s] | watch midi')
  const ms = intervalMs(every)
  for (;;) {
    const t0 = Date.now()
    try {
      const { result } = await request(ws, 'features', featureArgs())
      console.log(JSON.stringify(result))
    } catch (e) {
      console.error(`[cranes-remote] ${e.message}`)
    }
    await new Promise((r) => setTimeout(r, Math.max(0, ms - (Date.now() - t0))))
  }
}

const main = async () => {
  const [cmd, ...rest] = pos
  if (!cmd) die('usage: cranes-remote <cmd> [args]; see the header of scripts/remote/cranes-remote.js')
  if (cmd === 'token') {
    if (rest[0] === 'rotate') return console.log(`${TOKEN_FILE}: rotated (reload-free; the page re-fetches on its next HMR swap or reload)`, writeInspectToken() && '')
    return console.log(`${TOKEN_FILE}\n${readInspectToken()}`)
  }
  const ws = await connect()
  await run(ws, cmd, rest)
  ws.close()
}

main().catch((e) => die(`[cranes-remote] ${e.message}`))
