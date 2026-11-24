// Where a board mirror's socket goes, and the link that opens one (docs/board-mirror.md).
import { DEFAULT_RELAY_HOST } from '../remote/relay.js'

// The room's Durable Object id, as the relay's /view-key/<room> gives it.
export const VIEW_ID = /^[0-9a-f]{64}$/
const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1)(:\d+)?$/
// The defaults keep a phone cool: half the iframe's CSS size, 30 frames a second.
export const DEFAULT_SCALE = 0.5
export const DEFAULT_FPS = 30

const within = (value, lo, hi, fallback) => {
  if (value === null || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) && n >= lo && n <= hi ? n : fallback
}

/** The mirror's settings from its page's query, or null when it names no valid view. */
export const mirrorSettings = (search) => {
  const params = new URLSearchParams(search)
  const view = params.get('view')
  if (!VIEW_ID.test(view ?? '')) return null
  const relayHost = params.get('relay') || DEFAULT_RELAY_HOST
  const scheme = LOOPBACK_HOST.test(relayHost) ? 'ws' : 'wss'
  return {
    socketUrl: `${scheme}://${relayHost}/view/${view}`,
    scale: within(params.get('scale'), 0.1, 1, DEFAULT_SCALE),
    fps: within(params.get('fps'), 1, 60, DEFAULT_FPS),
  }
}

/** The link that opens a mirror of the room whose view id is `view`. It carries no room name. */
export const mirrorLink = ({ site = 'https://visuals.beadfamous.com', view, relayHost, scale, fps }) => {
  const url = new URL('/mirror.html', site)
  url.searchParams.set('view', view)
  if (relayHost && relayHost !== DEFAULT_RELAY_HOST) url.searchParams.set('relay', relayHost)
  if (scale !== undefined) url.searchParams.set('scale', String(scale))
  if (fps !== undefined) url.searchParams.set('fps', String(fps))
  return url.toString()
}
