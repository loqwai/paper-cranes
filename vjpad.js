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
 * actually references. Audited tonight:
 *   chromadepth-lattice/3,4,5,6 → read knob_1 ONLY (pan speed). Everything else
 *       they respond to is NAMED: navX, navY, navZoom, paletteShift, warpGrow.
 *   lattice-interactive/3       → reads knob_1..knob_5 (the four HORIZONS dials).
 * So a pure knob bank is DEAD on the shaders he actually plays. That is why the
 * first three banks are built on the live named uniforms and are carved up so they
 * do not overlap — three phones can all play chromadepth-lattice/6 at once, for
 * real. Banks 4+ are generic knob banks: they are honestly labelled KNOBS ONLY,
 * and they move nothing until a shader reads that range. The page says so on its
 * face rather than handing a guest a row of dead dials.
 */
import { WebSocketClient } from './src/remote/WebSocketClient.js'

const $ = (id) => document.getElementById(id)
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t)

/* ── axis helpers ─────────────────────────────────────────────────────────
   curve 'exp' = geometric. Zoom needs it: 0.04→8 mapped linearly puts every
   usable value in the first 2% of the pad. */
const ax = (key, label, min, max, def, opt = {}) => ({ key, label, min, max, def, ...opt })
const toValue = (a, t) => (a.curve === 'exp' ? a.min * Math.pow(a.max / a.min, t) : a.min + t * (a.max - a.min))
const toPos = (a, v) =>
    a.curve === 'exp' ? Math.log(v / a.min) / Math.log(a.max / a.min) : (v - a.min) / (a.max - a.min)
const fmt = (a, v) => (a.fmt ? a.fmt(v) : v.toFixed(2))

const ZOOM_FMT = (v) => v.toFixed(2) + '×'

/* ── the banks ───────────────────────────────────────────────────────────── */
const KNOB_BASE = 100 // bank i gets knob_(KNOB_BASE + (i-1)*10 + 1 .. + 10)

/** a generic 5-pad bank of raw knobs, for the 4th phone onwards */
const guestBank = (n, base) => ({
    name: 'GUEST ' + n,
    live: 'KNOBS ONLY',
    note: `knob_${base + 1}–knob_${base + 10} · needs a shader that reads them`,
    pads: [0, 1, 2, 3, 4].map((i) => ({
        name: 'PAD ' + 'ABCDE'[i],
        hue: ['#f472b6', '#38bdf8', '#a78bfa', '#34d399', '#fbbf24'][i],
        x: ax(`knob_${base + i * 2 + 1}`, `K${base + i * 2 + 1}`, 0, 1, 0.5),
        y: ax(`knob_${base + i * 2 + 2}`, `K${base + i * 2 + 2}`, 0, 1, 0.5),
    })),
})

const BANKS = [
    {
        name: 'FLIGHT',
        live: 'LIVE',
        note: 'navX/navY/navZoom/paletteShift/warpGrow · every lattice shader',
        pads: [
            {
                name: 'FLY',
                hue: '#38bdf8',
                x: ax('navX', 'PAN X', -6, 6, 0),
                y: ax('navY', 'PAN Y', -6, 6, 0),
            },
            {
                name: 'ZOOM',
                hue: '#34d399',
                x: ax('knob_1', 'PAN SPD', 0, 1, 0.21),
                y: ax('navZoom', 'ZOOM', 0.04, 8, 1, { curve: 'exp', fmt: ZOOM_FMT }),
            },
            {
                name: 'COLOUR',
                hue: '#f472b6',
                x: ax('paletteShift', 'PALETTE', 0, 1, 0),
                y: ax('warpGrow', 'WARP', 0, 2, 0),
            },
        ],
    },
    {
        name: 'PULSE',
        live: 'LIVE',
        note: 'the music channels · pins quietGate so they bite in a quiet room',
        // Overriding these takes the channel off the music — that is the point of a
        // second phone: one person flies, one person plays the reaction.
        quietGate: true,
        pads: [
            {
                name: 'BASS',
                hue: '#fbbf24',
                x: ax('waveletBassSpring', 'BASS', 0, 1, 0.3),
                y: ax('waveletBand5Spring', 'LINES', 0, 1, 0.3),
            },
            {
                name: 'GLOW',
                hue: '#a78bfa',
                x: ax('energySpring', 'GLOW', 0, 1, 0.4),
                y: ax('spectralCrestSmooth', 'SPARKLE', 0, 1, 0.3),
            },
            {
                name: 'CELLS',
                hue: '#22d3ee',
                x: ax('waveletBand2Spring', 'CELLS', 0, 1, 0.3),
                y: ax('melodyFlow', 'HUE FLOW', 0, 1, 0.5),
            },
        ],
    },
    {
        name: 'HORIZONS',
        live: 'HZN ONLY',
        note: 'knob_2–knob_5 · only lattice-interactive/3 reads these',
        pads: [
            {
                name: 'SCHEME',
                hue: '#f97316',
                x: ax('knob_2', 'SCHEME', 0, 1, 0),
                y: ax('knob_3', 'CELL SIZE', 0, 1, 0),
            },
            {
                name: 'TWIST',
                hue: '#60a5fa',
                x: ax('knob_4', 'TWIST', 0, 1, 0),
                y: ax('knob_5', 'REACT', 0, 1, 0),
            },
        ],
    },
    guestBank(1, KNOB_BASE + 30),
    guestBank(2, KNOB_BASE + 40),
    guestBank(3, KNOB_BASE + 50),
]

