// The vjpad half of the NFC show controls (docs/nfc-show-controls.md): the NFC chip, the scanner,
// and the fallback for a tag tapped while the vjpad is not on screen.
import CONFIG from '../../nfc-show-controls.json'
import { createNfcControls, resolveShow, idFromUrl } from './nfc-controls.js'

// setlists/<show>.json, when the build has them (the /show skill's setlists): NEXT/PREV walk the
// same beats the board bridge does. An empty object when the folder does not exist.
const SETLISTS = Object.fromEntries(
  Object.entries(import.meta.glob('../../setlists/*.json', { eager: true, import: 'default' }))
    .map(([path, json]) => [path.split('/').pop().replace(/\.json$/, ''), json]),
)

const HOME_KEY = 'cranes-nfc-home'
const SHOW_KEY = 'cranes-nfc-show'

const safe = (fn, fallback = null) => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

/**
 * A tag tapped while some other app is in front opens its URL, `/vjpad#nfc=s1`, in a new tab with
 * no room. Send that tab to the room this phone's vjpad last used, hash kept, and say so; the
 * caller fires the sticker once the socket is up. Returns true when the page is navigating away.
 */
const goHome = (loc, storage) => {
  const params = new URLSearchParams(loc.search)
  if (params.has('room')) {
    safe(() => storage.setItem(HOME_KEY, loc.search))
    return false
  }
  if (!idFromUrl(loc.href)) return false
  const home = safe(() => storage.getItem(HOME_KEY))
  if (!home) return false
  loc.replace(`${loc.pathname}${home}${loc.hash}`)
  return true
}

/**
 * client  the vjpad's WebSocketClient
 * buzz    the vjpad's buzz (vibrate after user activation)
 * chip    the header button that arms NFC
 * Returns { onMessage(msg), onStatus(status) } for the vjpad's socket handlers.
 */
export const mountVjpadNfc = ({ client, buzz, chip, loc = window.location, storage = window.localStorage, Reader = window.NDEFReader }) => {
  if (goHome(loc, storage)) return { onMessage: () => {}, onStatus: () => {} }

  const params = new URLSearchParams(loc.search)
  const asked = params.get('nfc_show')
  if (asked) safe(() => storage.setItem(SHOW_KEY, asked))
  const show = resolveShow(CONFIG, asked ?? safe(() => storage.getItem(SHOW_KEY)), SETLISTS)

  let flashTimer = null
  const paint = (text) => {
    clearTimeout(flashTimer)
    chip.textContent = text ?? (nfc.armed ? 'NFC ●' : 'NFC')
    chip.classList.toggle('on', nfc.armed)
    if (text) flashTimer = setTimeout(() => paint(), 1200)
  }

  const nfc = createNfcControls({
    show,
    Reader,
    storage: safe(() => storage, null),
    send: (m) => client.send(m.type, m.data, { via: m.via }),
    buzz,
    onFire: ({ kind, label }) => paint(kind === 'unknown' ? '?' : kind === 'offline' ? 'OFFLINE' : kind === 'empty' ? '—' : label),
  })

  const arm = () =>
    nfc.arm()
      .then(() => paint())
      .catch((e) => {
        chip.textContent = 'NFC ✕'
        chip.title = String(e?.message ?? e)
      })

  chip.hidden = false
  chip.title = nfc.supported ? `stickers: ${show.name}` : 'Web NFC needs Chrome on Android'
  if (!nfc.supported) chip.textContent = 'NFC ✕'
  else paint()
  chip.addEventListener('click', () => nfc.supported && arm())
  // Once granted, Chrome lets scan() start without a tap, so a reload comes back armed.
  if (nfc.supported) {
    navigator.permissions?.query({ name: 'nfc' })
      .then((p) => p.state === 'granted' && arm())
      .catch(() => {})
  }

  // The fallback tab: fire its sticker once, on the first connect, then forget it.
  let pending = idFromUrl(loc.href)
  const onStatus = (status) => {
    if (status !== 'connected' || !pending) return
    const id = pending
    pending = null
    history.replaceState(null, '', loc.pathname + loc.search)
    nfc.fire(id)
  }

  window.cranes = window.cranes || {}
  window.cranes.nfc = nfc
  return { onMessage: nfc.onMessage, onStatus }
}
