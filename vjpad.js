/**
 * vjpad.js — a five-finger control surface for the lattice series.
 *
 * SIBLING OF vj.js, NOT A REPLACEMENT. vj.html is the dial page and stays exactly
 * as it is; this page is the instrument. Same transport (the /ws vite plugin),
 * same precedence trick: messageParams is the HIGHEST layer in getCranesState()
 * (audio < wavelet < controllerFeatures < url < manualFeatures < messageParams),
 * so what we push here beats whatever lattice-nav computes each frame. No shader
 * edits, no controller edits.
 *
 * ── WHY FIXED LABELLED ZONES, NOT "FINGER 1 OWNS ZOOM" ────────────────────
 * Touch-order assignment means the parameter under your finger depends on which
 * finger you happened to put down first. In a dark room that is unusable. Here
 * the pads are fixed rectangles with their names printed on them: your hand finds
 * a parameter by WHERE IT IS on the glass. Each pad owns one finger, X and Y drive
 * two parameters, and up to five pads can be held at once.
 *
 * ── EACH PHONE ADDS ITS OWN KNOBS ─────────────────────────────────────────
 * Every phone claims a BANK. A bank is a set of pads plus a private range of
 * knob_N uniforms, so two phones never fight over the same control (the dial page
 * found that two phones on one control is last-write-wins with stale UIs).
 * Bank i owns knob_(100 + (i-1)*10 + 1 .. 100 + i*10) and EVERY axis publishes
 * its 0..1 position there, in addition to whatever named uniform it drives. That
 * is the "phone as MIDI controller" part: a phone is a bank of knobs, exactly like
 * a physical CC box, and a shader can read knob_131 to pick up guest 3's finger.
 *
 * ── THE HONEST CAVEAT (read this before trusting a guest bank on stage) ────
 * Knob uniforms are auto-injected, but a shader only responds to a knob it
 * actually references. A bank of pads whose knobs the current shader ignores is
 * DEAD, and in a dark room a dead pad is worse than no pad. The audit that
 * established this, kept because it is what the `match` globs now encode:
 *   chromadepth-lattice/3,4,5,6 → read knob_1 ONLY (pan speed). Everything else
 *       they respond to is NAMED: navX, navY, navZoom, paletteShift, warpGrow.
 *   lattice-interactive/3       → reads knob_1..knob_5 (the four HORIZONS dials).
 *   lattice-vj/5                → knob_131–140 (shape).
 *   lattice-vj/6                → additionally knob_141–160 (the fractal's
 *       previously hardcoded constants; those faders are CENTRED, 0.5 = the
 *       tuned value, which is why their defaults differ from the 0/1 banks).
 * So a pure knob bank is DEAD on most of the shaders he actually plays — hence
 * the first banks are built on live NAMED uniforms, carved up so they do not
 * overlap (three phones can play chromadepth-lattice/6 at once, for real), and
 * the knob banks now say which shaders answer them instead of following you
 * everywhere.
 *
 * ── WHERE THE LAYOUT COMES FROM (see src/vj/vjpad-layout.js) ───────────────
 * Three layers, none of which you have to touch to start playing:
 *   1. vjpad-layouts.json — checked in. Banks, pads, ranges, curves, colours and
 *      non-knob param names (navX, waveletBassSpring…). Each bank says which
 *      shaders it is FOR, so the lattice banks no longer follow you onto a
 *      shader that ignores them.
 *   2. the shader's own source — every knob_N it reads, named from its own
 *      `// K141 TWIST STEP` comments, baked into shaders.json at build time.
 *      This is the zero-config layer: a shader nobody wrote a layout for still
 *      gets correctly-numbered, usually correctly-named pads.
 *   3. this phone — per-device tweaks from the EDIT screen (long-press the
 *      status line), stored in localStorage like the MIDI mapper's profiles.
 * The lattice banks below moved verbatim into vjpad-layouts.json, defaults and
 * all, and each carries an explicit `knobBase` so its mirror range stays put no
 * matter where it lands in the list.
 */
import { WebSocketClient } from './src/remote/WebSocketClient.js'
import LAYOUTS from './vjpad-layouts.json'
import { resolveBanks, loadOverrides, saveOverrides, mirrorKnob, parseKnobs } from './src/vj/vjpad-layout.js'
import { mountEditor } from './src/vj/vjpad-edit.js'