/* ── shaders worth having on stage (same list the dial page ships) ───────── */
const SHADERS = [
    { path: 'redaphid/chromadepth-lattice/6', label: 'L6' },
    { path: 'redaphid/chromadepth-lattice/5', label: 'L5' },
    { path: 'redaphid/chromadepth-lattice/4', label: 'L4' },
    { path: 'redaphid/lattice-interactive/3', label: 'HZN' },
    { path: 'redaphid/chromadepth-lattice/3', label: 'L3' },
    { path: 'redaphid/wip/lattice-vj/1', label: 'VJ' },
]

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
const peers = new Map() // id -> { bank, manual, seen }
const LS_KEY = 'vjpad-bank'

let bank = 0
let pinned = false
const savedBank = parseInt(localStorage.getItem(LS_KEY) ?? '', 10)
if (Number.isInteger(savedBank) && savedBank >= 0 && savedBank < BANKS.length) {
    bank = savedBank
    pinned = true
}

const announce = () => sendRaw('vjpad-peer', { id: myId, bank, manual: pinned })

const livePeers = () => {
    const now = Date.now()
    for (const [id, p] of peers) if (now - p.seen > 10000) peers.delete(id)
    return peers
}

const freeBank = () => {
    const taken = new Set([...livePeers().values()].map((p) => p.bank))
    for (let i = 0; i < BANKS.length; i++) if (!taken.has(i)) return i
    return bank
}

const onPeer = (p) => {
    peers.set(p.id, { bank: p.bank, manual: !!p.manual, seen: Date.now() })
    // Someone else is on my bank. If I am not pinned, and they either pinned it or
    // simply sorted first, I move. Deterministic, so we never swap forever.
    if (p.bank === bank && !pinned && (p.manual || p.id < myId)) {
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

const knobFor = (padIndex, isY) => `knob_${KNOB_BASE + bank * 10 + padIndex * 2 + (isY ? 2 : 1)}`

/* Every axis publishes BOTH its named uniform and this bank's private knob. The
   named one is what moves tonight's shaders; the knob is what makes each phone a
   bank of MIDI-style controls any shader can read. */
const payloadFor = (pad, axis, isY, value) => {
    const out = { [axis.key]: value }
    const mirror = knobFor(pad.index, isY)
    if (mirror !== axis.key) out[mirror] = clamp01(toPos(axis, value))
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
        if (BANKS[bank].quietGate && !state.__gate) {
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
    const defs = BANKS[bank].pads
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
    bank = i
    if (manual) {
        pinned = true
        localStorage.setItem(LS_KEY, String(i))
    }
    buildBank()
    announce()
    buzz(40)
}

/* ── bank picker ──────────────────────────────────────────────────────── */
const bankHost = $('banks')
BANKS.forEach((b, i) => {
    const el = document.createElement('button')
    el.className = 'bbtn'
    el.type = 'button'
    el.innerHTML = `${b.name}<small>${b.live}</small>`
    el.addEventListener('click', () => setBank(i, true))
    bankHost.appendChild(el)
})

/* ── shader strip ─────────────────────────────────────────────────────── */
const shaderHost = $('shaders')
SHADERS.forEach((s) => {
    const b = document.createElement('button')
    b.className = 'sbtn'
    b.type = 'button'
    b.textContent = s.label
    b.addEventListener('click', () => {
        sendRaw('update-params', { shader: s.path })
        ;[...shaderHost.children].forEach((c) => c.classList.remove('on'))
        b.classList.add('on')
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
        const b = BANKS[bank]
        txt.textContent =
            `${b.name}${pinned ? ' ◉' : ''} · ` +
            (displays > 0 ? `${displays} display${displays === 1 ? '' : 's'}` : 'no display') +
            (others ? ` · ${others} other phone${others === 1 ? '' : 's'}` : '')
    }
    ;[...bankHost.children].forEach((c, i) => {
        c.classList.toggle('on', i === bank)
        c.classList.toggle('taken', i !== bank && [...livePeers().values()].some((p) => p.bank === i))
    })
    $('note').textContent = BANKS[bank].note
    paintFingers()
}

/* ── release / reset ──────────────────────────────────────────────────────
   Sending null tells RemoteDisplay to DELETE the key from messageParams, handing
   the uniform back to the controller/audio pipeline instead of freezing it at
   whatever we last pushed. Only this bank's keys are released — one phone letting
   go must never yank the controls out of another phone's hands. */
const bankKeys = () => {
    const keys = []
    BANKS[bank].pads.forEach((p, i) => {
        keys.push(p.x.key, p.y.key, knobFor(i, false), knobFor(i, true))
    })
    if (BANKS[bank].quietGate) keys.push('quietGate')
    return [...new Set(keys)]
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
    BANKS[bank].pads.forEach((p, i) => {
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

// Last-ditch guard: anything that escapes the pads must not scroll or zoom the page.
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false })
document.addEventListener('gesturestart', (e) => e.preventDefault())

buildBank()
client.connect()

// handy for debugging from a desktop console / automation
window.vjpad = { state, pads, active, send, BANKS, get bank() { return bank }, setBank, client }
