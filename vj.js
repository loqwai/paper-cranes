/**
 * vj.js — phone VJ controller for the lattice series.
 *
 * WHY THIS PAGE EXISTS (rather than reusing edit.html?remote=control):
 * edit.html loads Monaco — a full desktop code editor — and its knob drawer is a
 * mouse-sized side panel. On a phone in a dark room that is unusable. This page is
 * the same transport (src/remote/RemoteController.js over the /ws vite plugin) with
 * a thumb-sized UI in front of it. No new protocol, no second server.
 *
 * WHY THESE PARAMS: precedence in index.js getCranesState() is
 *   audio < wavelet < controllerFeatures < url < manualFeatures < messageParams
 * messageParams (what the WebSocket writes) is HIGHEST, so a value sent from here
 * beats what lattice-nav computes every frame. That is why we can drive navZoom /
 * paletteShift / warpGrow live without touching a single shader or controller file.
 *
 * Every fader below is wired to a uniform the lattice shaders genuinely read —
 * verified against shaders/redaphid/chromadepth-lattice/{3,4,5,6}.frag and
 * shaders/redaphid/lattice-interactive/3.frag. No decorative knobs.
 */
import { initRemoteController } from './src/remote/RemoteController.js'

const $ = (id) => document.getElementById(id)

/* ── shaders worth having on stage ────────────────────────────────────────
   `nav` marks the ones that read navX/navY/navZoom (lattice 1 has no navigation),
   `full` marks the ones that also read paletteShift + warpGrow.               */
const SHADERS = [
    { path: 'redaphid/chromadepth-lattice/6', label: 'L6', sub: 'LIVING', ctrl: 'lattice-nav' },
    { path: 'redaphid/chromadepth-lattice/5', label: 'L5', sub: 'DRIFT', ctrl: 'lattice-nav' },
    { path: 'redaphid/chromadepth-lattice/4', label: 'L4', sub: 'PATHS', ctrl: 'lattice-nav' },
    { path: 'redaphid/lattice-interactive/3', label: 'HZN', sub: 'HORIZONS', ctrl: 'lattice-nav,lattice-controls' },
    { path: 'redaphid/chromadepth-lattice/3', label: 'L3', sub: 'COLOUR', ctrl: 'lattice-nav' },
    // The /vibej scratch copy. Deliberately NOT chromadepth-lattice/2: that one declares neither
    // paletteShift nor warpGrow, so COLOUR and WARP would be dead knobs on it — and a dial that
    // does nothing on stage is worse than no dial.
    { path: 'redaphid/wip/lattice-vj/1', label: 'VJ', sub: 'MUTATE', ctrl: 'lattice-nav' },
]

/* ── fader definitions ────────────────────────────────────────────────────
   curve 'exp' = geometric (zoom needs it: 0.05→8 linearly would be unusable). */
const LOOK = [
    { key: 'navZoom', label: 'ZOOM', min: 0.04, max: 8, def: 1, curve: 'exp', fmt: (v) => v.toFixed(2) + '×' },
    { key: 'navX', label: 'PAN X', min: -6, max: 6, def: 0, bipolar: true },
    { key: 'navY', label: 'PAN Y', min: -6, max: 6, def: 0, bipolar: true },
    { key: 'paletteShift', label: 'COLOUR', min: 0, max: 1, def: 0 },
    { key: 'warpGrow', label: 'WARP', min: 0, max: 2, def: 0 },
    { key: 'knob_1', label: 'PAN SPD', min: 0, max: 1, def: 0.21 },
]

const AUDIO = [
    { key: 'energySpring', label: 'GLOW', min: 0, max: 1, def: 0.4 },
    { key: 'waveletBassSpring', label: 'BASS', min: 0, max: 1, def: 0.3 },
    { key: 'waveletBand5Spring', label: 'LINES', min: 0, max: 1, def: 0.3 },
    { key: 'waveletBand2Spring', label: 'CELLS', min: 0, max: 1, def: 0.3 },
    { key: 'melodyFlow', label: 'HUE FLOW', min: 0, max: 1, def: 0.5 },
    { key: 'spectralCrestSmooth', label: 'SPARKLE', min: 0, max: 1, def: 0.3 },
]

const EXTRA = [
    { key: 'knob_2', label: 'SCHEME', min: 0, max: 1, def: 0 },
    { key: 'knob_3', label: 'CELL SIZE', min: 0, max: 1, def: 0 },
    { key: 'knob_4', label: 'TWIST', min: 0, max: 1, def: 0 },
    { key: 'knob_5', label: 'REACT', min: 0, max: 1, def: 0 },
]