const $ = (id) => document.getElementById(id)
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t)

/* ── axis maths ──────────────────────────────────────────────────────────
   curve 'exp' = geometric. Zoom needs it: 0.04→8 mapped linearly puts every
   usable value in the first 2% of the pad. */
const toValue = (a, t) => (a.curve === 'exp' ? a.min * Math.pow(a.max / a.min, t) : a.min + t * (a.max - a.min))
const toPos = (a, v) =>
    a.curve === 'exp' ? Math.log(v / a.min) / Math.log(a.max / a.min) : (v - a.min) / (a.max - a.min)
const fmt = (a, v) => (a.fmt ? a.fmt(v) : v.toFixed(2))

/* ── what the pad is pointed at ───────────────────────────────────────────
   The shader strip already existed and was already one tap; it now also decides
   which banks are on screen, so switching shader and switching control surface
   are the same gesture instead of two. */
const params = new URLSearchParams(location.search)
const SHADER_KEY = 'vjpad-shader'
const KNOBS_KEY = 'cranes-vjpad-knobs'

let activeShader = params.get('shader') || localStorage.getItem(SHADER_KEY) || LAYOUTS.defaultShader || null
let overrides = loadOverrides()
let banks = []

/* Which knobs each shader reads, and what it calls them, straight out of the
   build's shaders.json. Cached on the phone because it is the ONLY part of the
   layout that arrives over the network, and a dead wifi moment must not cost
   you your pads. */
const readKnobCache = () => {
    try {
        return JSON.parse(localStorage.getItem(KNOBS_KEY) ?? '{}') ?? {}
    } catch {
        return {}
    }
}
let knobCache = readKnobCache()
const shaderKnobs = () => (activeShader && knobCache[activeShader]) || []

const rebuildLayout = () => {
    banks = resolveBanks({ layouts: LAYOUTS, shader: activeShader, shaderKnobs: shaderKnobs(), overrides })
}
rebuildLayout()

/* Non-blocking on purpose: the pad is fully usable from the checked-in layout
   before this lands, and if it never lands nothing breaks. */
const loadShaderKnobs = async () => {
    try {
        const list = await fetch('/shaders.json').then((res) => res.json())
        const next = {}
        list.forEach((entry) => {
            const knobs = parseKnobs(entry.knobs)
            if (knobs.length) next[entry.name] = knobs
        })
        knobCache = next
        localStorage.setItem(KNOBS_KEY, JSON.stringify(next))
        relayout()
    } catch {
        /* offline, or a static host without shaders.json — cache or file layout stands */
    }
}

const SHADERS = LAYOUTS.shaders ?? []

/* ── transport ────────────────────────────────────────────────────────────
   We drive WebSocketClient directly rather than initRemoteController because we
   need to see peer messages (the bank claims below), and RemoteController only
   surfaces `status`. Nothing in src/ is modified. */
let displays = 0
let status = 'reconnecting'

const client = new WebSocketClient(
    (msg) => {
        if (msg.type === 'status') {
            displays = Math.max(0, (msg.data?.connectedClients || 0) - 1)
            paint()
        } else if (msg.type === 'vjpad-peer' && msg.data?.id !== myId) {
            onPeer(msg.data)
        }
    },
    (s) => {
        status = s
        if (s === 'connected') announce()
        paint()
    }
)

const sendRaw = (type, data) => client.send(type, data)

/* One send per animation frame, with every finger's changes merged into it.
   Five fingers moving fires pointermove far faster than 60Hz; without coalescing
   we would flood the socket with five redundant messages per frame. */
let pending = null
let queued = false
const flush = () => {
    queued = false
    if (!pending) return
    sendRaw('update-params', pending)
    pending = null
}
const send = (obj) => {
    pending = Object.assign(pending || {}, obj)
    if (!queued) {
        queued = true
        requestAnimationFrame(flush)
    }
}

// Chrome logs a console error if vibrate() is called before the frame has ever
// been genuinely tapped, so only buzz once the page really has user activation.
const buzz = (ms) => {
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return
    navigator.vibrate?.(ms)
}

