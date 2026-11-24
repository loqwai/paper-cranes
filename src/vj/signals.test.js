// Where a ?vj=1 page's signals go: the dev server's /__vj-signal, and/or the display's room socket.
import { describe, it, expect } from 'vitest'
import { createSignalPoster } from './signals.js'

const fakeClient = (url, { connected = true } = {}) => ({
  url,
  isConnected: connected,
  sent: [],
  send(type, data) { if (!this.isConnected) return false; this.sent.push({ type, data }); return true },
})
const harness = ({ client, dev = false, search = '' }) => {
  const posts = []
  const timers = []
  const box = { client }
  const post = createSignalPoster({
    getClient: () => box.client,
    dev,
    search,
    fetchImpl: async (url, init) => { posts.push([url, JSON.parse(init.body)]); return new Response(null, { status: 204 }) },
    setTimer: (fn) => { timers.push(fn); return timers.length },
  })
  const tick = () => { const fns = timers.splice(0); for (const fn of fns) fn() }
  return { post, posts, box, tick }
}
const ROOM = 'wss://relay.beadfamous.com/ws/show-7f3a'

describe('?vj=1 signals', () => {
  it('a production display on a relay room sends them down its socket, and never POSTs', () => {
    const client = fakeClient(ROOM)
    const { post, posts } = harness({ client })
    post({ type: 'boot', url: 'https://visuals.beadfamous.com/?vj=1&room=show-7f3a' })
    expect(client.sent).toEqual([{ type: 'vj-signal', data: { type: 'boot', url: 'https://visuals.beadfamous.com/?vj=1&room=show-7f3a' } }])
    expect(posts).toEqual([])
  })

  it('the dev server without a room keeps POSTing to /__vj-signal', () => {
    const client = fakeClient('ws://localhost:6969/ws')
    const { post, posts } = harness({ client, dev: true })
    post({ type: 'flicker' })
    expect(posts).toEqual([['/__vj-signal', { type: 'flicker' }]])
    expect(client.sent).toEqual([])
  })

  it('holds the boot beacon until the room socket exists and opens', () => {
    const { post, box, tick } = harness({ client: undefined, search: '?shader=x&remote=display&room=show-7f3a&vj=1' })
    post({ type: 'boot' })
    tick()
    const client = fakeClient(ROOM, { connected: false })
    box.client = client
    tick()
    expect(client.sent).toEqual([])
    client.isConnected = true
    tick()
    expect(client.sent).toEqual([{ type: 'vj-signal', data: { type: 'boot' } }])
  })

  it('never sends to a relay host we do not run, and keeps nothing for a page with no room', () => {
    const foreign = fakeClient('wss://relay.example.com/ws/show')
    const a = harness({ client: foreign })
    a.post({ type: 'pulse' })
    expect(foreign.sent).toEqual([])
    const b = harness({ client: undefined, search: '?shader=x&vj=1' })
    b.post({ type: 'pulse' })
    expect(b.posts).toEqual([])
  })
})
