// The vjpad half of the NFC show controls (docs/nfc-show-controls.md): the NFC chip, the scanner,
// and the fallback for a tag tapped while the vjpad is not on screen.
import CONFIG from '../../nfc-show-controls.json'
import { createNfcControls, resolveShow, idFromUrl } from './nfc-controls.js'
import { SECRET_PARAM } from '../remote/relay.js'

// setlists/<show>.json, when the build has them (the /show skill's setlists): NEXT/PREV walk the
// same beats the board bridge does. An empty object when the folder does not exist.
const SETLISTS = Object.fromEntries(
  Object.entries(import.meta.glob('../../setlists/*.json', { eager: true, import: 'default' }))
    .map(([path, json]) => [path.split('/').pop().replace(/\.json$/, ''), json]),
)

const HOME_KEY = 'cranes-nfc-home'
// How long a roomless fallback tab waits for a phone wall's local link before dropping its sticker.
const WALL_WAIT_MS = 4000
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
 * no room. Send that tab to the room this phone's vjpad last used, hash kept; the caller asks for
 * one tap before it fires (confirmFallback). Returns true when the page is navigating away.
 */
const goHome = (loc, storage) => {
  const params = new URLSearchParams(loc.search)
  if (params.has('room')) {
    // The display secret (docs/vj-mcp.md) belongs to a display link, never a pad's; if one rode in
    // on this URL it is not copied into storage.
    params.delete(SECRET_PARAM)
    safe(() => storage.setItem(HOME_KEY, `?${params}`))
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

  // The fallback tab fires its sticker once, and only after one tap on this page. Without the tap,
  // any web page, QR code or message link that opens /vjpad#nfc=s2 on this phone would fire PANIC
  // in the remembered room with no intent behind it: Android's tag dispatch and a link click look
  // the same to the page, and neither is a user gesture it can see. The hash goes at once, so a
  // reload or the history never fires it again.
  let pending = idFromUrl(loc.href)
  let confirmed = false
  const fireIfReady = () => {
    if (!pending || !confirmed || !client.isConnected) return
    const id = pending
    pending = null
    nfc.fire(id)
  }
  if (pending) history.replaceState(null, '', loc.pathname + loc.search)
  const ask = () => confirmFallback({
    label: show.stickers[pending]?.label ?? pending,
    onYes: () => { confirmed = true; fireIfReady() },
    onNo: () => { pending = null },
  })
  // No room: the one place this tab can still reach is a phone wall on this same phone
  // (docs/phone-wall.md), whose local link answers within about a second. Ask only once it has.
  // Otherwise (a stranger's phone, or one that never opened a vjpad with one) there is nothing to
  // ask about, and the sticker is dropped.
  let awaitingWall = false
  if (pending && !params.has('room')) {
    awaitingWall = true
    setTimeout(() => { if (awaitingWall) { awaitingWall = false; pending = null } }, WALL_WAIT_MS)
  } else if (pending) ask()
  const onStatus = (status) => {
    if (status !== 'connected') return
    if (awaitingWall && client.link?.linked) { awaitingWall = false; ask() }
    fireIfReady()
  }
  // A wall can link after the room socket already reported connected (dev server), which reports
  // no new status; hear the wall itself too.
  client.onWalls?.((walls) => { if (walls.length) onStatus('connected') })

  window.cranes = window.cranes || {}
  window.cranes.nfc = nfc
  return { onMessage: nfc.onMessage, onStatus }
}

// The fallback's one tap: a full-screen card, a big SEND and a small cancel. It goes away by itself
// after CONFIRM_MS, because a tap that late no longer means the moment it was for.
const CONFIRM_MS = 20000
const confirmFallback = ({ label, onYes, onNo, doc = document }) => {
  const wrap = doc.createElement('div')
  wrap.id = 'nfc-confirm'
  wrap.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:16px;font:600 18px system-ui,sans-serif;color:#fff;text-align:center'
  const yes = doc.createElement('button')
  yes.id = 'nfc-confirm-yes'
  yes.type = 'button'
  yes.textContent = `SEND ${label}`
  yes.style.cssText = 'width:min(90vw,420px);min-height:40vh;border-radius:24px;border:3px solid #ffd43b;background:#2a2410;color:#ffd43b;font:800 44px system-ui,sans-serif'
  const where = doc.createElement('div')
  // No room name here: the room is the control surface's password, and this is a lit screen in a crowd.
  where.textContent = 'a sticker or a link opened this tab'
  where.style.cssText = 'opacity:.7;font-size:14px'
  const no = doc.createElement('button')
  no.id = 'nfc-confirm-no'
  no.type = 'button'
  no.textContent = 'cancel'
  no.style.cssText = 'padding:12px 28px;border-radius:12px;border:1px solid #555;background:none;color:#aaa;font-size:16px'
  const close = () => { clearTimeout(timer); wrap.remove() }
  const timer = setTimeout(() => { close(); onNo() }, CONFIRM_MS)
  yes.addEventListener('click', () => { close(); onYes() }, { once: true })
  no.addEventListener('click', () => { close(); onNo() }, { once: true })
  wrap.append(where, yes, no)
  doc.body.appendChild(wrap)
}