/* ── bank claiming ────────────────────────────────────────────────────────
   CHOSEN: peer auto-claim over the existing hub, with a manual picker on top.
   The hub already broadcasts every message to all OTHER clients, so phones can
   announce which bank they hold without a single line of server change — the
   safest possible option an hour before a show. Each phone announces every 3s,
   drops peers unheard for 10s, and if two phones land on the same bank the one
   with the higher random id steps aside to the lowest free bank. A human tap on
   the picker PINS the bank (remembered on that phone) and always wins over the
   automatic move, because in a loud room the person holding the phone is right. */
const myId = Math.random().toString(36).slice(2, 8)
const peers = new Map() // id -> { bank, name, manual, seen }
const LS_KEY = 'vjpad-bank'

/* The pinned bank is remembered BY NAME. It used to be an index, which was fine
   while the bank list was a constant — now that the list depends on the selected
   shader, an index silently means a different bank on a different shader. */
let bank = 0
let pinned = false
const savedBank = localStorage.getItem(LS_KEY) ?? ''
const legacyIndex = /^\d+$/.test(savedBank) ? Number(savedBank) : -1
const savedIndex = legacyIndex >= 0 ? legacyIndex : banks.findIndex((b) => b.name === savedBank)
if (savedIndex >= 0 && savedIndex < banks.length) {
    bank = savedIndex
    pinned = true
}

const bankName = () => banks[bank]?.name ?? ''

const announce = () => sendRaw('vjpad-peer', { id: myId, bank, name: bankName(), shader: activeShader, manual: pinned })

const livePeers = () => {
    const now = Date.now()
    for (const [id, p] of peers) if (now - p.seen > 10000) peers.delete(id)
    return peers
}

/* Two phones can now be on different shaders, so bank INDEX is not a shared
   name any more — compare by bank name, falling back to the index for a phone
   still running the older build. */
const peerHoldsIndex = (p, i) => (p.name ? p.name === banks[i]?.name : p.bank === i)

const freeBank = () => {
    const live = [...livePeers().values()]
    for (let i = 0; i < banks.length; i++) if (!live.some((p) => peerHoldsIndex(p, i))) return i
    return bank
}

const onPeer = (p) => {
    peers.set(p.id, { bank: p.bank, name: p.name, manual: !!p.manual, seen: Date.now() })
    // Someone else is on my bank. If I am not pinned, and they either pinned it or
    // simply sorted first, I move. Deterministic, so we never swap forever.
    if (peerHoldsIndex(p, bank) && !pinned && (p.manual || p.id < myId)) {
        const next = freeBank()
        if (next !== bank) {
            setBank(next, false)
            return
        }
    }
    paint()
}

setInterval(() => {
    if (status === 'connected') announce()
    paint()
}, 3000)

/* ── state ────────────────────────────────────────────────────────────────
   Values LATCH: lifting a finger leaves the parameter where you left it. A VJ
   sets a look and it stays; snapping back to neutral on release would make every
   pad a momentary effect and nothing would hold between gestures. */
const state = {} // key -> value
const pads = [] // live pad objects for the current bank
const active = new Map() // pointerId -> pad

const knobFor = (padIndex, isY) => mirrorKnob(banks[bank], padIndex, isY)

/* Every axis publishes BOTH its named uniform and this bank's private knob. The
   named one is what moves tonight's shaders; the knob is what makes each phone a
   bank of MIDI-style controls any shader can read. Auto-generated banks set
   `mirror: false` — their axes ARE knobs, and echoing them onto a second range
   would write knobs the shader never asked for. */
const payloadFor = (pad, axis, isY, value) => {
    const out = { [axis.key]: value }
    const mirror = knobFor(pad.index, isY)
    if (mirror && mirror !== axis.key) out[mirror] = clamp01(toPos(axis, value))
    return out
}

