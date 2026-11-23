// The VJ MCP tool surface (docs/vj-mcp.md). One McpServer per HTTP request (stateless
// streamable HTTP), all of them reading the same hub, so a dev-server restart or a client
// reconnect never strands a session.
//
// Writes go through the paths the rest of the system already uses:
//   knobs/params  update-params down the display's /ws socket  -> RemoteDisplay.applyParams
//   shader switch update-params {shader}                       -> loadShader on the page
//   shader source shader-files.saveShader (as /__save-shader)  -> chokidar -> HMR hot-swap
// Reads come from the page over the hub's inspect channel (src/remote/inspect.js).
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ToolError } from './hub.js'
import { readShader, saveShader } from '../shader-files.js'
import { extractKnobs, parseKnobs } from '../../scripts/shader-utils.js'
import { hashSource } from '../../src/remote/hash.js'

const INSTRUCTIONS = `Paper Cranes VJ: drive live audio-reactive shader displays.
Loop: list_displays -> get_state (screenshot:true to see it) -> set_params / set_shader -> get_state again to confirm.
Knobs are knob_1..knob_200, usually 0..1; get_state names the ones the current shader reads. set_params pins a value
above MIDI and controllers; pass null to release it back. write_shader compiles on the display before saving and the
display hot-swaps without a reload. wait_for_event blocks until a display joins/leaves or the ?vj=1 page posts a
signal (clip, flicker, too-dark, shiver, pulse, boot). Every display is a page with ?remote=display on this dev server.`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const text = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] })
const fail = (msg) => ({ isError: true, content: [{ type: 'text', text: msg }] })

// Every handler: a ToolError (or any error) becomes an isError result the agent can read.
const guard = (fn) => async (args, extra) => {
  try {
    return await fn(args ?? {}, extra)
  } catch (e) {
    return fail(e instanceof ToolError ? e.message : `error: ${e?.message ?? e}`)
  }
}

const RESERVED = new Set(['shader', 'shaderCode', 'fullscreen', 'remote', 'room'])
const PARAM_KEY = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/

