// Which socket a page opens, and whether it may answer the VJ MCP's inspect (docs/vj-mcp.md).
// A crafted link (?remote=display&room=x&relay=evil.example) must not let a stranger's relay
// welcome the display and read its canvas, features, knobs and logs.
import { describe, it, expect } from 'vitest'
import { wsUrlFor, inspectorAllowed, DEFAULT_RELAY_HOST } from './relay.js'

const at = (search, { protocol = 'https:', host = 'visuals.beadfamous.com' } = {}) => ({ search, protocol, host })

describe('wsUrlFor', () => {
  it('uses the default relay for a room, the dev server without one', () => {
    expect(wsUrlFor(at('?room=abc'))).toBe(`wss://${DEFAULT_RELAY_HOST}/ws/abc`)
    expect(wsUrlFor(at('', { protocol: 'http:', host: 'localhost:6969' }))).toBe('ws://localhost:6969/ws')
  })
  it('still relays through any ?relay= host, plain ws only for loopback', () => {
    expect(wsUrlFor(at('?room=abc&relay=other.example'))).toBe('wss://other.example/ws/abc')
    expect(wsUrlFor(at('?room=abc&relay=127.0.0.1:8787'))).toBe('ws://127.0.0.1:8787/ws/abc')
  })
})

describe('inspectorAllowed', () => {
  it('answers inspect on the real relay and on a loopback relay', () => {
    expect(inspectorAllowed(at('?room=abc'), { dev: false })).toBe(true)
    expect(inspectorAllowed(at('?room=abc&relay=relay.beadfamous.com'), { dev: false })).toBe(true)
    expect(inspectorAllowed(at('?room=abc&relay=127.0.0.1:8787'), { dev: false })).toBe(true)
    expect(inspectorAllowed(at('?room=abc&relay=localhost:8787'), { dev: true })).toBe(true)
  })
  it('never answers inspect through any other relay, in production or dev', () => {
    for (const relay of ['evil.example', 'relay.beadfamous.com.evil.example', 'relay.beadfamous.com@evil.example', '127.0.0.1:8787@evil.example', 'paper-cranes-remote.loqwai.workers.dev']) {
      expect(inspectorAllowed(at(`?room=abc&relay=${encodeURIComponent(relay)}`), { dev: false }), relay).toBe(false)
      expect(inspectorAllowed(at(`?room=abc&relay=${encodeURIComponent(relay)}`), { dev: true }), relay).toBe(false)
    }
  })
  it('without a room: only the dev server is a broker', () => {
    expect(inspectorAllowed(at('', { protocol: 'http:', host: 'localhost:6969' }), { dev: true })).toBe(true)
    expect(inspectorAllowed(at(''), { dev: false })).toBe(false)
  })
})