/* ── build the surface ────────────────────────────────────────────────────── */
const buildPad = (def, index) => {
    const el = document.createElement('div')
    el.className = 'pad'
    el.style.setProperty('--hue', def.hue)
    el.innerHTML =
        `<div class="padname">${def.name}</div>` +
        `<div class="readout"></div>` +
        `<div class="axis x">${def.x.label} →</div>` +
        `<div class="axis y">${def.y.label} ↑</div>` +
        `<div class="cursor"><div class="h"></div><div class="v"></div><div class="ring"></div><div class="tag"></div></div>`

    const pad = {
        index,
        el,
        def,
        cursor: el.querySelector('.cursor'),
        readout: el.querySelector('.readout'),
        tag: el.querySelector('.tag'),
        pointer: null,
    }

    state[def.x.key] = def.x.def
    state[def.y.key] = def.y.def

    pad.draw = () => {
        const tx = clamp01(toPos(def.x, state[def.x.key]))
        const ty = clamp01(toPos(def.y, state[def.y.key]))
        // y is inverted on purpose: up means more, like every fader ever built
        pad.cursor.style.left = (tx * 100).toFixed(2) + '%'
        pad.cursor.style.top = ((1 - ty) * 100).toFixed(2) + '%'
        pad.cursor.classList.toggle('flip', tx > 0.55)
        const vx = fmt(def.x, state[def.x.key])
        const vy = fmt(def.y, state[def.y.key])
        pad.readout.innerHTML = `${def.x.label} <span class="rv">${vx}</span><br>${def.y.label} <span class="rv">${vy}</span>`
        pad.tag.textContent = `${def.x.label} ${vx} · ${def.y.label} ${vy}`
    }

    /* ── the actual multitouch ────────────────────────────────────────────
       One pointer per pad, tracked BY pointerId. setPointerCapture is per
       (element, pointerId), so five pads can each hold their own finger and keep
       receiving its moves even if it slides off the pad. preventDefault plus
       touch-action:none in the CSS stops the browser stealing the gesture for
       scroll or pinch-zoom — without both, this feels broken on a real phone. */
    const apply = (e) => {
        const r = el.getBoundingClientRect()
        const tx = clamp01((e.clientX - r.left) / r.width)
        const ty = clamp01(1 - (e.clientY - r.top) / r.height)
        const vx = toValue(def.x, tx)
        const vy = toValue(def.y, ty)
        state[def.x.key] = vx
        state[def.y.key] = vy
        pad.draw()
        send(Object.assign(payloadFor(pad, def.x, false, vx), payloadFor(pad, def.y, true, vy)))
    }

    el.addEventListener('pointerdown', (e) => {
        if (pad.pointer !== null) return // this pad already has a finger; ignore a second
        e.preventDefault()
        pad.pointer = e.pointerId
        active.set(e.pointerId, pad)
        try {
            el.setPointerCapture(e.pointerId)
        } catch {}
        el.classList.add('held')
        if (banks[bank]?.quietGate && !state.__gate) {
            // quietGate scales nearly every audio term in the lattice shaders. Without
            // pinning it these pads would do nothing in a quiet moment.
            state.__gate = true
            send({ quietGate: 1 })
        }
        apply(e)
        paintFingers()
        buzz(12)
    })

    el.addEventListener('pointermove', (e) => {
        if (pad.pointer !== e.pointerId) return
        e.preventDefault()
        apply(e)
    })

    const up = (e) => {
        if (pad.pointer !== e.pointerId) return
        pad.pointer = null
        active.delete(e.pointerId)
        el.classList.remove('held')
        try {
            el.releasePointerCapture(e.pointerId)
        } catch {}
        paintFingers()
    }
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)

    pad.draw()
    return pad
}

const padHost = $('pads')

const buildBank = () => {
    padHost.innerHTML = ''
    pads.length = 0
    active.clear()
    const defs = banks[bank]?.pads ?? []
    const n = defs.length
    // Layout: an odd bank leads with one full-width pad, the rest pair up.
    padHost.style.gridTemplateColumns = n === 2 ? '1fr' : '1fr 1fr'
    padHost.style.gridTemplateRows =
        n === 2 ? 'repeat(2, 1fr)' : n === 3 ? '1.3fr 1fr' : n === 5 ? '1.3fr 1fr 1fr' : 'repeat(2, 1fr)'
    defs.forEach((def, i) => {
        const pad = buildPad(def, i)
        if (n % 2 === 1 && i === 0 && n !== 2) pad.el.classList.add('wide')
        pads.push(pad)
        padHost.appendChild(pad.el)
    })
    paint()
}

