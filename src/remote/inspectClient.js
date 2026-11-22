// Remote-inspect client: lets an agent on the dev machine inspect and change this page while it
// runs on another device (Aaron's phone). See docs/remote-inspect.md.
//
// Self-enables in a DEV build when the page is on a cranes-local.* host (the Cloudflare
// Access-protected tunnel) or carries ?inspect=1. ?inspect=0 or a `room` param (which would
// route /ws to the public relay) turns it off. The token comes from the dev server's
// loopback-only endpoint, never the URL.
//
// This module SELF-ACCEPTS HMR: editing it, inspect.js or inspectAuth.js hot-swaps into the
// running page without a reload, so a live show never blinks for a tooling change.

import { WebSocketClient } from './WebSocketClient.js'
import { createInspector } from './inspect.js'

const params = new URLSearchParams(window.location.search)
const wanted = params.get('inspect') === '1' || /^cranes-local\./.test(window.location.hostname)
const enabled = import.meta.env.DEV && wanted && params.get('inspect') !== '0' && !params.get('room')

let client = null
let inspector = null
let audioTimer = null
let tokenTimer = null
let disposed = false

const fetchToken = async () => {
  const res = await fetch('/__remote-inspect/token', { cache: 'no-store', credentials: 'same-origin' })
  if (!res.ok) throw new Error(`token endpoint ${res.status}`)
  return (await res.text()).trim()
}

// After a reload there is no user gesture, so the AudioContext may start suspended. Keep asking;
// Chrome allows it when the tab had a gesture before a same-origin navigation. `status` reports it.
const keepAudioAlive = () => {
  const ctx = window.cranes?.audioContext
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {})
}

const start = async () => {
  let token
  try {
    token = await fetchToken()
  } catch (e) {
    console.warn('[Remote Inspect] no token yet, retrying in 10 s:', e.message)
    if (!disposed) tokenTimer = setTimeout(start, 10_000)
    return
  }
  if (disposed) return
  // The WebSocketClient is created before the inspector so the inspector can reply through it.
  client = new WebSocketClient(
    (message) => {
      if (message.type === 'inspect') inspector?.handle(message.data)
    },
    (status) => {
      if (status === 'connected') inspector?.hello()
    },
  )
  inspector = createInspector(client, token)
  client.connect()
  audioTimer = setInterval(keepAudioAlive, 2000)
  console.log(`[Remote Inspect] enabled, display ${inspector.displayId}`)
}

if (enabled) start()

if (import.meta.hot) {
  import.meta.hot.accept()
  import.meta.hot.dispose(() => {
    disposed = true
    clearTimeout(tokenTimer)
    clearInterval(audioTimer)
    inspector?.dispose()
    client?.disconnect()
  })
}
