// PROJECT: put the wall on the external display, from one tap on the pad (docs/phone-wall.md).
//
// Two ways, tried in this order, both feature-detected because neither is documented for an
// Android phone on a USB-C cable:
//   1. the Presentation API, when Chrome reports a presentation display for the wall URL. The
//      wall runs as a presentation receiver and the PresentationConnection is the link.
//   2. a popup window, placed on the other screen when the Window Management API can name it
//      (getScreenDetails). The wall is then an ordinary same-origin window and the link is a
//      BroadcastChannel.
// A second screen is "seen" when either says so: presentation availability, or screen.isExtended.

// Params the wall inherits from the pad's own link: where the room is, and what the display loads
// and captures. The pad's knobs and shader travel over the link instead.
const PASS = ['room', 'relay', 'controller', 'image', 'audio', 'audio_file', 'audio_device', 'audio_time',
  'fft_size', 'smoothing', 'history_size', 'panic', 'vj', 'noaudio', 'hands_ms', 'release_ms', 'wavelet']

/**
 * The wall's URL for a pad at `loc`. `?wall_url=` on the pad (a same-origin path such as
 * `/show.html?shader=x`) replaces the default `/`; the result always says remote=display and wall=1.
 * A display secret on the pad's link rides along in the hash, where relay.js reads it.
 */
export const wallUrlFor = (loc, { shader } = {}) => {
  const params = new URLSearchParams(loc.search)
  const origin = `${loc.protocol}//${loc.host}`
  let url = new URL('/', origin)
  const custom = params.get('wall_url')
  if (custom) {
    try {
      const u = new URL(custom, origin)
      if (u.origin === origin) url = u
    } catch { /* keep the default */ }
  }
  for (const key of PASS) if (params.has(key) && !url.searchParams.has(key)) url.searchParams.set(key, params.get(key))
  if (shader && !url.searchParams.has('shader')) url.searchParams.set('shader', shader)
  url.searchParams.set('remote', 'display')
  url.searchParams.set('wall', '1')
  const secret = new URLSearchParams(String(loc.hash ?? '').replace(/^#/, '')).get('display_secret') || params.get('display_secret')
  if (secret) url.hash = new URLSearchParams({ display_secret: secret }).toString()
  return url.toString()
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((resolve) => setTimeout(() => resolve(null), ms))])

/**
 * Watches for a second screen and projects onto it.
 *   onScreen(present)      a second screen appeared or went away
 *   onConnection(conn)     a PresentationConnection to attach to the link
 */
export const createProjector = ({ wallUrl, onScreen, onConnection, win = globalThis.window } = {}) => {
  const scr = win?.screen
  const store = win?.sessionStorage
  let presentation = false
  let extended = false
  let request = null
  let wallWindow = null
  let last = null

  const emit = () => {
    const present = presentation || extended
    if (present === last) return
    last = present
    onScreen?.(present)
  }

  const watch = () => {
    if (scr && 'isExtended' in scr) {
      extended = Boolean(scr.isExtended)
      scr.addEventListener?.('change', () => { extended = Boolean(scr.isExtended); emit() })
    }
    if (typeof win?.PresentationRequest === 'function') {
      try {
        request = new win.PresentationRequest([wallUrl()])
        request.getAvailability()
          .then((availability) => {
            presentation = Boolean(availability.value)
            availability.addEventListener?.('change', () => { presentation = Boolean(availability.value); emit(); if (presentation) reconnect() })
            emit()
            if (presentation) reconnect()
          })
          .catch(() => { /* Chrome on Android answers NotSupported for a plain https URL: no presentation path */ })
      } catch { /* no presentation path */ }
    }
    emit()
  }

  // A presentation he started earlier (this tab) comes back without a tap when its display does.
  const reconnect = () => {
    const id = store?.getItem('cranes-wall-presentation')
    if (!id || !request?.reconnect) return
    request.reconnect(id).then((conn) => onConnection?.(conn)).catch(() => store.removeItem('cranes-wall-presentation'))
  }

  const otherScreen = async () => {
    if (!extended || typeof win.getScreenDetails !== 'function') return null
    // The permission prompt can outlive the tap's activation; a second tap then has the permission.
    const details = await withTimeout(win.getScreenDetails().catch(() => null), 1500)
    if (!details) return null
    return details.screens.find((s) => s !== details.currentScreen && !s.isInternal) ??
      details.screens.find((s) => s !== details.currentScreen) ?? null
  }

  /** Call from the tap. Resolves to 'presentation' or 'window'; throws when nothing opened. */
  const project = async () => {
    if (presentation && request) {
      const conn = await request.start()
      store?.setItem('cranes-wall-presentation', conn.id)
      onConnection?.(conn)
      return 'presentation'
    }
    const target = await otherScreen()
    const place = target ? `,left=${target.availLeft},top=${target.availTop},width=${target.availWidth},height=${target.availHeight}` : ''
    wallWindow = win.open(wallUrl(), 'cranes-wall', `popup${place}`)
    if (!wallWindow) throw new Error('the browser blocked the wall window')
    return 'window'
  }

  watch()
  return { project, get present() { return Boolean(last) }, get wallWindow() { return wallWindow } }
}