const setBank = (i, manual) => {
    bank = Math.max(0, Math.min(i, banks.length - 1))
    if (manual) {
        pinned = true
        localStorage.setItem(LS_KEY, bankName())
    }
    buildBank()
    announce()
    buzz(40)
}

/* ── bank picker ────────────────────────────────────────────────────────
   Rebuilt whenever the bank list changes (shader switch, an edit), because the
   list is no longer a constant. Same chips, same one-tap switch. */
const bankHost = $('banks')
const buildBankPicker = () => {
    bankHost.innerHTML = ''
    banks.forEach((b, i) => {
        const el = document.createElement('button')
        el.className = 'bbtn'
        el.type = 'button'
        el.innerHTML = `${b.name}<small>${b.live}</small>`
        el.addEventListener('click', () => setBank(i, true))
        bankHost.appendChild(el)
    })
}

/* Re-resolve the layout and redraw the surface, holding onto the bank you were
   already on by NAME so a shader switch never yanks the pads out from under a
   finger that is still on the same-named bank. */
const relayout = () => {
    const held = bankName()
    rebuildLayout()
    const found = banks.findIndex((b) => b.name === held)
    bank = found >= 0 ? found : Math.min(bank, Math.max(0, banks.length - 1))
    buildBankPicker()
    buildBank()
}

/* ── shader strip ───────────────────────────────────────────────────────
   Tapping a shader still sends it to the displays; it now ALSO points the pad's
   layout at that shader, which is the whole reason the banks stopped being
   hardcoded. Still one tap. */
const shaderHost = $('shaders')
const setShader = (path, { broadcast }) => {
    activeShader = path
    localStorage.setItem(SHADER_KEY, path)
    if (broadcast) sendRaw('update-params', { shader: path })
    ;[...shaderHost.children].forEach((c) => c.classList.toggle('on', c.dataset.path === path))
    relayout()
}

SHADERS.forEach((entry) => {
    const b = document.createElement('button')
    b.className = 'sbtn'
    b.type = 'button'
    b.textContent = entry.label
    b.dataset.path = entry.path
    b.classList.toggle('on', entry.path === activeShader)
    b.addEventListener('click', () => {
        setShader(entry.path, { broadcast: true })
        buzz(40)
    })
    shaderHost.appendChild(b)
})

/* ── painting the chrome ──────────────────────────────────────────────── */
const paintFingers = () => {
    const el = $('fingers')
    el.textContent = String(active.size)
    el.classList.toggle('on', active.size > 0)
}

const paint = () => {
    const dot = $('dot')
    const txt = $('status')
    dot.className = 'dot ' + (status === 'connected' ? (displays > 0 ? 'live' : 'wait') : 'dead')
    const others = livePeers().size
    if (status !== 'connected') {
        txt.textContent = status === 'reconnecting' ? 'reconnecting…' : 'NO SERVER'
    } else {
        const b = banks[bank] ?? { name: '—' }
        txt.textContent =
            `${b.name}${pinned ? ' ◉' : ''} · ` +
            (displays > 0 ? `${displays} display${displays === 1 ? '' : 's'}` : 'no display') +
            (others ? ` · ${others} other phone${others === 1 ? '' : 's'}` : '')
    }
    ;[...bankHost.children].forEach((c, i) => {
        c.classList.toggle('on', i === bank)
        c.classList.toggle('taken', i !== bank && [...livePeers().values()].some((p) => peerHoldsIndex(p, i)))
    })
    $('note').textContent = banks[bank]?.note ?? ''
    paintFingers()
}

/* ── release / reset ──────────────────────────────────────────────────────
   Sending null tells RemoteDisplay to DELETE the key from messageParams, handing
   the uniform back to the controller/audio pipeline instead of freezing it at
   whatever we last pushed. Only this bank's keys are released — one phone letting
   go must never yank the controls out of another phone's hands. */
const bankKeys = () => {
    const keys = []
    ;(banks[bank]?.pads ?? []).forEach((p, i) => {
        keys.push(p.x.key, p.y.key, knobFor(i, false), knobFor(i, true))
    })
    if (banks[bank]?.quietGate) keys.push('quietGate')
    return [...new Set(keys)].filter(Boolean)
}