export const createVjMcpServer = ({ hub, root, port }) => {
  const server = new McpServer({ name: 'paper-cranes-vj', version: '0.1.0' }, { instructions: INSTRUCTIONS })

  const shaderIndex = async () => {
    try {
      return JSON.parse(await readFile(resolve(root, 'shaders.json'), 'utf-8'))
    } catch {
      return []
    }
  }
  // The knobs a shader reads, from shaders.json: { knob_12: "TWIST STEP" | null }.
  const shaderKnobs = async (shader) => {
    const entry = (await shaderIndex()).find((s) => s.name === shader)
    return Object.fromEntries(parseKnobs(entry?.knobs).map((k) => [`knob_${k.n}`, k.label ?? null]))
  }
  const shot = async (d, width) => {
    const r = await hub.request(d, 'shot', { width }, 8000)
    const [, mimeType, data] = /^data:([^;]+);base64,(.*)$/.exec(r.dataUrl) ?? []
    if (!data) throw new ToolError('display returned no image')
    return { image: { type: 'image', data, mimeType }, meta: { w: r.w, h: r.h, srcW: r.srcW, srcH: r.srcH } }
  }
  // Poll the display until it runs the given source (by hash), up to ms.
  const awaitSource = async (d, hash, ms) => {
    let st
    for (const until = Date.now() + ms; Date.now() < until; await sleep(150)) {
      st = await hub.request(d, 'state', { features: 'none' })
      if (st.shaderHash === hash) return { pickedUp: true, state: st }
    }
    return { pickedUp: false, state: st }
  }
  const displayArg = z.string().optional().describe('display id (or unique prefix) from list_displays; omit when only one is connected')

  server.registerTool('list_displays', {
    description: 'Connected displays (pages with ?remote=display on this dev server): id, shader on screen, user agent, canvas size, audio state. Also returns the current event seq for wait_for_event.',
    annotations: { readOnlyHint: true },
  }, guard(async () => text({
    displays: hub.list(),
    seq: hub.seq,
    hint: hub.list().length ? undefined : `none connected; open http://localhost:${port}/jam.html?shader=<path>&remote=display`,
  })))

  server.registerTool('list_shaders', {
    description: 'Shaders on disk from shaders.json, newest first, with the knobs each reads and their names (e.g. "141:TWIST STEP").',
    inputSchema: {
      query: z.string().optional().describe('case-insensitive substring of name, pretty name or tag'),
      include_wip: z.boolean().optional().describe('include wip/ shaders (default true)'),
      limit: z.number().int().min(1).max(500).optional().describe('default 40'),
    },
    annotations: { readOnlyHint: true },
  }, guard(async ({ query, include_wip = true, limit = 40 }) => {
    const q = query?.toLowerCase()
    const rows = (await shaderIndex())
      .filter((s) => include_wip || !/(^|\/)wip\//.test(s.name))
      .filter((s) => !q || [s.name, s.prettyName, ...(s.tags ?? [])].some((v) => String(v ?? '').toLowerCase().includes(q)))
      .sort((a, b) => String(b.modified ?? '').localeCompare(String(a.modified ?? '')))
    return text({
      total: rows.length,
      shaders: rows.slice(0, limit).map((s) => ({
        name: s.name, pretty: s.prettyName, modified: s.modified, tags: s.tags, fullscreen: s.fullscreen,
        knobs: s.knobs ? s.knobs.split('|') : [],
      })),
    })
  }))

  server.registerTool('get_state', {
    description: 'What a display is doing now: shader (and source hash, compile error), fps, audio state, knob values with names, pinned params, controller outputs, core audio features (Normalized/ZScore), vj meter summary when ?vj=1, recent console errors. screenshot:true adds a JPEG of the canvas.',
    inputSchema: {
      display: displayArg,
      features: z.enum(['core', 'all', 'none']).optional().describe('audio features to include (default core)'),
      screenshot: z.boolean().optional().describe('also return a screenshot (default false)'),
    },
    annotations: { readOnlyHint: true },
  }, guard(async ({ display, features = 'core', screenshot = false }) => {
    const d = hub.resolve(display)
    const st = await hub.request(d, 'state', { features })
    // Every knob the shader reads, plus any other knob that is set. value null = never set on
    // this page (the uniform reads 0 unless a controller supplies its own default).
    const declared = st.shader ? await shaderKnobs(st.shader) : {}
    const set = st.knobs ?? {}
    st.knobs = Object.fromEntries(
      [...new Set([...Object.keys(declared), ...Object.keys(set)])]
        .sort((a, b) => a.slice(5) - b.slice(5))
        .map((k) => [k, { value: set[k] ?? null, ...(declared[k] ? { name: declared[k] } : {}), ...(k in declared ? {} : { unused: true }) }]),
    )
    const res = text({ display: d.id, ...st })
    if (screenshot) res.content.push((await shot(d, 480)).image)
    return res
  }))

  server.registerTool('screenshot', {
    description: 'JPEG of the display canvas as the audience sees it (captured on the page, so it works for a phone over the tunnel).',
    inputSchema: { display: displayArg, width: z.number().int().min(64).max(1920).optional().describe('px, default 480') },
    annotations: { readOnlyHint: true },
  }, guard(async ({ display, width = 480 }) => {
    const d = hub.resolve(display)
    const { image, meta } = await shot(d, width)
    return { content: [{ type: 'text', text: JSON.stringify({ display: d.id, ...meta }) }, image] }
  }))

  server.registerTool('set_params', {
    description: 'Set knobs or other numeric uniforms on a display via update-params (the same path vjpad and remote-send use). Values are pinned above MIDI/controllers until released with null. Returns the values read back from the page.',
    inputSchema: {
      display: displayArg,
      params: z.record(z.union([z.number(), z.null()])).describe('e.g. {"knob_12": 0.8, "knob_3": null}'),
    },
  }, guard(async ({ display, params }) => {
    const d = hub.resolve(display)
    const keys = Object.keys(params)
    if (!keys.length) throw new ToolError('params is empty')
    for (const k of keys) {
      if (RESERVED.has(k)) throw new ToolError(`${k} is not a param here; use set_shader / write_shader`)
      if (!PARAM_KEY.test(k)) throw new ToolError(`bad param name ${k}`)
      if (params[k] !== null && !Number.isFinite(params[k])) throw new ToolError(`${k} must be a finite number or null`)
    }
    hub.send(d, 'update-params', params)
    const st = await hub.request(d, 'state', { features: 'none' })
    const readBack = Object.fromEntries(keys.map((k) => [k, k in st.pinned ? st.pinned[k] : null]))
    const mismatched = keys.filter((k) => (params[k] === null ? readBack[k] !== null : Math.abs(readBack[k] - params[k]) > 1e-3))
    return text({ display: d.id, sent: params, readBack, ok: !mismatched.length, mismatched: mismatched.length ? mismatched : undefined })
  }))

  server.registerTool('set_shader', {
    description: 'Switch a display to another shader from disk, in place (no reload; audio history kept). Waits until the page runs that source and reports whether it compiles.',
    inputSchema: {
      display: displayArg,
      shader: z.string().describe('path under shaders/ without .frag, e.g. "clit-set/2"'),
      params: z.record(z.union([z.number(), z.null()])).optional().describe('knobs to set in the same message'),
    },
  }, guard(async ({ display, shader, params = {} }) => {
    const d = hub.resolve(display)
    const { name, code } = await readShader(root, shader).catch(() => { throw new ToolError(`no shader ${shader} on disk (list_shaders)`) })
    for (const k of Object.keys(params)) if (RESERVED.has(k) || !PARAM_KEY.test(k)) throw new ToolError(`bad param name ${k}`)
    hub.send(d, 'update-params', { shader: name, ...params })
    const { pickedUp, state } = await awaitSource(d, hashSource(code), 6000)
    const verdict = await hub.request(d, 'validate', {})
    return text({ display: d.id, shader: name, loaded: pickedUp, compiles: verdict.ok, error: verdict.info ?? undefined, fps: state?.fps })
  }))

  server.registerTool('read_shader', {
    description: 'Source of shaders/<shader>.frag, with its knobs and a hash comparable to get_state.shaderHash.',
    inputSchema: { shader: z.string().describe('path under shaders/ without .frag') },
    annotations: { readOnlyHint: true },
  }, guard(async ({ shader }) => {
    const { name, relative, code } = await readShader(root, shader).catch(() => { throw new ToolError(`no shader ${shader} on disk`) })
    return text({ shader: name, path: relative, hash: hashSource(code), bytes: code.length, knobs: extractKnobs(code), code })
  }))

  server.registerTool('write_shader', {
    description: 'Write shaders/<shader>.frag (dev server only). First compiles the code on a connected display and refuses to write on a compile error; displays showing that shader hot-swap to it (HMR, no reload). Reports which displays picked it up.',
    inputSchema: {
      shader: z.string().describe('path under shaders/ without .frag; new paths are created'),
      code: z.string().min(1).describe('full GLSL source'),
      display: displayArg.describe('display to compile on (default: the only one, or the one showing this shader)'),
      validate: z.boolean().optional().describe('compile on a display before writing (default true; false skips, e.g. with no display)'),
    },
  }, guard(async ({ shader, code, display, validate = true }) => {
    const target = shader.replace(/^\/+/, '').replace(/\.frag$/, '')
    const showing = hub.list().filter((d) => d.shader === target).map((d) => hub.resolve(d.id))
    let validated = false
    if (validate) {
      const d = display ? hub.resolve(display) : showing[0] ?? hub.resolve()
      const v = await hub.request(d, 'validate', { src: code })
      if (!v.ok) return fail(`not written: compile failed on display ${d.id}:\n${v.info}`)
      validated = d.id
    }
    const saved = await saveShader(root, shader, code)
    const hash = hashSource(code)
    const displays = await Promise.all(showing.map(async (d) => {
      try {
        const { pickedUp, state } = await awaitSource(d, hash, 4000)
        return { id: d.id, pickedUp, shaderError: state?.shaderError ?? null }
      } catch (e) {
        return { id: d.id, pickedUp: false, error: e.message }
      }
    }))
    return text({ ...saved, hash, validatedOn: validated || 'skipped', displays })
  }))

  server.registerTool('wait_for_event', {
    description: 'Block until something happens, then return it: display-joined, display-left, or vj-signal (from ?vj=1 pages: boot, clip, flicker, too-dark, shiver, gate-drop, pulse, confirm-learn). Pass the seq you last saw as since; returns {seq, events} (empty on timeout).',
    inputSchema: {
      since: z.number().int().min(0).optional().describe('return events after this seq (default: now, i.e. only new ones)'),
      types: z.array(z.string()).optional().describe('event types or signal types to wait for (default all)'),
      timeout_s: z.number().min(1).max(55).optional().describe('default 25'),
    },
    annotations: { readOnlyHint: true },
  }, guard(async ({ since, types = [], timeout_s = 25 }, extra) =>
    text(await hub.waitFor({ since: since ?? hub.seq, types, timeoutMs: timeout_s * 1000, signal: extra?.signal })),
  ))

  return server
}
