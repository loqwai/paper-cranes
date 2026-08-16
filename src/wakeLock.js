/**
 * Keep the screen awake while a shader is on screen.
 *
 * This is a live-performance tool: the phone gets propped on a speaker or handed
 * around a room, and nobody is touching it. When the screen sleeps mid-set the
 * visual dies in front of people, so holding the lock for as long as a shader is
 * rendering is the whole point.
 *
 * The lock is best-effort and silent by design. Screen Wake Lock needs a secure
 * context, is absent on older WebViews and on iOS below 16.4, and `request()`
 * rejects outright when the page is hidden, when the OS is in battery saver, or
 * (on some browsers) before any user gesture. None of that may break the visual:
 * the worst case is exactly today's behaviour, a screen that sleeps.
 *
 * Two things make this more than a one-shot `navigator.wakeLock.request()`:
 *
 * - The browser silently releases the lock every time the page is hidden. Without
 *   re-acquiring on `visibilitychange` the lock is gone for good the first time he
 *   checks a message and comes back — the shader is still running, the screen is
 *   no longer held, and nothing anywhere reports a problem.
 * - Some browsers refuse the request until a user has interacted with the page.
 *   This app starts a shader with no gesture at all, so a denial at load is
 *   expected; we retry on the first interaction instead of giving up.
 */

const noop = () => {}

/** Returned when the API is unavailable, so callers never branch on support. */
const inertHandle = { release: noop, get active() { return false } }

/** Interactions that count as the user activation some browsers demand. */
const gestureEvents = ['pointerdown', 'keydown', 'touchend']

/**
 * Hold a screen wake lock for as long as the returned handle is unreleased,
 * re-acquiring after the page returns to the foreground.
 *
 * @returns {{ release: () => void, active: boolean }} `active` reports whether a
 *   sentinel is held right now — the only honest way to check, since a request
 *   that was denied looks identical to one that was never made.
 */
export const keepScreenAwake = () => {
    if (typeof navigator === 'undefined' || typeof document === 'undefined') return inertHandle
    // `in` rather than a truthiness check: absent on old WebViews, iOS < 16.4 and
    // on any insecure origin, including plain-http localhost dev.
    if (!('wakeLock' in navigator)) return inertHandle

    let sentinel = null
    let pending = false
    let done = false

    const acquire = () => {
        if (done || sentinel || pending) return
        // Requesting while hidden always rejects; skip it rather than make noise.
        if (document.visibilityState !== 'visible') return
        pending = true
        try {
            navigator.wakeLock.request('screen').then(
                (s) => {
                    pending = false
                    // Released while the request was in flight — don't leak the lock.
                    if (done) return s.release().catch(noop)
                    sentinel = s
                    // Covers releases we did not ask for (backgrounding, OS policy)
                    // so `sentinel` never goes stale and blocks a later re-acquire.
                    s.addEventListener('release', () => {
                        if (sentinel === s) sentinel = null
                    })
                },
                () => {
                    // Denied: battery saver, hidden page, or no user activation yet.
                    // A gesture may still rescue it. The shader plays on regardless.
                    pending = false
                    sentinel = null
                },
            )
        } catch {
            // A non-conforming WebView can throw synchronously instead of
            // rejecting. Same answer: the screen may sleep, the visual survives.
            pending = false
            sentinel = null
        }
    }

    const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') return acquire()
        // Going hidden ALWAYS costs us the lock. Drop the reference now rather than
        // waiting for the `release` event: if that event were ever missed we would
        // hold a dead sentinel and never re-acquire, which is the exact bug this
        // whole module exists to prevent.
        sentinel = null
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    // Kept live rather than `once`: the first gesture can land while hidden, or be
    // denied again. `acquire()` is a cheap no-op once a sentinel is held.
    for (const event of gestureEvents) document.addEventListener(event, acquire, { passive: true })

    acquire()

    return {
        get active() {
            return sentinel !== null
        },
        release() {
            if (done) return
            done = true
            document.removeEventListener('visibilitychange', onVisibilityChange)
            for (const event of gestureEvents) document.removeEventListener(event, acquire)
            const s = sentinel
            sentinel = null
            if (s) s.release().catch(noop)
        },
    }
}
