import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A WebSocket that opens and closes only when the test says so.
class FakeSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static all = []
  readyState = FakeSocket.CONNECTING
  constructor(url) {
    this.url = url
    FakeSocket.all.push(this)
  }
  open() {
    this.readyState = FakeSocket.OPEN
    this.onopen?.()
  }
  close() {
    if (this.readyState === FakeSocket.CLOSED) return
    this.readyState = FakeSocket.CLOSING
  }
  // The browser fires close later, after close() returns.
  finishClose() {
    this.readyState = FakeSocket.CLOSED
    this.onclose?.({ code: 1000, reason: '' })
  }
  deliver(msg) {
    this.onmessage?.({ data: JSON.stringify(msg) })
  }
}

const live = () => FakeSocket.all.filter((s) => s.readyState !== FakeSocket.CLOSED && s.readyState !== FakeSocket.CLOSING)

let WebSocketClient
beforeEach(async () => {
  vi.useFakeTimers()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  FakeSocket.all = []
  globalThis.WebSocket = FakeSocket
  globalThis.window = { location: new URL('http://localhost:6969/?remote=display') }
  ;({ WebSocketClient } = await import('./WebSocketClient.js'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  delete globalThis.WebSocket
  delete globalThis.window
})

describe('WebSocketClient', () => {
  it('does not open a second socket when connect() runs while one is still connecting', () => {
    const client = new WebSocketClient(() => {})
    client.connect()
    client.connect() // list.js "retry" while the relay is slow to answer
    expect(live()).toHaveLength(1)
  })

  it('opens one socket after disconnect() then connect(), even when the old close event lands late', () => {
    const messages = []
    const client = new WebSocketClient((m) => messages.push(m))
    client.connect()
    const first = FakeSocket.all[0]
    first.open()
    client.disconnect()
    client.connect()
    first.finishClose() // the old socket's close arrives after the new connect
    vi.advanceTimersByTime(60_000)
    expect(live()).toHaveLength(1)
  })

  it('does not stack a backoff reconnect on top of a manual reconnect', () => {
    const client = new WebSocketClient(() => {})
    client.connect()
    FakeSocket.all[0].finishClose() // network drop: a reconnect is scheduled in 1 s
    client.connect() // the user taps retry first
    vi.advanceTimersByTime(1000) // the scheduled reconnect fires while the retry is still connecting
    expect(live()).toHaveLength(1)
  })

  it('delivers each message once after a drop and reconnect', () => {
    const messages = []
    const client = new WebSocketClient((m) => messages.push(m))
    client.connect()
    FakeSocket.all[0].open()
    FakeSocket.all[0].finishClose()
    client.connect()
    vi.advanceTimersByTime(1000)
    for (const s of live()) s.open()
    for (const s of live()) s.deliver({ type: 'update-params', data: { knob_1: 1 } })
    expect(messages).toHaveLength(1)
  })
})
