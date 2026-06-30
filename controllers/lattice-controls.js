/**
 * lattice-controls — the CONTROL NODES at the tendrils' far ends. Pairs with
 * redaphid/wip/lattice-interactive/2. CHAIN it AFTER lattice-nav:
 *   ?controller=lattice-nav&controller=lattice-controls
 *
 * Four control nodes sit at fixed world positions out from home (0,0). Each is a DIAL bound to a knob
 * (knob_2..5). Circle a finger around a node to TURN it — relative angular accumulation, one full turn
 * = the full 0..1 range — which drives that knob, and the shader changes OBVIOUSLY (palette /
 * structure / motion / audio reactivity). We feed the node positions + which one is grabbed back to
 * the shader so it can draw the dials and bloom the one you're turning.
 *
 * WHY A CONTROLLER (not shader-only): a shader can't hold the dial's accumulated value, read touch,
 * set knobs, or decide "this touch is a dial-turn, not a pan." We intercept touches in the CAPTURE
 * phase so grabbing a node stops the event before lattice-nav's (bubble-phase) pan listener ever sees
 * it — node-touch turns the dial, empty-space touch falls through to pan. lattice-nav stays unmodified.
 */

const TAU = Math.PI * 2
const N = 4
const KNOB = [2, 3, 4, 5]      // node i → knob_(KNOB[i]): one event-horizon distortion flavour each
const GRAB_R = 0.04            // world radius within which a touch grabs a node
const VIEW = 0.07              // matches the shader's `uv *= 0.07`

export function make(cranes) {
    const clamp01 = v => Math.min(1, Math.max(0, v))
    let nodes = null                          // [{x, y, knob}]
    let val = {}                              // knob number → current value (so the dial accumulates)
    let nav = { x: 0, y: 0, zoom: 1 }         // latest nav, stashed each frame for the touch handlers
    let grabbed = -1, lastAngle = 0

    // SCATTERED far apart in jittered directions/distances — controls are FOUND by exploring, not
    // clustered around home. (Their long tendrils, drawn shader-side, don't touch the origin.)
    const build = seed => Array.from({ length: N }, (_, i) => {
        const ang = (i / N) * TAU + seed * TAU + 0.7 * Math.sin(seed * 50.3 + i * 2.1)
        const dist = 0.7 + 0.9 * (0.5 + 0.5 * Math.sin(seed * 91.7 + i * 7.3))   // 0.7 … 1.6 world out
        return { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, knob: KNOB[i] }
    })

    // screen point → world, matching 2.frag's mapping exactly (no orbital drift → exact hit-testing)
    const toWorld = (cx, cy) => {
        const z = nav.zoom < 0.01 ? 1 : nav.zoom
        const uvx = (cx / innerWidth - 0.5) * (innerWidth / innerHeight)
        const uvy = 0.5 - cy / innerHeight
        return { x: nav.x + uvx * VIEW / z, y: nav.y + uvy * VIEW / z }
    }
    const pt = e => { const t = e.touches && e.touches[0] ? e.touches[0] : e; return [t.clientX, t.clientY] }

    const onStart = e => {
        if (!nodes) return
        const [cx, cy] = pt(e)
        const w = toWorld(cx, cy)
        let best = -1, bestD = GRAB_R
        nodes.forEach((n, i) => { const d = Math.hypot(w.x - n.x, w.y - n.y); if (d < bestD) { bestD = d; best = i } })
        if (best < 0) return                                  // empty space → let lattice-nav pan
        grabbed = best
        lastAngle = Math.atan2(w.y - nodes[best].y, w.x - nodes[best].x)
        e.stopPropagation(); e.preventDefault && e.preventDefault()
    }
    const onMove = e => {
        if (grabbed < 0 || !nodes) return
        const [cx, cy] = pt(e)
        const w = toWorld(cx, cy)
        const n = nodes[grabbed]
        const ang = Math.atan2(w.y - n.y, w.x - n.x)
        let da = ang - lastAngle
        if (da > Math.PI) da -= TAU
        if (da < -Math.PI) da += TAU
        lastAngle = ang
        // screen Y is flipped vs world, so negate → CLOCKWISE finger = value UP (physical-knob feel)
        val[n.knob] = clamp01((val[n.knob] ?? 0) - da / TAU)  // one full turn = full range
        cranes.updateFeature('knob_' + n.knob, val[n.knob])
        e.stopPropagation(); e.preventDefault && e.preventDefault()
    }
    const onEnd = e => { if (grabbed >= 0) { grabbed = -1; e.stopPropagation() } }

    if (typeof window !== 'undefined' && window.addEventListener) {
        const C = { capture: true, passive: false }          // CAPTURE → runs before lattice-nav's listeners
        addEventListener('touchstart', onStart, C)
        addEventListener('touchmove', onMove, C)
        addEventListener('touchend', onEnd, C)
        addEventListener('touchcancel', onEnd, C)
        addEventListener('mousedown', onStart, true)
        addEventListener('mousemove', e => { if (grabbed >= 0 && (e.buttons & 1)) onMove(e) }, true)
        addEventListener('mouseup', onEnd, true)
    }

    return function controller(features) {
        nav = { x: features.navX ?? 0, y: features.navY ?? 0, zoom: features.navZoom ?? 1 }
        if (!nodes) {
            nodes = build(features.seed ?? 0.5)
            nodes.forEach(n => {                              // seed dial values from any preset/URL knob
                val[n.knob] = typeof features['knob_' + n.knob] === 'number' ? features['knob_' + n.knob] : 0
            })
        }
        const out = {}
        nodes.forEach((n, i) => { out['ctrl' + i + 'X'] = n.x; out['ctrl' + i + 'Y'] = n.y })
        out.ctrlGrab = grabbed
        return out
    }
}
