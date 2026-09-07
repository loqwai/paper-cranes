/**
 * flyby — cinematic "zoom out, travel somewhere new, zoom back in" state machine.
 *
 * User ask (2026-08-19, live): "let's zoom out, fly slowly somewhere else, then zoom in.
 * Keep state via the controller so we keep going to new places."
 *
 * WHY A CONTROLLER: this is a phase machine with a memory of where it has already been. A shader
 * has neither — it is a pure function of time, so it can only produce something PERIODIC, which
 * would fly you back to the same places forever. The controller keeps the accumulated offset, so
 * every cycle departs from wherever the last one ended: the journey never repeats and never
 * returns to the start.
 *
 * CHAIN IT, DON'T WRAP IT (docs/controllers.md):
 *     ?controller=lattice-nav&controller=flyby
 * lattice-nav owns finger pan/pinch and emits navX/navY/navZoom; this stage runs AFTER it and adds
 * its own travel offset on top, so dragging still works during a flyby and the two compose instead
 * of fighting. URL order matters — flyby must come last.
 *
 * MOTION DISCIPLINE (the hard-won rules this shader is built on):
 * - Every phase is a ONE-WAY eased ramp (smoothstep), never a sine. The camera arrives and stays;
 *   it never rocks back. Zoom out and zoom in are separate legs of a cycle, not an oscillation —
 *   they bracket a MOVE, and the move is what makes them read as travel rather than pulsing.
 * - Travel happens only while WIDE. Panning at full magnification is what reads as "scrolling"
 *   (the vj2 iter-2 veto); at 4x out you read it as flying over a landscape instead.
 * - Rates are constant and audio-free. Audio may only choose WHEN a cycle starts (on a drop),
 *   never how fast the camera moves — a transient in a rate would lurch the frame.
 */
export function make(cranes) {
    const WIDE       = 0.24   // navZoom multiplier at the top of the arc (~4x more world on screen)
    const T_OUT      = 7.0    // s — pull back
    const T_TRAVEL   = 13.0   // s — cross the landscape while wide
    const T_IN       = 7.0    // s — settle into the new place
    const T_CRUISE   = 26.0   // s — hold still and let people look at it
    const HOP_MIN    = 0.22   // world units — ~3 screen-heights at cruise zoom
    const HOP_MAX    = 0.52   // ~7 screen-heights: far enough that the structure is genuinely new

    // Start the first cycle almost immediately — when you switch this on live you want to SEE it,
    // not wait out a full dwell. Subsequent cycles use the real dwell.
    let phase = 'cruise', t = T_CRUISE - 2.5
    let offX = 0, offY = 0                 // accumulated travel — never reset, so we keep going
    let fromX = 0, fromY = 0, toX = 0, toY = 0
    let heading = Math.random() * Math.PI * 2
    let lastSection = null
    let zoomF = 1

    const ease = x => x * x * (3 - 2 * x)   // smoothstep: zero velocity at both ends, no snap

    const pickDestination = () => {
        // Turn by a large-but-not-reversing angle each hop: the path wanders forward through the
        // lattice instead of ping-ponging between two spots. Never a full 180.
        heading += (Math.random() - 0.5) * 2.2
        const dist = HOP_MIN + Math.random() * (HOP_MAX - HOP_MIN)
        fromX = offX; fromY = offY
        toX = offX + Math.cos(heading) * dist
        toY = offY + Math.sin(heading) * dist
    }

    let lastT = performance.now() / 1000

    // ── SINGLE-OWNER GUARD ──
    // This controller is normally installed once via the URL chain. But when it is hot-injected into
    // a running page (live VJ session — re-chaining without a reload so the tab-audio share survives),
    // each injection wraps the CURRENT chain, so a second injection would STACK a second instance:
    // two state machines both adding travel offsets and fighting over the zoom. Each make() claims
    // ownership; any older instance still sitting in the chain sees it is no longer the owner and
    // becomes a pass-through, leaving the newest one in sole control.
    const myId = Symbol('flyby')
    if (typeof window !== 'undefined') window.__flybyOwner = myId
    const owns = () => typeof window === 'undefined' || window.__flybyOwner === myId

    return function flyby(features) {
        if (!owns()) return {}   // superseded by a newer instance — pass everything through untouched

        const now = performance.now() / 1000
        const dt = Math.min(0.05, now - lastT)
        lastT = now
        t += dt

        // A drop is a good moment to leave — but only once we've held the view a while, so a
        // busy track can't chain cycles back to back.
        // Manual launch from the console / VJ loop: window.__flybyGo() departs now.
        if (typeof window !== 'undefined' && window.__flybyGoRequested) {
            window.__flybyGoRequested = false
            if (phase === 'cruise') { phase = 'out'; t = 0; pickDestination() }
        }

        const section = features.sectionMode
        const dropped = lastSection !== null && section !== lastSection
        lastSection = section

        if (phase === 'cruise') {
            zoomF = 1
            if (t >= T_CRUISE || (dropped && t >= T_CRUISE * 0.45)) { phase = 'out'; t = 0; pickDestination() }
        } else if (phase === 'out') {
            zoomF = 1 + (WIDE - 1) * ease(Math.min(1, t / T_OUT))
            if (t >= T_OUT) { phase = 'travel'; t = 0 }
        } else if (phase === 'travel') {
            zoomF = WIDE
            const k = ease(Math.min(1, t / T_TRAVEL))
            offX = fromX + (toX - fromX) * k
            offY = fromY + (toY - fromY) * k
            if (t >= T_TRAVEL) { phase = 'in'; t = 0; offX = toX; offY = toY }
        } else if (phase === 'in') {
            zoomF = WIDE + (1 - WIDE) * ease(Math.min(1, t / T_IN))
            if (t >= T_IN) { phase = 'cruise'; t = 0 }
        }

        const navZoomPrev = (features.navZoom === undefined || features.navZoom < 0.01) ? 1 : features.navZoom
        return {
            navX: (features.navX || 0) + offX,
            navY: (features.navY || 0) + offY,
            navZoom: navZoomPrev * zoomF,
            // exposed for the shader / meter if it ever wants to know where we are in the arc
            flybyZoom: zoomF,
            flybyPhase: { cruise: 0, out: 1, travel: 2, in: 3 }[phase],
        }
    }
}
