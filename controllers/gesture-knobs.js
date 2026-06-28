/**
 * gesture-knobs — turn KNOBS with a large variety of MOBILE gestures.
 *
 * Load with: ?controller=gesture-knobs   (works on any knob-driven shader)
 *
 * A live performance surface: it listens to multi-touch and maps gestures onto knob_1..knob_11,
 * TURNING them relative (like physical knobs) — they accumulate and clamp to 0..1. Knobs are set
 * via cranes.updateFeature (the same path MIDI uses), so they behave exactly like any other knob
 * (read them in your shader as `uniform float knob_1;` etc.). Presets are respected: any knob_N
 * set in the URL seeds that knob, then gestures turn it from there.
 *
 * It also composes wavelet-ease (static import + merge), so audio-reactive shaders still get their
 * features — load this INSTEAD of wavelet-ease and you get audio + gestures together.
 *
 * ── GESTURE → KNOB MAP ───────────────────────────────────────────────────────────────────────
 *   1 finger  drag        → knob_1 (left/right)   + knob_2 (up/down)
 *   2 fingers pinch       → knob_3                (spread = up, squeeze = down)
 *   2 fingers twist       → knob_4                (rotate cw = up)
 *   2 fingers drag        → knob_5 (left/right)   + knob_6 (up/down)
 *   3 fingers drag        → knob_7 (left/right)   + knob_8 (up/down)
 *   single tap            → knob_9   steps +1/8 each tap (wraps 1→0)
 *   double tap            → knob_10  toggles 0 / 1
 *   2 finger tap          → knob_11  toggles 0 / 1
 *   hold ~0.5s then drag  → FINE MODE: every gesture above moves ~8x slower for precise tweaks
 * ──────────────────────────────────────────────────────────────────────────────────────────────
 */
import { make as makeWaveletEase } from './wavelet-ease.js'

export function make(cranes) {
    const audio = makeWaveletEase(cranes)
    const clamp01 = v => Math.min(1, Math.max(0, v))
    const knob = {}
    const get = n => (n in knob) ? knob[n] : 0.5
    const set = (n, v) => { knob[n] = clamp01(v); cranes.updateFeature('knob_' + n, knob[n]) }
    const turn = (n, dv) => set(n, get(n) + dv)

    // sensitivities (all positions are normalised 0..1, so a full-screen swipe ≈ a full knob sweep)
    const DRAG = 0.8, PINCH = 1.6, TWIST = 1.0 / Math.PI, PAN2 = 0.9, PAN3 = 1.1
    let fine = 1.0, longTimer = null

    const pts = new Map()           // pointerId -> {x,y}
    let last2 = null, last3 = null  // previous 2-/3-finger reductions
    let gStart = 0, gMaxN = 0, gMoved = 0, lastTap = 0   // gesture-session bookkeeping (for taps)

    const N = (cx, cy) => [cx / innerWidth, cy / innerHeight]
    const arr = () => [...pts.values()]
    const cen = (a, k) => a.reduce((s, p) => s + p[k], 0) / a.length
    const pair = a => {
        const dx = a[1].x - a[0].x, dy = a[1].y - a[0].y
        return { d: Math.hypot(dx, dy), a: Math.atan2(dy, dx), x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }
    }

    const down = (id, x, y) => {
        if (pts.size === 0) {
            gStart = performance.now(); gMaxN = 0; gMoved = 0
            clearTimeout(longTimer); longTimer = setTimeout(() => { fine = 0.12 }, 500)   // hold → fine mode
        }
        pts.set(id, { x, y })
        gMaxN = Math.max(gMaxN, pts.size)
        if (pts.size === 2) last2 = pair(arr())
        if (pts.size === 3) { const a = arr(); last3 = { x: cen(a, 'x'), y: cen(a, 'y') } }
    }

    const move = (id, x, y) => {
        const p = pts.get(id); if (!p) return
        gMoved += Math.hypot(x - p.x, y - p.y)
        const n = pts.size
        if (n === 1) {                                   // ── 1 finger → knob_1 (x) + knob_2 (y)
            turn(1, (x - p.x) * DRAG * fine)
            turn(2, -(y - p.y) * DRAG * fine)
        } else if (n === 2) {                            // ── 2 fingers → pinch/twist/pan
            const c = pair(arr())
            if (last2) {
                turn(3, (c.d - last2.d) * PINCH * fine)                                  // pinch → knob_3
                let da = c.a - last2.a; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI
                turn(4, da * TWIST * fine)                                               // twist → knob_4
                turn(5, (c.x - last2.x) * PAN2 * fine)                                   // 2-pan x → knob_5
                turn(6, -(c.y - last2.y) * PAN2 * fine)                                  // 2-pan y → knob_6
            }
            last2 = c
        } else if (n >= 3) {                             // ── 3 fingers → knob_7 (x) + knob_8 (y)
            const a = arr(), cx = cen(a, 'x'), cy = cen(a, 'y')
            if (last3) { turn(7, (cx - last3.x) * PAN3 * fine); turn(8, -(cy - last3.y) * PAN3 * fine) }
            last3 = { x: cx, y: cy }
        }
        pts.set(id, { x, y })
    }

    const up = id => {
        pts.delete(id)
        if (pts.size < 2) last2 = null
        if (pts.size < 3) last3 = null
        if (pts.size === 0) {
            clearTimeout(longTimer)
            const dt = performance.now() - gStart
            if (dt < 260 && gMoved < 0.04) {             // a TAP (short, barely moved)
                if (gMaxN === 1) {
                    const now = performance.now()
                    if (now - lastTap < 320) { set(10, get(10) < 0.5 ? 1 : 0); lastTap = 0 }       // double tap → knob_10
                    else { let v = get(9) + 0.125; if (v > 1.001) v = 0.0; set(9, v); lastTap = now } // single tap → knob_9 step
                } else if (gMaxN === 2) { set(11, get(11) < 0.5 ? 1 : 0) }                          // 2-finger tap → knob_11
            }
            fine = 1.0
        }
    }

    if (typeof window !== 'undefined') {
        const tp = e => { for (const t of e.changedTouches) { const [x, y] = N(t.clientX, t.clientY); down(t.identifier, x, y) } e.preventDefault() }
        const tm = e => { for (const t of e.changedTouches) { const [x, y] = N(t.clientX, t.clientY); move(t.identifier, x, y) } e.preventDefault() }
        const te = e => { for (const t of e.changedTouches) up(t.identifier) }
        addEventListener('touchstart', tp, { passive: false })
        addEventListener('touchmove', tm, { passive: false })
        addEventListener('touchend', te, { passive: false })
        addEventListener('touchcancel', te, { passive: false })
        // mouse fallback (desktop / testing) — 1-finger drag + tap
        addEventListener('mousedown', e => { const [x, y] = N(e.clientX, e.clientY); down('m', x, y) })
        addEventListener('mousemove', e => { if (e.buttons & 1) { const [x, y] = N(e.clientX, e.clientY); move('m', x, y) } })
        addEventListener('mouseup', () => up('m'))
    }

    let seeded = false
    return function controller(features) {
        // seed knob state from any preset/URL knob values on the first frame (respect presets)
        if (!seeded) { seeded = true; for (let n = 1; n <= 11; n++) { const v = features['knob_' + n]; if (typeof v === 'number') knob[n] = v } }
        return audio(features) || {}
    }
}
