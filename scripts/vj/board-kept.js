// board-kept — every KEEP (vjpad, MIDI pad, spacebar, the board's ctl-keep) lands on the show board's
// `kept` frame with no model in the path. board-bridge.js runs it when given --kept-link.
//
// On each page `keep` signal: a screenshot over the VJ MCP saved to .claude/vj-shots/, the shader
// file copied to .claude/keeps/ when it is one that keeps changing (a -wip or a partner's -p<N>), and
// one card in the frame: time, shader, the knobs that differ from 0, the picture's file name.
//
// The picture itself stays on disk for now: a draw link takes ops only, and an image element needs
// a file that only the draw MCP's `image` tool can upload (draw feedback 0cb3f01d, 2026-11-24). When
// draw lets a link upload bytes, put the image here and the card gets its picture.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Under the bridge's 30 s MCP call timeout: a longer wait is cut off client-side before it returns a
// seq, so `since` never advances, a KEEP in the retry gap is lost, and every quiet half-minute logs an error.
export const WAIT_S = 25

const r2 = (v) => Math.round(v * 100) / 100

// Pure: the card's text: time and shader, then the knobs that are not 0.
export const keptLabel = ({ t, shader, params = {} }) => {
  const time = new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  const knobs = Object.entries(params)
    .filter(([k, v]) => /^knob_\d+$/.test(k) && Number.isFinite(v) && Math.abs(v) > 0.005)
    .sort(([a], [b]) => a.slice(5) - b.slice(5))
    .map(([k, v]) => `k${k.slice(5)} ${r2(v)}`)
  return `${time} · ${shader ?? '?'}${knobs.length ? `\n${knobs.join(' ')}` : ''}`
}

// Pure: a file that keeps changing under the wall, so its kept look must be copied now.
export const changing = (shader) => /(-wip|-p\d+)$/.test(shader ?? '')

// Pure: the ops for the nth card (0-based), stacked down the frame's box. (Draw's `place: beside`
// refuses an empty frame, draw feedback e2d6b2fc, so the script places cards itself.)
export const keptOps = ({ id, label, frame = 'kept', box = { x: 0, y: 0 }, n = 0 }) => [{
  kind: 'put',
  drafts: [{
    id: `kept-${id}`, type: 'rectangle', x: box.x + 20, y: box.y + 40 + n * 76, width: 380, height: 64, frameId: frame,
    fontSize: 16, text: label,
  }],
}]

const stamp = (t) => t.replace(/[:.]/g, '-')

// One keep: picture, file copy, card. Returns what it did, for the bridge's log line.
export const onKeep = async ({ mcp, root, post, frame, box, n }, keep) => {
  const t = keep.t ?? new Date().toISOString()
  let shot = null
  try {
    const { images } = await mcp.call('screenshot', { width: 480 })
    if (images?.[0]) {
      shot = join(root, '.claude', 'vj-shots', `keep-${stamp(t)}.jpg`)
      mkdirSync(join(root, '.claude', 'vj-shots'), { recursive: true })
      writeFileSync(shot, Buffer.from(images[0].data, 'base64'))
    }
  } catch { /* the card still lands without a picture */ }
  let copied = null
  if (changing(keep.shader)) {
    try {
      const { body } = await mcp.call('read_shader', { shader: keep.shader })
      copied = join(root, '.claude', 'keeps', `${stamp(t)}-${keep.shader.replace(/\//g, '_')}.frag`)
      mkdirSync(join(root, '.claude', 'keeps'), { recursive: true })
      writeFileSync(copied, body.code)
    } catch { /* not on disk (a relay): the snapshot's params still hold the look */ }
  }
  const label = keptLabel({ ...keep, t })
  const ok = await post(keptOps({ id: stamp(t), label, frame, box, n }))
  return { kept: label, shot, copied, posted: ok }
}

// Waits on the VJ MCP for `keep` signals until signal aborts, calling onKeep for each.
export const watchKeeps = async ({ mcp, root, link, frame = 'kept', signal, log }) => {
  const post = async (ops) => {
    const res = await fetch(link, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ protocol: 'draw', ops }) })
    if (!res.ok) log({ kept: 'card refused', status: res.status, why: (await res.text()).slice(0, 200), fix: res.status === 404 || res.status === 410 ? 'the link expired (1 h): mint one for frame kept, restart with --kept-link' : undefined })
    return res.ok
  }
  // The link's GET names the frame's box and what it holds, so new cards go under the old ones.
  let box = { x: 0, y: 0 }
  let n = 0
  try {
    const { takes } = await (await fetch(link)).json()
    box = takes.box
    n = takes.now.filter((e) => String(e.id).startsWith('kept-')).length
  } catch (e) {
    log({ kept: 'link unreadable', error: String(e.message ?? e).slice(0, 200) })
  }
  let since
  while (!signal?.aborted) {
    try {
      const { body } = await mcp.call('wait_for_event', { ...(since !== undefined && { since }), types: ['keep'], timeout_s: WAIT_S })
      since = body.seq
      for (const e of body.events ?? []) {
        if (e.signal !== 'keep' && e.data?.type !== 'keep') continue
        log(await onKeep({ mcp, root, post, frame, box, n: n++ }, e.data ?? {}))
      }
    } catch (e) {
      if (signal?.aborted) return
      log({ kept: 'watch error', error: String(e.message ?? e).slice(0, 200) })
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
}
