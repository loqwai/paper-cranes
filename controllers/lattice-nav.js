/**
 * lattice-nav — COMPOSITE controller: wavelet-ease audio + finger navigation (pan + pinch-zoom).
 *
 * Load with: ?controller=lattice-nav&wavelet=true   (pairs with redaphid/chromadepth-lattice/2)
 *
 * Demonstrates controller COMPOSITION. A controller is just an ES module; we pull in another
 * controller's make() with a STATIC top-level import and our per-frame function MERGES its
 * output with our own:  return { ...waveletEase(f), navX, navY, navZoom }.
 *   (Static, not dynamic import(): the harness calls make() synchronously and does NOT await it,
 *    so make() must return the per-frame function immediately — a static import is already
 *    resolved by load time.)
 *
 * WHY A CONTROLLER (not shader-only): navigation needs STATE. A stateless shader can only do an
 * ABSOLUTE touch→position map (snaps to your finger, resets on release). Here we accumulate a
 * world position from drag DELTAS so it NEVER snaps back, glide with momentum after release, and
 * read MULTI-TOUCH for pinch-zoom (which index.js's single-touch coords can't see). We attach our
 * own listeners so the controller fully owns navigation. Exposes navX / navY / navZoom.
 */
import { make as makeWaveletEase } from './wavelet-ease.js'

export function make(cranes) {
    const audio = makeWaveletEase(cranes)   // the per-frame wavelet-ease function

    // ── navigation state (what the shader can't hold) ──
    let navX = 0, navY = 0          // accumulated world position — never resets (no snap-back)
    let velX = 0, velY = 0          // momentum, for a glide after release
    let zoom = 1.0                  // multiplicative zoom (1 = default; >1 zoomed in)
    let lastX = 0, lastY = 0        // previous finger position (0..1)
    let pinchDist0 = 0, pinchZoom0 = 1
    let mode = 0                    // 0 idle · 1 pan · 2 pinch
    const SPEED = 1.0, FRICTION = 0.90, ZMIN = 0.012, ZMAX = 12.0   // lower SPEED = calmer pan; tiny ZMIN = keep zooming out

    const xy = e => { const t = e.touches ? e.touches[0] : e; return [t.clientX / innerWidth, t.clientY / innerHeight] }
    const pinch = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                                  e.touches[0].clientY - e.touches[1].clientY)

    const start = e => {
        if (e.touches && e.touches.length >= 2) { mode = 2; pinchDist0 = pinch(e); pinchZoom0 = zoom }
        else { mode = 1; const p = xy(e); lastX = p[0]; lastY = p[1]; velX = velY = 0 }
    }
    const move = e => {
        if (mode === 2 && e.touches && e.touches.length >= 2) {
            if (pinchDist0 > 0) zoom = Math.min(ZMAX, Math.max(ZMIN, pinchZoom0 * (pinch(e) / pinchDist0)))
            e.preventDefault && e.preventDefault(); return
        }
        if (mode !== 1) return
        const p = xy(e), dx = p[0] - lastX, dy = p[1] - lastY
        // Map-drag: grab the lattice and pull it with your finger (content follows the finger).
        // Divided by zoom so pan speed stays consistent in screen space at any zoom.
        navX -= dx * SPEED / zoom
        navY += dy * SPEED / zoom
        velX = -dx * SPEED / zoom; velY = dy * SPEED / zoom
        lastX = p[0]; lastY = p[1]
        e.preventDefault && e.preventDefault()
    }
    const end = e => {
        if (e.touches && e.touches.length === 1) { mode = 1; const p = xy(e); lastX = p[0]; lastY = p[1] }
        else if (!e.touches || e.touches.length === 0) mode = 0
    }
    const wheel = e => { zoom = Math.min(ZMAX, Math.max(ZMIN, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1))); e.preventDefault && e.preventDefault() }

    if (typeof window !== 'undefined' && window.addEventListener) {
        addEventListener('touchstart', start, { passive: false })
        addEventListener('touchmove', move, { passive: false })
        addEventListener('touchend', end, { passive: false })
        addEventListener('mousedown', start)
        addEventListener('mousemove', e => { if (mode === 1 && (e.buttons & 1)) move(e) })
        addEventListener('mouseup', () => { mode = 0 })
        addEventListener('wheel', wheel, { passive: false })
    }

    return function controller(features) {
        const out = audio(features) || {}
        if (mode === 0 && (velX || velY)) {           // glide after release, easing to a stop
            navX += velX; velX *= FRICTION
            navY += velY; velY *= FRICTION
            if (Math.abs(velX) < 1e-4) velX = 0
            if (Math.abs(velY) < 1e-4) velY = 0
        }
        out.navX = navX; out.navY = navY; out.navZoom = zoom
        return out
    }
}