const ALL = [...LOOK, ...AUDIO, ...EXTRA]
const byKey = Object.fromEntries(ALL.map((f) => [f.key, f]))

/* value <-> normalised position (0..1) */
const toValue = (f, t) =>
    f.curve === 'exp' ? f.min * Math.pow(f.max / f.min, t) : f.min + t * (f.max - f.min)
const toPos = (f, v) =>
    f.curve === 'exp'
        ? Math.log(v / f.min) / Math.log(f.max / f.min)
        : (v - f.min) / (f.max - f.min)
const fmt = (f, v) => (f.fmt ? f.fmt(v) : v.toFixed(2))

/* ── transport ────────────────────────────────────────────────────────── */
let displays = 0
const remote = initRemoteController((status, info) => {
    if (info && typeof info.connectedClients === 'number') {
        // the count includes this controller, so displays = clients - us
        displays = Math.max(0, info.connectedClients - 1)
    }
    paint(status)
})

const paint = (status) => {
    const dot = $('dot')
    const txt = $('status')
    dot.className = 'dot ' + (status === 'connected' ? (displays > 0 ? 'live' : 'wait') : 'dead')
    if (status !== 'connected') {
        txt.textContent = status === 'reconnecting' ? 'reconnecting…' : 'NO SERVER'
        return
    }
    txt.textContent = displays > 0
        ? `${displays} display${displays === 1 ? '' : 's'} live`
        : 'connected — open the display'
}

/* Outgoing values are coalesced to one send per animation frame. Dragging a
   fader fires pointermove far faster than 60Hz on a modern phone; without this
   we would flood the socket with redundant updates. */
let pending = null
let queued = false
const flush = () => {
    queued = false
    if (!pending) return
    remote.sendParams(pending)
    pending = null
}
const send = (obj) => {
    pending = Object.assign(pending || {}, obj)
    if (!queued) {
        queued = true
        requestAnimationFrame(flush)
    }
}

const buzz = (ms) => navigator.vibrate?.(ms)

/* ── fader widget ─────────────────────────────────────────────────────── */
const state = {}       // key -> current value
const overridden = {}  // key -> have we ever sent this? (i.e. is it pinned)
const els = {}

const buildFader = (f, host) => {
    const el = document.createElement('div')
    el.className = 'fader' + (f.bipolar ? ' bipolar' : '')
    el.innerHTML =
        '<div class="fill"></div><div class="flabel"></div><div class="fval"></div>'
    const fill = el.querySelector('.fill')
    const label = el.querySelector('.flabel')
    const val = el.querySelector('.fval')
    label.textContent = f.label

    state[f.key] = f.def
    els[f.key] = { el, fill, val }

    const draw = () => {
        const t = Math.min(1, Math.max(0, toPos(f, state[f.key])))
        fill.style.width = (t * 100).toFixed(2) + '%'
        val.textContent = fmt(f, state[f.key])
        el.classList.toggle('overridden', !!overridden[f.key])
    }
    draw()
    els[f.key].draw = draw

    /* RELATIVE dragging, deliberately: an absolute "tap jumps to value" fader is
       a liability in the dark — one stray thumb and the visual slams to an
       extreme in front of everyone. Here a touch changes nothing until it moves,
       and a full screen-width swipe covers the whole range. Double-tap resets. */
    let dragging = false
    let lastX = 0
    let moved = 0
    let lastTap = 0

    el.addEventListener('pointerdown', (e) => {
        dragging = true
        moved = 0
        lastX = e.clientX
        el.setPointerCapture(e.pointerId)
        el.classList.add('held')
    })

    el.addEventListener('pointermove', (e) => {
        if (!dragging) return
        const dx = e.clientX - lastX
        lastX = e.clientX
        moved += Math.abs(dx)
        const t = toPos(f, state[f.key]) + dx / el.clientWidth
        state[f.key] = toValue(f, Math.min(1, Math.max(0, t)))
        overridden[f.key] = true
        draw()
        send({ [f.key]: state[f.key] })
    })

    const up = (e) => {
        if (!dragging) return
        dragging = false
        el.classList.remove('held')
        try { el.releasePointerCapture(e.pointerId) } catch { }
        if (moved < 6) {
            const now = Date.now()
            if (now - lastTap < 350) {
                // double-tap → back to this fader's neutral value
                state[f.key] = f.def
                overridden[f.key] = true
                draw()
                send({ [f.key]: f.def })
                buzz(30)
            }
            lastTap = now
        }
    }
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)

    host.appendChild(el)
}

