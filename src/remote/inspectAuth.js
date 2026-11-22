// Request signing for the remote-inspect channel (see docs/remote-inspect.md).
//
// The display page carries `remote_token=<secret>` in its URL. A command is
// `{ payload, sig }` where payload is a JSON string `{id, ts, cmd, args}` and
// sig = hex(HMAC-SHA256(token, payload)). The token itself never crosses the
// socket, so a client that can only listen on /ws learns nothing it can replay
// (ids are single-use and ts must be recent).
//
// Shared by the browser (src/remote/inspect.js) and the CLI
// (scripts/remote/cranes-remote.js): both have WebCrypto on globalThis.crypto.

const enc = new TextEncoder()

const keyFor = (token) =>
  crypto.subtle.importKey('raw', enc.encode(token), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export const signPayload = async (token, payload) =>
  toHex(await crypto.subtle.sign('HMAC', await keyFor(token), enc.encode(payload)))

// Constant-time compare of two hex strings.
const sameHex = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export const MAX_SKEW_MS = 120_000

// → { ok: true, request } or { ok: false, error, skewMs? }
export const verifyRequest = async (token, { payload, sig } = {}, seenIds, now = Date.now()) => {
  if (!token) return { ok: false, error: 'display has no remote_token' }
  if (typeof payload !== 'string') return { ok: false, error: 'bad request' }
  if (!sameHex(await signPayload(token, payload), sig)) return { ok: false, error: 'bad signature' }
  const request = JSON.parse(payload)
  const skewMs = now - request.ts
  if (!Number.isFinite(skewMs) || Math.abs(skewMs) > MAX_SKEW_MS) return { ok: false, error: 'stale', skewMs }
  if (seenIds.has(request.id)) return { ok: false, error: 'replayed id' }
  seenIds.add(request.id)
  if (seenIds.size > 1000) seenIds.delete(seenIds.values().next().value)
  return { ok: true, request }
}