$('release').addEventListener('click', () => {
    const payload = {}
    bankKeys().forEach((k) => (payload[k] = null))
    state.__gate = false
    send(payload)
    buzz([30, 40, 30])
})

$('reset').addEventListener('click', () => {
    const payload = {}
    ;(banks[bank]?.pads ?? []).forEach((p, i) => {
        state[p.x.key] = p.x.def
        state[p.y.key] = p.y.def
        Object.assign(payload, payloadFor({ index: i }, p.x, false, p.x.def))
        Object.assign(payload, payloadFor({ index: i }, p.y, true, p.y.def))
    })
    pads.forEach((p) => p.draw())
    send(payload)
    buzz([30, 40, 30])
})

/* ── keep the phone awake ─────────────────────────────────────────────────
   navigator.wakeLock needs a SECURE CONTEXT. Over http://192.168.x.x the API is
   absent, not denied — so say so instead of pretending it worked. */
let lock = null
const wakeBtn = $('wake')
const wakeSupported = 'wakeLock' in navigator
if (!wakeSupported) {
    wakeBtn.textContent = window.isSecureContext ? 'NO WAKE' : 'HTTP'
    wakeBtn.disabled = true
    wakeBtn.style.opacity = '0.5'
}
wakeBtn.addEventListener('click', async () => {
    if (!wakeSupported) return
    try {
        if (lock) {
            await lock.release()
            lock = null
            wakeBtn.classList.remove('on')
            wakeBtn.textContent = 'AWAKE'
        } else {
            lock = await navigator.wakeLock.request('screen')
            lock.addEventListener('release', () => {
                lock = null
                wakeBtn.classList.remove('on')
                wakeBtn.textContent = 'AWAKE'
            })
            wakeBtn.classList.add('on')
            wakeBtn.textContent = 'ON'
        }
    } catch {
        wakeBtn.textContent = 'FAILED'
    }
})
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && wakeBtn.classList.contains('on') && !lock) {
        try {
            lock = await navigator.wakeLock.request('screen')
        } catch {}
    }
})

/* ── the setup screen ──────────────────────────────────────────────────────
   Out of the performance path by construction: it lives behind a LONG PRESS on
   the status line — the one strip of the page with no control on it — and while
   it is open it replaces the pad grid entirely, so there is no half-open state
   to fumble into mid-show. Nothing here is needed to play; it exists so knob
   numbers and names can be changed without a laptop. */
const editor = mountEditor({
    host: $('editor'),
    sheet: $('sheet'),
    getShader: () => activeShader,
    getBank: () => banks[bank] ?? { name: '—', pads: [] },
    getBanks: () => banks,
    getShaderKnobs: shaderKnobs,
    getOverrides: () => overrides,
    setOverrides: (next) => {
        overrides = next
        saveOverrides(next)
        rebuildLayout()
    },
    onClose: () => {
        document.body.classList.remove('editing')
        relayout()
    },
})

const statusEl = $('status')
statusEl.title = 'long-press to set up banks'
let pressTimer = null
const cancelPress = () => {
    clearTimeout(pressTimer)
    pressTimer = null
}
statusEl.addEventListener('pointerdown', () => {
    cancelPress()
    pressTimer = setTimeout(() => {
        document.body.classList.add('editing')
        editor.open()
        buzz([20, 40, 20])
    }, 800)
})
;['pointerup', 'pointercancel', 'pointerleave', 'pointermove'].forEach((type) =>
    statusEl.addEventListener(type, cancelPress)
)

// Last-ditch guard: anything that escapes the pads must not scroll or zoom the page.
// The setup screen is the one place that genuinely needs to scroll, so it opts out.
document.addEventListener('touchmove', (e) => !editor.isOpen && e.preventDefault(), { passive: false })
document.addEventListener('gesturestart', (e) => e.preventDefault())

relayout()
loadShaderKnobs()
client.connect()

// handy for debugging from a desktop console / automation
window.vjpad = {
    state,
    pads,
    active,
    send,
    client,
    setBank,
    setShader,
    relayout,
    get banks() { return banks },
    get bank() { return bank },
    get shader() { return activeShader },
    get overrides() { return overrides },
}
