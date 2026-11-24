// The pad half of the phone wall (docs/phone-wall.md). Two parts:
//   createPadClient  a WebSocketClient-shaped client: the room socket as before, plus the local
//                    link to a wall on this same phone. While a wall is linked, display-bound
//                    messages go to it over the link and to the room as well, tagged `pwid`, so
//                    other displays in the room still get them and the wall acts on each once.
//   mountPhoneWall   the PROJECT button, the WALL chip and the NO WALL banner, driven by state.js.
import { WebSocketClient } from '../remote/WebSocketClient.js'
import { createLink } from './link.js'
import { initialWall, stepWall, wallView } from './state.js'
import { createProjector, wallUrlFor } from './project.js'

// Messages a display acts on. pad-hello goes both ways: the wall counts the pad, and so does a
// room display. Everything else (vjpad-peer bank claims) is between pads, on the room only.
// wall.js FROM_PAD must accept exactly these (link.test.js holds the two together).
export const TO_WALL = new Set(['update-params', 'vj-keep', 'vj-panic', 'proposal-answer'])
export const TO_BOTH = new Set(['pad-hello'])

/**
 * The room socket is opened only where there is a broker, as on the wall (wall.js): a `?room=`
 * link, or the dev server. On a static host with no room a socket would retry `/ws` forever, a
 * console error every few seconds for the whole show.
 */
export const createPadClient = (onMessage, onStatus, { dev = false, loc = globalThis.location, makeSocket, BroadcastChannel } = {}) => {
  const wantsSocket = new URLSearchParams(loc?.search ?? '').has('room') || dev
  let socketStatus = wantsSocket ? 'reconnecting' : 'disconnected'
  let reported = null
  let sent = 0
  const listeners = new Set()
  const report = () => {
    const effective = link.linked ? 'connected' : socketStatus
    if (effective === reported) return
    reported = effective
    onStatus?.(effective)
  }
  const link = createLink({
    role: 'pad',
    onMessage,
    ...(BroadcastChannel ? { BroadcastChannel } : {}),
    onPeers: (walls) => { report(); listeners.forEach((fn) => fn(walls)) },
  })
  const socket = wantsSocket ? (makeSocket ?? ((m, s) => new WebSocketClient(m, s)))(onMessage, (s) => { socketStatus = s; report() }) : null
  // Say bye on the way out, so the wall drops this pad at once; come back from the back-forward
  // cache (DIALS and back) linked again.
  globalThis.addEventListener?.('pagehide', () => link.stop())
  globalThis.addEventListener?.('pageshow', (e) => { if (e.persisted) link.start() })

  return {
    link,
    /** Subscribe to the set of walls on the link changing; returns the unsubscribe. */
    onWalls(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    connect() {
      link.start()
      socket?.connect()
    },
    send(type, data, extra) {
      if (!link.linked || !(TO_WALL.has(type) || TO_BOTH.has(type))) return Boolean(socket?.send(type, data, extra))
      // The link first, so the wall's hop never waits on the network. The room gets the same
      // message, so a second display there is not starved; the wall hears both and acts once.
      const tagged = { ...extra, pwid: `${link.id}.${++sent}` }
      const local = link.send({ ...tagged, type, data })
      return Boolean(socket?.isConnected && socket.send(type, data, tagged)) || local
    },
    disconnect() {
      link.stop()
      socket?.disconnect()
    },
    get isConnected() { return Boolean(socket?.isConnected || link.linked) },
    get socket() { return socket?.socket ?? null },
    get url() { return socket?.url },
  }
}

/**
 * The wall controls on the pad. Draws nothing until a second screen or a wall shows up, so a phone
 * with no external display looks exactly as it did.
 *   host         element to draw into (hidden while there is nothing to say)
 *   getShader    the shader the pad is pointed at (a wall opened with none takes it)
 *   getState     the pad's current values, resent to every fresh wall
 *   onProject    called inside the PROJECT tap (wake lock, buzz)
 */
export const mountPhoneWall = ({ client, host, getShader, getState, onProject, onChange, loc = window.location, win = window }) => {
  let s = initialWall
  const fed = new Set() // wall boot ids already given the pad's state

  const wallUrl = () => wallUrlFor(loc, { shader: getShader?.() })
  const dispatch = (event) => {
    const next = stepWall(s, event)
    if (next === s) return
    s = next
    paint()
    onChange?.(s)
  }

  const feed = (walls) => {
    for (const w of walls) {
      const boot = w.info?.boot
      if (!boot || fed.has(boot)) continue
      fed.add(boot)
      // A wall another pad page already moved keeps its look (wall.js `fresh`).
      if (w.info?.fresh === false) continue
      const shader = w.info?.wantsShader ? getShader?.() : null
      const payload = { ...(shader ? { shader } : {}), ...(getState?.() ?? {}) }
      if (Object.keys(payload).length) client.send('update-params', payload)
    }
  }

  client.onWalls((walls) => {
    if (walls.length) {
      dispatch({ type: 'linked', via: walls[0].via })
      feed(walls)
    } else {
      dispatch({ type: 'unlinked' })
    }
  })

  const project = async () => {
    dispatch({ type: 'project' })
    onProject?.()
    try {
      await projector.project()
      // The window or presentation is open; `linked` arrives with the wall's first hello.
      setTimeout(() => { if (s.state === 'connecting') dispatch({ type: 'failed' }) }, 15000)
    } catch (e) {
      console.warn('[phone-wall] PROJECT failed:', e)
      dispatch({ type: 'failed' })
    }
  }

  const paint = () => {
    if (!host) return
    const v = wallView(s)
    host.hidden = !v.chip && !v.project
    host.className = `wallbar ${s.state}`
    host.replaceChildren()
    if (v.chip) {
      const chip = document.createElement('span')
      chip.className = 'wallchip'
      chip.textContent = v.chip
      host.append(chip)
    }
    if (v.project) {
      const b = document.createElement('button')
      b.type = 'button'
      b.id = 'project'
      b.className = 'bigbtn project'
      b.innerHTML = 'PROJECT<small>visuals to the big screen</small>'
      b.addEventListener('click', project)
      host.append(b)
    }
    if (v.banner) {
      const x = document.createElement('button')
      x.type = 'button'
      x.className = 'chip dismiss'
      x.textContent = '✕'
      x.title = 'stop waiting for the wall'
      x.addEventListener('click', () => dispatch({ type: 'dismiss' }))
      host.append(x)
    }
  }

  // Last: it reports the screen it finds at once, which paints.
  const projector = createProjector({
    wallUrl,
    win,
    onScreen: (present) => dispatch({ type: 'screen', present }),
    onConnection: (conn) => client.link.attach(conn),
  })
  paint()
  return {
    project,
    get state() { return s },
    get wallUrl() { return wallUrl() },
    projector,
  }
}