LOOK.forEach((f) => buildFader(f, $('faders-look')))
AUDIO.forEach((f) => buildFader(f, $('faders-audio')))
EXTRA.forEach((f) => buildFader(f, $('faders-extra')))

/* ── shader switching ─────────────────────────────────────────────────── */
let current = null
const shaderHost = $('shaders')
SHADERS.forEach((s) => {
    const b = document.createElement('button')
    b.className = 'sbtn'
    b.type = 'button'
    b.innerHTML = `${s.label}<small>${s.sub}</small>`
    b.addEventListener('click', () => {
        remote.sendShader(s.path)
        current = s.path
        ;[...shaderHost.children].forEach((c) => c.classList.remove('on'))
        b.classList.add('on')
        buzz(40)
    })
    shaderHost.appendChild(b)
})

/* ── take over / release the music-driven channels ────────────────────── */
let manual = false
$('manual-toggle').addEventListener('click', () => {
    manual = !manual
    $('manual-toggle').classList.toggle('on', manual)
    $('manual-toggle').textContent = manual ? 'HAND BACK' : 'TAKE OVER'
    $('faders-audio').classList.toggle('dim', !manual)
    $('audio-note').textContent = manual
        ? 'You own these now — the music is not touching them.'
        : 'The music is driving these. Hit TAKE OVER to grab them by hand.'
    if (manual) {
        // quietGate scales nearly every audio term in the lattice shaders; without
        // pinning it to 1 these faders would do nothing in a silent room.
        const payload = { quietGate: 1 }
        AUDIO.forEach((f) => {
            payload[f.key] = state[f.key]
            overridden[f.key] = true
            els[f.key].draw()
        })
        send(payload)
    } else {
        releaseKeys(['quietGate', ...AUDIO.map((f) => f.key)])
    }
    buzz(40)
})

/* Sending null tells RemoteDisplay to DELETE the key from messageParams, which
   hands the uniform back to the controller/audio pipeline instead of freezing it
   at whatever value we last pushed. */
const releaseKeys = (keys) => {
    const payload = {}
    keys.forEach((k) => {
        payload[k] = null
        if (byKey[k]) {
            overridden[k] = false
            els[k]?.draw()
        }
    })
    send(payload)
}

$('release').addEventListener('click', () => {
    releaseKeys(['quietGate', ...ALL.map((f) => f.key)])
    manual = false
    $('manual-toggle').classList.remove('on')
    $('manual-toggle').textContent = 'TAKE OVER'
    $('faders-audio').classList.add('dim')
    $('audio-note').textContent = 'The music is driving these. Hit TAKE OVER to grab them by hand.'
    buzz([30, 40, 30])
})

$('reset').addEventListener('click', () => {
    const payload = {}
    LOOK.concat(EXTRA).forEach((f) => {
        state[f.key] = f.def
        overridden[f.key] = true
        payload[f.key] = f.def
        els[f.key].draw()
    })
    send(payload)
    buzz([30, 40, 30])
})

/* ── keep the phone awake ─────────────────────────────────────────────────
   navigator.wakeLock is gated behind a SECURE CONTEXT. Over http://192.168.x.x
   (or any plain-http LAN address) the API is simply absent — not denied, absent.
   So we say so out loud rather than pretending it worked. */
let lock = null
const wakeBtn = $('wake')
const wakeSupported = 'wakeLock' in navigator
if (!wakeSupported) {
    wakeBtn.textContent = window.isSecureContext ? 'NO WAKE API' : 'HTTP: NO WAKE'
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
            wakeBtn.textContent = 'STAY AWAKE'
        } else {
            lock = await navigator.wakeLock.request('screen')
            lock.addEventListener('release', () => {
                lock = null
                wakeBtn.classList.remove('on')
                wakeBtn.textContent = 'STAY AWAKE'
            })
            wakeBtn.classList.add('on')
            wakeBtn.textContent = 'AWAKE'
        }
    } catch (e) {
        wakeBtn.textContent = 'WAKE FAILED'
    }
})

// Re-acquire after the phone is unlocked / the tab comes back.
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && wakeBtn.classList.contains('on') && !lock) {
        try { lock = await navigator.wakeLock.request('screen') } catch { }
    }
})

paint('reconnecting')

// handy for debugging from a desktop console / automation
window.vj = { state, send, remote, releaseKeys, els }
