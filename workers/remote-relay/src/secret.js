// A room's display secret (docs/vj-mcp.md, "Display secret"). Without one, the room name is the
// only lock: anyone holding it can run a script that forges Origin, registers a fake display and
// feeds the agent made-up state, screenshots and events. With one, the room registers a display
// only when its display-hello carries the secret, which the display link holds in its URL hash.
//
// Kept in the room Durable Object's storage as a SHA-256 hash, never as the secret: the secret is
// shown once, in the link the MCP tool returns, and a lost link is replaced by rotating. Rooms
// with no secret behave exactly as before.
const STORE_KEY = 'displaySecret'
// A prefix a parser can never read as a number: index.js turns numeric URL params into uniforms,
// and parseFloat('7f3…') would put the secret's first digits on the page as `display_secret`.
const PREFIX = 'ds_'
// Longer than any secret we mint; a longer one is wrong anyway, and is never hashed whole.
const MAX_SECRET = 256

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const toHex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (hex) => Uint8Array.from(String(hex).match(/../g) ?? [], (h) => parseInt(h, 16))
const sha256 = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))

/** 256 random bits, as `ds_` + base64url. */
export const mintSecret = () => PREFIX + b64url(crypto.getRandomValues(new Uint8Array(32)))

/**
 * Equal byte arrays, in time that depends on the length only. The relay compares SHA-256
 * digests, always 32 bytes, so nothing about the stored hash leaks through timing. Uses the
 * Workers runtime's crypto.subtle.timingSafeEqual where it exists.
 */
export const sameBytes = (a, b) => {
  if (a.length !== b.length) return false
  if (typeof crypto.subtle.timingSafeEqual === 'function') return crypto.subtle.timingSafeEqual(a, b)
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export const REFUSED = {
  missing: 'this room needs a display secret: open the display link from the VJ MCP display_secret tool',
  wrong: 'wrong display secret for this room (it may have been rotated): open the newest display link',
  rotated: 'the display secret for this room was rotated: open the newest display link',
}

/**
 * storage  the room's ctx.storage (get, put, delete). Read once, then cached: the room is one
 *          object, so nothing else changes it behind this cache.
 * Returns { current(), check(secret), rotate(), clear() }:
 *   current()      null when the room is open, else { gen, setAt } (never the hash)
 *   check(secret)  { ok: true, gen } (gen null in an open room) or { ok: false, reason }
 *   rotate()       mints and stores a new secret: { secret, gen, setAt }. The only time the secret
 *                  exists outside the page that holds the link.
 *   clear()        opens the room again
 */
export const createDisplayLock = (storage) => {
  let cached // undefined: not read yet; null: open room; { hash: Uint8Array, gen, setAt }
  const load = async () => {
    if (cached !== undefined) return cached
    const rec = await storage.get(STORE_KEY)
    cached = rec?.hash ? { hash: fromHex(rec.hash), gen: rec.gen, setAt: rec.setAt } : null
    return cached
  }
  return {
    current: async () => {
      const rec = await load()
      return rec && { gen: rec.gen, setAt: rec.setAt }
    },
    check: async (secret) => {
      const rec = await load()
      if (!rec) return { ok: true, gen: null }
      if (typeof secret !== 'string' || !secret) return { ok: false, reason: REFUSED.missing }
      const ok = sameBytes(await sha256(secret.slice(0, MAX_SECRET)), rec.hash)
      return ok ? { ok: true, gen: rec.gen } : { ok: false, reason: REFUSED.wrong }
    },
    rotate: async () => {
      const secret = mintSecret()
      const hash = await sha256(secret)
      const rec = { hash: toHex(hash), gen: crypto.randomUUID().slice(0, 8), setAt: new Date().toISOString() }
      await storage.put(STORE_KEY, rec)
      cached = { hash, gen: rec.gen, setAt: rec.setAt }
      return { secret, gen: rec.gen, setAt: rec.setAt }
    },
    clear: async () => {
      await storage.delete(STORE_KEY)
      cached = null
    },
  }
}

// What a display reports about itself goes to the agent and into events. A page that predates
// this change, or one with the secret in its query, would report it in its href: cut it out.
const SECRET_PARAM = /display_secret=[^&#\s"'\\]*/gi
const SECRET_TOKEN = /ds_[A-Za-z0-9_-]{20,}/g
export const redactSecret = (s) =>
  typeof s === 'string' ? s.replace(SECRET_PARAM, 'display_secret=REDACTED').replace(SECRET_TOKEN, 'REDACTED') : s
